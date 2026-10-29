import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  PHYSICIAN_AGREEMENT_META,
  type PhysicianAgreementType,
} from '../../content/legal/physicianAgreements';
import { verifyPhysicianAgreementFolio } from '../../services/physicianAgreementService';

export default function PhysicianAgreementVerifyPage() {
  const [params] = useSearchParams();
  const folio = params.get('folio')?.trim() || '';
  const [result, setResult] = useState<{
    valid: boolean;
    folio?: string;
    document_type?: PhysicianAgreementType;
    document_version?: string;
    full_name?: string;
    signed_at?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!folio) {
      setResult({ valid: false });
      return;
    }
    verifyPhysicianAgreementFolio(folio)
      .then(setResult)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo verificar'));
  }, [folio]);

  const title =
    result?.document_type && result.document_type in PHYSICIAN_AGREEMENT_META
      ? PHYSICIAN_AGREEMENT_META[result.document_type].title
      : null;

  return (
    <main id="contenido-principal" className="mx-auto max-w-lg px-4 pb-16 pt-28 text-center">
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">Verificación de acuerdo médico</h1>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!error && !result && <p className="text-sm text-slate-500">Consultando folio…</p>}
      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          {result.valid ? (
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          ) : (
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          )}
          <p className="font-bold">{result.valid ? 'Acuerdo vigente' : 'Folio no encontrado'}</p>
          {result.full_name && <p className="mt-2 text-sm">{result.full_name}</p>}
          {title && <p className="mt-1 text-sm font-medium">{title}</p>}
          {result.document_version && (
            <p className="mt-1 text-xs text-slate-500">Versión {result.document_version}</p>
          )}
          {result.signed_at && (
            <p className="mt-1 text-xs text-slate-500">
              {new Date(result.signed_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
            </p>
          )}
          <p className="mt-4 text-xs text-slate-400">Folio: {folio || '—'}</p>
        </div>
      )}
    </main>
  );
}
