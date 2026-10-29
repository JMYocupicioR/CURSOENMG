import { supabase } from '../lib/supabase';
import type { StudentAgreement, StudentAgreementDocumentType } from '../types/database';

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesión no válida. Inicia sesión de nuevo.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function listStudentAgreements(userId: string): Promise<StudentAgreement[]> {
  const { data, error } = await supabase
    .from('student_agreements')
    .select('*')
    .eq('user_id', userId)
    .order('signed_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StudentAgreement[];
}

export async function submitStudentAgreement(input: {
  documentType: StudentAgreementDocumentType;
  fullNameTyped: string;
  professionalLicense?: string | null;
  signatureBase64: string;
}): Promise<{ success: boolean; folio?: string; hasCompletedAll?: boolean; error?: string }> {
  const response = await fetch('/api/sign-agreement', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({
      action: 'sign',
      documentType: input.documentType,
      fullNameTyped: input.fullNameTyped,
      professionalLicense: input.professionalLicense ?? null,
      signatureBase64: input.signatureBase64,
    }),
  });
  return (await response.json()) as {
    success: boolean;
    folio?: string;
    hasCompletedAll?: boolean;
    error?: string;
  };
}

export async function downloadSignedAgreement(input: {
  documentType: StudentAgreementDocumentType;
  studentId?: string;
}): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string }> {
  const response = await fetch('/api/sign-agreement', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({
      action: 'download',
      documentType: input.documentType,
      studentId: input.studentId,
    }),
  });
  return (await response.json()) as {
    success: boolean;
    downloadUrl?: string;
    fileName?: string;
    error?: string;
  };
}

export async function verifyStudentAgreementFolio(folio: string): Promise<{
  valid: boolean;
  folio?: string;
  document_type?: StudentAgreementDocumentType;
  document_version?: string;
  full_name?: string;
  signed_at?: string;
}> {
  const { data, error } = await supabase.rpc('verify_student_agreement', { p_folio: folio });
  if (error) throw error;
  return (data ?? { valid: false }) as { valid: boolean };
}

export function startBrowserDownload(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
