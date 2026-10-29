import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Download } from 'lucide-react';
import { getAdminProfiles } from '../../services/editorialService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthProvider';
import { filterGradeableStudents } from '../../utils/adminUtils';
import {
  STUDENT_AGREEMENT_META,
  STUDENT_AGREEMENT_TYPES,
  type StudentAgreementType,
} from '../../content/legal/agreements';
import { downloadSignedAgreement, startBrowserDownload } from '../../services/studentAgreementService';
import type { AdminProfileRow } from '../../types/admin';
import type { StudentAgreement } from '../../types/database';

export function AgreementRoster() {
  const { user } = useAuth();
  const [students, setStudents] = useState<AdminProfileRow[]>([]);
  const [agreements, setAgreements] = useState<StudentAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminProfiles(false, 'all'),
      supabase.from('student_agreements').select('*').order('signed_at', { ascending: false }),
    ])
      .then(([profiles, agreementRes]) => {
        if (cancelled) return;
        if (agreementRes.error) throw agreementRes.error;
        setStudents(filterGradeableStudents(profiles, user?.id));
        setAgreements((agreementRes.data ?? []) as StudentAgreement[]);
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
  }, [user?.id]);

  const byStudent = useMemo(() => {
    const map = new Map<string, StudentAgreement[]>();
    for (const row of agreements) {
      const list = map.get(row.user_id) ?? [];
      if (!list.some((item) => item.document_type === row.document_type)) list.push(row);
      map.set(row.user_id, list);
    }
    return map;
  }, [agreements]);

  const signedCount = students.filter((student) => student.agreements_signed).length;

  const handleDownload = async (studentId: string, type: StudentAgreementType) => {
    const key = `${studentId}:${type}`;
    setDownloading(key);
    setError(null);
    try {
      const res = await downloadSignedAgreement({ documentType: type, studentId });
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
            {loading ? 'Cargando…' : `${signedCount} de ${students.length} con el paquete firmado`}
          </p>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {!loading && students.length === 0 && (
        <p className="text-sm text-slate-500">No hay alumnos en la lista.</p>
      )}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {students.map((student) => {
          const rows = byStudent.get(student.id) ?? [];
          const complete = Boolean(student.agreements_signed);
          return (
            <li key={student.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {student.display_name}
                  </p>
                  {complete ? (
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
                <p className="truncate text-xs text-slate-500">{student.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {STUDENT_AGREEMENT_TYPES.map((type) => {
                  const row = rows.find((item) => item.document_type === type);
                  if (!row) return null;
                  const key = `${student.id}:${type}`;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => void handleDownload(student.id, type)}
                      disabled={downloading === key}
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading === key ? '…' : STUDENT_AGREEMENT_META[type].stepLabel}
                    </button>
                  );
                })}
                <Link
                  to={`/admin/alumnos/${student.id}?tab=agreements`}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                >
                  Expediente
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
