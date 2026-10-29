import { useState } from 'react';
import { CheckCircle2, Clock, Download } from 'lucide-react';
import {
  STUDENT_AGREEMENT_META,
  STUDENT_AGREEMENT_TYPES,
  type StudentAgreementType,
} from '../../content/legal/agreements';
import { downloadSignedAgreement, startBrowserDownload } from '../../services/studentAgreementService';
import type { StudentAgreement } from '../../types/database';

export function AdminStudentAgreementsPanel({
  studentId,
  agreements,
}: {
  studentId: string;
  agreements: StudentAgreement[];
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const signedCount = STUDENT_AGREEMENT_TYPES.filter((type) =>
    agreements.some((row) => row.document_type === type)
  ).length;

  const handleDownload = async (type: StudentAgreementType) => {
    setDownloading(type);
    try {
      const res = await downloadSignedAgreement({ documentType: type, studentId });
      if (res.success && res.downloadUrl) {
        startBrowserDownload(res.downloadUrl, res.fileName || 'acuerdo_firmado.pdf');
      }
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Acuerdos legales</h3>
          <p className="text-xs text-slate-500">Folio, IP y hash del PDF sellado</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {signedCount}/3
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STUDENT_AGREEMENT_TYPES.map((type) => {
          const row = agreements.find((item) => item.document_type === type);
          return (
            <div key={type} className="space-y-2 rounded-2xl border border-slate-200 p-4 text-xs dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {STUDENT_AGREEMENT_META[type].stepLabel}
                </p>
                {row ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Firmado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                    <Clock className="h-3.5 w-3.5" /> Pendiente
                  </span>
                )}
              </div>
              {row ? (
                <div className="space-y-1 text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Nombre:</span> {row.full_name_typed}
                  </p>
                  {row.professional_license && (
                    <p>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Cédula:</span>{' '}
                      {row.professional_license}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Folio:</span>{' '}
                    <span className="font-mono">{row.verification_folio}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Fecha:</span>{' '}
                    {new Date(row.signed_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">IP:</span> {row.ip_address}
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">SHA-256:</span>{' '}
                    <span className="font-mono text-[10px]">{row.document_sha256}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(type)}
                    disabled={downloading === type}
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloading === type ? 'Descargando…' : 'Descargar PDF'}
                  </button>
                </div>
              ) : (
                <p className="text-slate-500">El alumno aún no firma este instrumento.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
