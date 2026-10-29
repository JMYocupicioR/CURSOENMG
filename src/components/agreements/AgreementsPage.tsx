import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import {
  documentsFromEdition,
  STUDENT_AGREEMENT_META,
  STUDENT_AGREEMENT_TYPES,
  type ParsedAgreement,
  type StudentAgreementType,
} from '../../content/legal/agreements';
import { fetchPublishedEdition } from '../../services/studentAgreementEditionService';
import type { AgreementEditionTexts } from '../../content/legal/agreements';
import {
  downloadSignedAgreement,
  listStudentAgreements,
  startBrowserDownload,
  submitStudentAgreement,
} from '../../services/studentAgreementService';
import { LoadingSpinner } from '../LoadingSpinner';
import { SignaturePad } from './SignaturePad';

export default function AgreementsPage() {
  const {
    user,
    profile,
    isLoading,
    isAdmin,
    isEditor,
    isPendingApproval,
    isRejected,
    hasSignedCurrentAgreements,
    refreshProfile,
  } = useAuth();
  const navigate = useNavigate();
  const [edition, setEdition] = useState<AgreementEditionTexts | null>(null);
  const [editionLoaded, setEditionLoaded] = useState(false);
  const partyComplete = editionLoaded && edition != null;

  const [signedTypes, setSignedTypes] = useState<StudentAgreementType[]>([]);
  const [step, setStep] = useState<StudentAgreementType>('contrato');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [fullName, setFullName] = useState(profile?.display_name || '');
  const [license, setLicense] = useState(profile?.cedula_profesional || '');
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const docs = useMemo(() => {
    if (!edition) return null;
    return documentsFromEdition(edition);
  }, [edition]);
  const active: ParsedAgreement | null = docs ? docs[step] : null;
  const allDone = STUDENT_AGREEMENT_TYPES.every((type) => signedTypes.includes(type));

  useEffect(() => {
    let cancelled = false;
    fetchPublishedEdition()
      .then((loaded) => {
        if (!cancelled) setEdition(loaded);
      })
      .catch(() => {
        if (!cancelled) setEdition(null);
      })
      .finally(() => {
        if (!cancelled) setEditionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editionLoaded) return;
    if (!user || !edition) {
      setLoadingStatus(false);
      return;
    }
    let cancelled = false;
    listStudentAgreements(user.id)
      .then((rows) => {
        if (cancelled) return;
        const types = rows
          .filter((row) => row.document_version === edition.bundleVersion)
          .map((row) => row.document_type);
        setSignedTypes(types);
        const next = STUDENT_AGREEMENT_TYPES.find((type) => !types.includes(type));
        if (next) setStep(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, edition, editionLoaded]);

  useEffect(() => {
    setHasScrolled(false);
    setAccepted(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setHasScrolled(true);
      },
      { root, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [step, loadingStatus, allDone]);

  if (isLoading || loadingStatus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAdmin || isEditor) return <Navigate to="/admin" replace />;
  if (isPendingApproval || isRejected) return <Navigate to="/portal" replace />;
  if (hasSignedCurrentAgreements && allDone) return <Navigate to="/portal" replace />;

  const handleDownload = async (type: StudentAgreementType) => {
    setDownloading(type);
    try {
      const res = await downloadSignedAgreement({ documentType: type });
      if (!res.success || !res.downloadUrl) {
        setError(res.error || 'No se pudo descargar el documento.');
        return;
      }
      startBrowserDownload(res.downloadUrl, res.fileName || 'acuerdo_firmado.pdf');
    } finally {
      setDownloading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasScrolled || !accepted || !signature || fullName.trim().length < 3) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitStudentAgreement({
        documentType: step,
        fullNameTyped: fullName.trim(),
        professionalLicense: license.trim() || null,
        signatureBase64: signature,
      });
      if (!res.success) {
        setError(res.error || 'No se pudo registrar la firma.');
        return;
      }
      const updated = Array.from(new Set([...signedTypes, step]));
      setSignedTypes(updated);
      const next = STUDENT_AGREEMENT_TYPES.find((type) => !updated.includes(type));
      if (next) {
        setStep(next);
      } else {
        await refreshProfile();
        navigate('/portal', { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="contenido-principal" className="mx-auto max-w-3xl px-4 pb-24 pt-24">
      <div className="mb-6 space-y-2 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Ingreso al diplomado
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Firma de acuerdos
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Hay que leer y firmar tres instrumentos antes de abrir clases, evaluaciones y talleres.
        </p>
      </div>

      {!partyComplete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          La Dirección Académica aún no publicó los acuerdos. El acceso al diplomado no se bloquea
          hasta que el texto esté publicado.
          <Link to="/portal" className="mt-3 inline-flex font-semibold text-indigo-700 hover:underline">
            Ir al portal
          </Link>
        </div>
      )}

      {partyComplete && active && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STUDENT_AGREEMENT_TYPES.map((type, index) => {
              const done = signedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (done || type === step) setStep(type);
                  }}
                  className={`rounded-2xl border p-3 text-left ${
                    step === type
                      ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 dark:bg-slate-900'
                      : done
                        ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Paso {index + 1} de 3
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {STUDENT_AGREEMENT_META[type].stepLabel}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {done ? 'Firmado' : 'Pendiente'}
                  </p>
                </button>
              );
            })}
          </div>

          {allDone ? (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-8 text-center dark:border-emerald-800 dark:bg-slate-900">
              <FileCheck className="mx-auto h-10 w-10 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Expediente completo</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Los tres instrumentos quedaron en tu expediente con folio, fecha y trazo de firma.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                {STUDENT_AGREEMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleDownload(type)}
                    disabled={downloading === type}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                  >
                    <Download className="h-4 w-4" />
                    {downloading === type ? 'Descargando…' : STUDENT_AGREEMENT_META[type].stepLabel}
                  </button>
                ))}
              </div>
              <Link
                to="/portal"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Entrar al portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{active.title}</h2>
                <p className="text-xs text-slate-500">Versión {active.version}</p>
              </div>
              <div ref={scrollRef} className="h-96 space-y-5 overflow-y-auto p-5 text-sm text-slate-700 dark:text-slate-300">
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Desplázate hasta el final para habilitar la firma.
                </p>
                {active.sections.map((section) => (
                  <section key={section.title} className="space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{section.title}</h3>
                    <div className="whitespace-pre-line text-xs leading-relaxed sm:text-sm">{section.content}</div>
                  </section>
                ))}
                <div ref={sentinelRef} className="border-t border-dashed border-slate-200 pt-4 text-center text-xs text-slate-400">
                  Fin del instrumento
                </div>
              </div>
              <div
                className={`flex items-center justify-between border-t px-5 py-2 text-xs ${
                  hasScrolled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                {hasScrolled ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Lectura completa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Sigue leyendo
                  </span>
                )}
              </div>

              {signedTypes.includes(step) ? (
                <div className="space-y-3 p-6 text-center text-sm">
                  <p className="font-semibold text-emerald-700">Este documento ya está firmado.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = STUDENT_AGREEMENT_TYPES.find((type) => !signedTypes.includes(type));
                      if (next) setStep(next);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 p-5 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nombre legal
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={!hasScrolled || submitting}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Cédula (opcional)
                      <input
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        disabled={!hasScrolled || submitting}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>
                  </div>
                  <SignaturePad value={signature} onSignatureChange={setSignature} disabled={!hasScrolled || submitting} />
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      disabled={!hasScrolled || submitting}
                      className="mt-1"
                    />
                    <span>{active.checkboxText}</span>
                  </label>
                  {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={!hasScrolled || !accepted || !signature || submitting}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {submitting ? 'Sellando documento…' : 'Firmar y continuar'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
