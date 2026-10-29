import { supabase } from '../lib/supabase';
import type { PhysicianAgreement, PhysicianAgreementDocumentType } from '../types/database';
import type { PhysicianMarkedRole } from '../content/legal/physicianAgreements';

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesión no válida. Inicia sesión de nuevo.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function listPhysicianAgreements(userId: string): Promise<PhysicianAgreement[]> {
  const { data, error } = await supabase
    .from('physician_agreements')
    .select('*')
    .eq('user_id', userId)
    .order('signed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PhysicianAgreement[];
}

export async function submitPhysicianAgreement(input: {
  documentType: PhysicianAgreementDocumentType;
  fullNameTyped: string;
  professionalLicense?: string | null;
  signatureBase64: string;
  rfc?: string | null;
  clabe?: string | null;
  bank?: string | null;
  markedRole?: PhysicianMarkedRole | null;
}): Promise<{ success: boolean; folio?: string; hasCompletedAll?: boolean; error?: string }> {
  const response = await fetch('/api/sign-physician-agreement', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({
      action: 'sign',
      documentType: input.documentType,
      fullNameTyped: input.fullNameTyped,
      professionalLicense: input.professionalLicense ?? null,
      signatureBase64: input.signatureBase64,
      rfc: input.rfc ?? null,
      clabe: input.clabe ?? null,
      bank: input.bank ?? null,
      markedRole: input.markedRole ?? null,
    }),
  });
  return (await response.json()) as {
    success: boolean;
    folio?: string;
    hasCompletedAll?: boolean;
    error?: string;
  };
}

export async function downloadSignedPhysicianAgreement(input: {
  documentType: PhysicianAgreementDocumentType;
  physicianId?: string;
}): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string }> {
  const response = await fetch('/api/sign-physician-agreement', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({
      action: 'download',
      documentType: input.documentType,
      physicianId: input.physicianId,
    }),
  });
  return (await response.json()) as {
    success: boolean;
    downloadUrl?: string;
    fileName?: string;
    error?: string;
  };
}

export async function verifyPhysicianAgreementFolio(folio: string): Promise<{
  valid: boolean;
  folio?: string;
  document_type?: PhysicianAgreementDocumentType;
  document_version?: string;
  full_name?: string;
  signed_at?: string;
}> {
  const { data, error } = await supabase.rpc('verify_physician_agreement', { p_folio: folio });
  if (error) throw error;
  return (data ?? { valid: false }) as { valid: boolean };
}
