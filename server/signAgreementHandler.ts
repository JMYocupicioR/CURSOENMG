import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  documentsFromEdition,
  folioPrefix,
  hasUnresolvedPartyPlaceholders,
  STUDENT_AGREEMENT_TYPES,
  validateEditionForPublish,
  type StudentAgreementType,
} from '../src/content/legal/agreements';
import { partyFromRecord } from '../src/content/legal/party';
import { stampStudentAgreement } from './stampStudentAgreement';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const JSON_HEADERS = {
  ...CORS,
  'Content-Type': 'application/json; charset=utf-8',
};

const MIN_SIGNATURE_BYTES = 100;
const DOWNLOAD_TTL_SECONDS = 60 * 30;

type Action = 'sign' | 'download';

interface SignBody {
  action?: Action;
  documentType?: string;
  fullNameTyped?: string;
  professionalLicense?: string | null;
  signatureBase64?: string;
  studentId?: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isAgreementType(value: string | undefined): value is StudentAgreementType {
  return STUDENT_AGREEMENT_TYPES.includes(value as StudentAgreementType);
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwarded ||
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

function appBaseUrl(req: Request): string {
  const configured = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:5173';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function userFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Sesión no válida. Inicia sesión de nuevo.' as const };
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: 'Sesión no válida o expirada.' as const };
  return { supabase, user: data.user };
}

async function loadRoles(supabase: ReturnType<typeof adminClient>, userId: string) {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  const roles = (data ?? []).map((row) => row.role as string);
  return {
    roles,
    isStaff: roles.includes('admin') || roles.includes('editor'),
  };
}

function decodePng(signatureBase64: string): Buffer | null {
  if (!signatureBase64.includes('data:image/')) return null;
  const raw = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length < MIN_SIGNATURE_BYTES) return null;
  return buffer;
}

async function loadPublishedEdition(supabase: ReturnType<typeof adminClient>) {
  const { data, error } = await supabase
    .from('student_agreement_editions')
    .select('*')
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  return {
    bundleVersion: data.bundle_version as string,
    party: partyFromRecord(data.party),
    contrato: data.contrato_markdown as string,
    reglamento: data.reglamento_markdown as string,
    normas: data.normas_markdown as string,
    aviso: data.aviso_markdown as string,
  };
}

async function handleSign(req: Request, body: SignBody): Promise<Response> {
  const auth = await userFromRequest(req);
  if ('error' in auth) return json(401, { success: false, error: auth.error });
  const { supabase, user } = auth;
  const { isStaff } = await loadRoles(supabase, user.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('enrollment_status')
    .eq('id', user.id)
    .maybeSingle();
  if (!isStaff && profile?.enrollment_status !== 'approved') {
    return json(403, { success: false, error: 'Solo un alumno admitido puede firmar estos instrumentos.' });
  }

  if (!isAgreementType(body.documentType)) {
    return json(400, { success: false, error: 'Tipo de documento no válido.' });
  }
  const name = body.fullNameTyped?.trim() ?? '';
  if (name.length < 3) {
    return json(400, { success: false, error: 'Escribe tu nombre legal completo.' });
  }
  const signature = body.signatureBase64 ? decodePng(body.signatureBase64) : null;
  if (!signature) {
    return json(400, { success: false, error: 'La firma manuscrita es obligatoria.' });
  }

  const edition = await loadPublishedEdition(supabase);
  if (!edition || validateEditionForPublish(edition)) {
    return json(503, { success: false, error: 'El contrato institucional aún no está publicado.' });
  }
  const agreement = documentsFromEdition(edition)[body.documentType];
  const filledCheck = agreement.sections.map((section) => section.content).join('\n');
  if (hasUnresolvedPartyPlaceholders(filledCheck) || hasUnresolvedPartyPlaceholders(agreement.title)) {
    return json(503, { success: false, error: 'El contrato institucional aún no está publicado.' });
  }

  const nowIso = new Date().toISOString();
  const folio = `AGR-${folioPrefix(body.documentType)}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const { pdf, sha256 } = await stampStudentAgreement({
    agreement,
    signaturePng: signature,
    signerName: name,
    professionalLicense: body.professionalLicense?.trim() || null,
    signedAtIso: nowIso,
    ipAddress: clientIp(req),
    userAgent: req.headers.get('user-agent') || 'Navegador',
    verificationFolio: folio,
    appBaseUrl: appBaseUrl(req),
  });

  const signaturePath = `${user.id}/signatures/${body.documentType}_${Date.now()}.png`;
  const pdfPath = `${user.id}/agreements/${body.documentType}_v${edition.bundleVersion}.pdf`;

  const { error: pdfErr } = await supabase.storage.from('student-dossiers').upload(pdfPath, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (pdfErr) {
    return json(500, { success: false, error: 'No se pudo archivar el PDF firmado.' });
  }

  await supabase.storage.from('student-dossiers').upload(signaturePath, signature, {
    contentType: 'image/png',
    upsert: true,
  });

  const { error: dbError } = await supabase.from('student_agreements').upsert(
    {
      user_id: user.id,
      document_type: body.documentType,
      document_version: edition.bundleVersion,
      document_sha256: sha256,
      full_name_typed: name,
      professional_license: body.professionalLicense?.trim() || null,
      signature_image_path: signaturePath,
      pdf_signed_path: pdfPath,
      verification_folio: folio,
      ip_address: clientIp(req),
      user_agent: req.headers.get('user-agent') || 'Navegador',
      signed_at: nowIso,
    },
    { onConflict: 'user_id,document_type,document_version' }
  );
  if (dbError) {
    return json(500, { success: false, error: dbError.message });
  }

  const { data: allRows } = await supabase
    .from('student_agreements')
    .select('document_type')
    .eq('user_id', user.id)
    .eq('document_version', edition.bundleVersion);

  const signedTypes = (allRows ?? []).map((row) => row.document_type as string);
  const hasCompletedAll = STUDENT_AGREEMENT_TYPES.every((type) => signedTypes.includes(type));
  if (hasCompletedAll) {
    await supabase
      .from('profiles')
      .update({
        agreements_signed: true,
        agreement_bundle_version: edition.bundleVersion,
      })
      .eq('id', user.id);
  }

  return json(200, {
    success: true,
    folio,
    hasCompletedAll,
    sha256,
  });
}

async function handleDownload(req: Request, body: SignBody): Promise<Response> {
  const auth = await userFromRequest(req);
  if ('error' in auth) return json(401, { success: false, error: auth.error });
  const { supabase, user } = auth;
  const { isStaff } = await loadRoles(supabase, user.id);

  if (!isAgreementType(body.documentType)) {
    return json(400, { success: false, error: 'Tipo de documento no válido.' });
  }

  const targetId = body.studentId && body.studentId !== user.id ? body.studentId : user.id;
  if (targetId !== user.id && !isStaff) {
    return json(403, { success: false, error: 'No autorizado para este expediente.' });
  }

  const { data: agreement } = await supabase
    .from('student_agreements')
    .select('pdf_signed_path, full_name_typed')
    .eq('user_id', targetId)
    .eq('document_type', body.documentType)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!agreement?.pdf_signed_path) {
    return json(404, { success: false, error: 'El documento firmado aún no está disponible.' });
  }

  const safeName = agreement.full_name_typed.replace(/\s+/g, '_');
  const fileName = `${body.documentType}_firmado_${safeName}.pdf`;
  const { data, error } = await supabase.storage
    .from('student-dossiers')
    .createSignedUrl(agreement.pdf_signed_path, DOWNLOAD_TTL_SECONDS, { download: fileName });
  if (error || !data?.signedUrl) {
    return json(500, { success: false, error: 'No se pudo generar el enlace de descarga.' });
  }

  return json(200, { success: true, downloadUrl: data.signedUrl, fileName });
}

export async function handleSignAgreementRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Método no permitido.' });
  }

  let body: SignBody = {};
  try {
    body = (await req.json()) as SignBody;
  } catch {
    return json(400, { success: false, error: 'Cuerpo JSON no válido.' });
  }

  try {
    if (body.action === 'download') return await handleDownload(req, body);
    return await handleSign(req, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar el acuerdo.';
    return json(500, { success: false, error: message });
  }
}
