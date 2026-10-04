import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Send, Stethoscope, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { getRevisionById, saveRevision, submitRevision } from '../../services/editorialService';
import { useAllModules } from '../../hooks/useAllModules';
import { useGoBack } from '../../hooks/useGoBack';
import { BackButton } from '../common/BackButton';
import type { RevisionPayload, RevisionStatus } from '../../types/database';

export default function ClinicalCaseEditorPage() {
  const { revisionId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/colaborador');
  const { user } = useAuth();
  const { modules } = useAllModules();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('');
  const [clinicalCaseJsonStr, setClinicalCaseJsonStr] = useState('');
  const [moduleId, setModuleId] = useState(modules[0]?.id || '');
  const [status, setStatus] = useState<RevisionStatus | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!revisionId || !user) return;
    getRevisionById(revisionId).then((rev) => {
      if (!rev) return;
      if (rev.payload.revisionType !== 'clinical_case') {
        navigate('/colaborador');
        return;
      }
      setModuleId(rev.module_id);
      setTitle(rev.payload.title);
      setDescription(rev.payload.description || '');
      setClinicalDiagnosis(rev.payload.clinicalDiagnosis || '');
      setClinicalCaseJsonStr(
        rev.payload.clinicalCaseJson ? JSON.stringify(rev.payload.clinicalCaseJson, null, 2) : ''
      );
      setStatus(rev.status);
    }).catch(e => setError(e.message));
  }, [revisionId, user, navigate]);

  const validateJson = () => {
    if (!clinicalCaseJsonStr.trim()) return null;
    try {
      const parsed = JSON.parse(clinicalCaseJsonStr);
      setJsonError(null);
      return parsed;
    } catch (e: any) {
      setJsonError('JSON inválido: ' + e.message);
      return null;
    }
  };

  const handleSave = async (submitAfter = false) => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      const parsedJson = validateJson();
      if (clinicalCaseJsonStr.trim() && !parsedJson) {
        throw new Error('Corrige los errores del JSON antes de guardar.');
      }

      if (!title.trim()) {
        throw new Error('El título es requerido.');
      }

      const payload: RevisionPayload = {
        revisionType: 'clinical_case',
        title,
        description,
        clinicalDiagnosis,
        clinicalCaseJson: parsedJson,
      };

      const saved = await saveRevision({
        id: revisionId,
        moduleId,
        action: 'create',
        payload,
        authorId: user.id,
      });

      if (submitAfter) {
        setIsSubmitting(true);
        await submitRevision(saved.id);
        goBack('/colaborador');
      } else {
        if (!revisionId) {
          navigate(`/colaborador/caso-clinico/${saved.id}`, { replace: true });
        } else {
          // just updated
          setStatus(saved.status);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const isReadOnly = status !== null && status !== 'draft' && status !== 'changes_requested';

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <BackButton fallback="/colaborador" />

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {revisionId ? 'Editar Caso Clínico' : 'Nuevo Caso Clínico'}
          </h1>
          <p className="text-sm text-slate-500">
            Sube casos EMG completos para los talleres en vivo.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isReadOnly && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>Este caso ya fue enviado o aprobado y no puede modificarse. Estado: {status}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Módulo asociado</label>
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            disabled={isReadOnly}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Título del caso</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isReadOnly}
            placeholder="Ej: Polineuropatía desmielinizante en paciente diabético"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Diagnóstico definitivo</label>
          <input
            type="text"
            value={clinicalDiagnosis}
            onChange={(e) => setClinicalDiagnosis(e.target.value)}
            disabled={isReadOnly}
            placeholder="Ej: CIDP típica"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descripción breve / Historial</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isReadOnly}
            rows={3}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Datos EMG en formato JSON</label>
          <p className="text-xs text-slate-500 mb-2">Descarga el .JSON de ejemplo y enviaselo a tu ia de confianza (ChatGPT, Gemini, Claude, etc) para que complete los datos clínicos basándose en los resultados de la neurofisiología. Y por último pega aquí los valores tabulares exportados del equi del caso de EMG.</p>
          <textarea
            value={clinicalCaseJsonStr}
            onChange={(e) => {
              setClinicalCaseJsonStr(e.target.value);
              setJsonError(null);
            }}
            disabled={isReadOnly}
            rows={10}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm disabled:opacity-50"
            placeholder='{"ncs": [...], "emg": [...]}'
          />
          {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
        </div>

        {!isReadOnly && (
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-6 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Guardar borrador
              </span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || isSubmitting}
              className="px-6 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Enviar para revisión
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
