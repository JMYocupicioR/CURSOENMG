import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Download, ShieldCheck } from 'lucide-react';
import {
  STUDENT_AGREEMENT_META,
  STUDENT_AGREEMENT_TYPES,
  type StudentAgreementType,
} from '../../content/legal/agreements';
import {
  downloadSignedAgreement,
  listStudentAgreements,
  startBrowserDownload,
} from '../../services/studentAgreementService';
import type { StudentAgreement } from '../../types/database';

export function StudentAgreementsCard({ userId }: { userId: string }) {
  const [agreements, setAgreements] = useState<StudentAgreement[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStudentAgreements(userId)
      .then((rows) => {
        if (!cancelled) setAgreements(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleDownload = async (type: StudentAgreementType) => {
    setDownloading(type);
    try {
      const res = await downloadSignedAgreement({ documentType: type });
      if (res.success && res.downloadUrl) {
        startBrowserDownload(res.downloadUrl, res.fileName || 'acuerdo_firmado.pdf');
      }
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-indigo-500" />
        <h2 className="font-semibold text-slate-900 dark:text-white">Acuerdos firmados</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STUDENT_AGREEMENT_TYPES.map((type) => {
          const row = agreements.find((item) => item.document_type === type);
          return (
            <div key={type} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {STUDENT_AGREEMENT_META[type].stepLabel}
              </p>
              {row ? (
                <>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Firmado
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{row.verification_folio}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(row.signed_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(type)}
                    disabled={downloading === type}
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold dark:border-slate-600"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloading === type ? 'Descargando…' : 'Descargar PDF'}
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <Clock className="h-3.5 w-3.5" /> Pendiente
                  </p>
                  <Link
                    to="/acuerdos"
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-2 py-2 text-xs font-semibold text-white"
                  >
                    Firmar ahora
                  </Link>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
