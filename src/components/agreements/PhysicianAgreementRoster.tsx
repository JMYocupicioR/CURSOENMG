import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Download } from 'lucide-react';
import { getAdminProfiles } from '../../services/editorialService';
import { supabase } from '../../lib/supabase';
import { isCeoEmail } from '../../content/legal/ceo';
import {
  PHYSICIAN_AGREEMENT_META,
  PHYSICIAN_AGREEMENT_TYPES,
  type PhysicianAgreementType,
} from '../../content/legal/physicianAgreements';
import { downloadSignedPhysicianAgreement } from '../../services/physicianAgreementService';
import { startBrowserDownload } from '../../services/studentAgreementService';
import type { AdminProfileRow } from '../../types/admin';
import type { PhysicianAgreement } from '../../types/database';

function isCollaboratorRow(row: AdminProfileRow): boolean {
  return row.roles.some((role) => role === 'admin' || role === 'editor' || role === 'contributor');
}

export function PhysicianAgreementRoster() {
  const [physicians, setPhysicians] = useState<AdminProfileRow[]>([]);
  const [agreements, setAgreements] = useState<PhysicianAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminProfiles(false, 'contributors'),
      supabase.from('physician_agreements').select('*').order('signed_at', { ascending: false }),
    ])
      .then(([profiles, agreementRes]) => {
        if (cancelled) return;
        if (agreementRes.error) throw agreementRes.error;
        setPhysicians(profiles.filter(isCollaboratorRow));
        setAgreements((agreementRes.data ?? []) as PhysicianAgreement[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la lista.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byPhysician = useMemo(() => {
    const map = new Map<string, PhysicianAgreement[]>();
    for (const row of agreements) {
      const list = map.get(row.user_id) ?? [];
      if (!list.some((item) => item.document_type === row.document_type)) list.push(row);
      map.set(row.user_id, list);
    }
    return map;
  }, [agreements]);

  const signers = physicians.filter((row) => !isCeoEmail(row.email));
  const signedCount = signers.filter((row) => row.physician_agreements_signed).length;

  const handleDownload = async (physicianId: string, type: PhysicianAgreementType) => {
    const key = `${physicianId}:${type}`;
    setDownloading(key);
    setError(null);
    try {
      const res = await downloadSignedPhysicianAgreement({ documentType: type, physicianId });
      if (!res.success || !res.downloadUrl) {
        setError(res.error || 'No se pudo descargar el PDF.');
        return;
      }
      startBrowserDownload(res.downloadUrl, res.fileName || 'acuerdo_firmado.pdf');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quién ya firmó</h2>
          <p className="text-xs text-slate-500">
            {loading ? 'Cargando…' : `${signedCount} de ${signers.length} con el paquete firmado`}
          </p>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {!loading && physicians.length === 0 && (
        <p className="text-sm text-slate-500">No hay colaboradores, editores ni administradores en la lista.</p>
      )}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {physicians.map((physician) => {
          const rows = byPhysician.get(physician.id) ?? [];
          const ceo = isCeoEmail(physician.email);
          const complete = Boolean(physician.physician_agreements_signed);
          return (
            <li
              key={physician.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {physician.display_name}
                  </p>
                  {ceo ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Dirección
                    </span>
                  ) : complete ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Firmado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <Clock className="h-3 w-3" /> Sin firmar
                      {rows.length > 0 ? ` (${rows.length}/3)` : ''}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">{physician.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PHYSICIAN_AGREEMENT_TYPES.map((type) => {
                  const row = rows.find((item) => item.document_type === type);
                  if (!row) return null;
                  const key = `${physician.id}:${type}`;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => void handleDownload(physician.id, type)}
                      disabled={downloading === key}
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading === key ? '…' : PHYSICIAN_AGREEMENT_META[type].stepLabel}
                    </button>
                  );
                })}
                <Link
                  to={`/admin/usuarios/${physician.id}/perfil`}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                >
                  Perfil
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
