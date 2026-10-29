import { useEffect, useState } from 'react';
import { FileText, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { isCeoEmail } from '../../content/legal/ceo';
import {
  PHYSICIAN_AGREEMENT_TYPES,
  validatePhysicianEditionForPublish,
  type PhysicianAgreementType,
  type PhysicianParty,
} from '../../content/legal/physicianAgreements';
import { PARTY_PLACEHOLDERS } from '../../content/legal/party';
import {
  fetchPhysicianAgreementEditor,
  publishPhysicianAgreementEdition,
  savePhysicianAgreementDraft,
  type PhysicianAgreementEditorModel,
} from '../../services/physicianAgreementEditionService';

type DocKey = PhysicianAgreementType | 'aviso';

const DOC_TABS: { id: DocKey; label: string }[] = [
  { id: 'contrato', label: 'Contrato' },
  { id: 'anexo', label: 'Anexo' },
  { id: 'reglamento', label: 'Reglamento' },
  { id: 'aviso', label: 'Aviso de privacidad' },
];

const PARTY_FIELDS: { key: keyof PhysicianParty; label: string; placeholder: string }[] = [
  { key: 'legalName', label: 'Razón social', placeholder: PARTY_PLACEHOLDERS.legalName },
  { key: 'rfc', label: 'RFC', placeholder: PARTY_PLACEHOLDERS.rfc },
  { key: 'address', label: 'Domicilio', placeholder: PARTY_PLACEHOLDERS.address },
  { key: 'privacyEmail', label: 'Correo de privacidad', placeholder: PARTY_PLACEHOLDERS.privacyEmail },
  { key: 'academicEmail', label: 'Correo académico', placeholder: PARTY_PLACEHOLDERS.academicEmail },
  { key: 'settlementEmail', label: 'Correo de liquidaciones', placeholder: '[CORREO DE LIQUIDACIONES]' },
  { key: 'city', label: 'Ciudad de los tribunales', placeholder: PARTY_PLACEHOLDERS.city },
];

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export function PhysicianAgreementEditor() {
  const { user } = useAuth();
  const [model, setModel] = useState<PhysicianAgreementEditorModel | null>(null);
  const [doc, setDoc] = useState<DocKey>('contrato');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPhysicianAgreementEditor()
      .then((loaded) => {
        if (!cancelled) setModel(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el acuerdo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isCeoEmail(user?.email)) return null;

  if (loading || !model) {
    return (
      <p className={error ? 'text-sm text-rose-600' : 'text-sm text-slate-500'}>
        {error ?? 'Cargando acuerdos…'}
      </p>
    );
  }

  const publishProblem = validatePhysicianEditionForPublish(model);
  const payload = {
    party: model.party,
    contrato: model.contrato,
    anexo: model.anexo,
    reglamento: model.reglamento,
    aviso: model.aviso,
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await savePhysicianAgreementDraft(payload, user.id, model.draftVersion);
      setModel({ ...model, draftVersion: model.draftVersion ?? 'borrador' });
      setNotice('Borrador guardado. Todavía no lo ve el colaborador.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!user) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const version = await publishPhysicianAgreementEdition(payload, user.id, model.publishedVersion);
      setModel({
        ...model,
        publishedVersion: version,
        publishedAt: new Date().toISOString(),
      });
      setConfirmPublish(false);
      setNotice(
        `Versión ${version} publicada. Quien no la haya firmado tendrá que aceptarla antes de entrar al área docente.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Versión que se firma: <strong>{model.publishedVersion ?? 'ninguna'}</strong>
          {model.publishedAt ? ` · ${new Date(model.publishedAt).toLocaleString('es-MX')}` : ''}
          <span className="mt-1 block text-xs text-slate-500">
            Guardar deja un borrador. Publicar cambia el texto del PDF y pide firma de nuevo si la versión cambia.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmPublish(true)}
            disabled={Boolean(publishProblem) || publishing}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Publicar
          </button>
        </div>
      </div>

      {publishProblem && <p className="text-xs text-amber-700 dark:text-amber-300">{publishProblem}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}

      {confirmPublish && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
          <p>
            Colaboradores, editores y administradores que no tengan esta versión firmada verán la pantalla de acuerdos
            antes del área docente. Tu cuenta no entra a esa pantalla.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              {publishing ? 'Publicando…' : 'Publicar ahora'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmPublish(false)}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Datos del prestador</h2>
        <p className="mt-1 text-xs text-slate-500">
          Sustituyen los corchetes del texto. En el anexo, las tasas de la generación se escriben en el markdown; el
          médico solo llena RFC, CLABE, banco y papel al firmar.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PARTY_FIELDS.map((field) => (
            <label key={field.key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {field.label}
              <input
                value={model.party[field.key]}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setModel({ ...model, party: { ...model.party, [field.key]: event.target.value } })
                }
                className={fieldClass}
              />
            </label>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 sm:grid-cols-4">
        {DOC_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={doc === tab.id}
            onClick={() => setDoc(tab.id)}
            className={`min-h-11 rounded-xl px-2 text-sm font-semibold ${
              doc === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className="mb-1 inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          Texto en markdown
        </span>
        <textarea
          value={model[doc]}
          onChange={(event) => setModel({ ...model, [doc]: event.target.value })}
          spellCheck
          className={`${fieldClass} min-h-[28rem] font-mono text-[13px] leading-relaxed`}
        />
      </label>
      {PHYSICIAN_AGREEMENT_TYPES.includes(doc as PhysicianAgreementType) && (
        <p className="text-xs text-slate-500">
          Conserva el título con #, las secciones con ## y el bloque “Texto de la casilla de aceptación”.
        </p>
      )}
    </div>
  );
}
