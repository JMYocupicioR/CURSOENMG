import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Send } from 'lucide-react';
import { allModules } from '../../content/modules';
import { useAuth } from '../../contexts/AuthProvider';
import { saveRevision, submitRevision, getPublishedModules, getRevisionById } from '../../services/editorialService';
import { mergeModuleLists } from '../../services/moduleMerge';
import { useGoBack } from '../../hooks/useGoBack';
import { BackButton } from '../common/BackButton';
import type { RevisionPayload } from '../../types/database';
import { slugify } from '../../utils/slugify';
import { isSupabaseConfigured } from '../../lib/supabase';

const MODULE_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-purple-800',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
];

const emptyModulePayload = (): RevisionPayload => ({
  revisionType: 'module',
  title: '',
  description: '',
  emoji: '📚',
  color: MODULE_COLORS[0],
  icon: 'BookOpen',
  number: allModules.length + 1,
});

export default function ModuleEditorPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/colaborador');
  const [searchParams] = useSearchParams();
  const revisionId = searchParams.get('revisionId');
  const { user, isVerifiedContributor } = useAuth();
  const [payload, setPayload] = useState<RevisionPayload>(emptyModulePayload());
  const [currentId, setCurrentId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextNumber, setNextNumber] = useState(allModules.length + 1);

  useEffect(() => {
    if (!revisionId || !user) return;
    getRevisionById(revisionId).then((rev) => {
      if (!rev || rev.payload.revisionType !== 'module') return;
      setPayload(rev.payload);
      setCurrentId(rev.id);
    });
  }, [revisionId, user]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getPublishedModules()
      .then((published) => {
        const merged = mergeModuleLists(published);
        setNextNumber(Math.max(...merged.map((m) => m.number), 0) + 1);
        setPayload((p) => ({ ...p, number: Math.max(...merged.map((m) => m.number), 0) + 1 }));
      })
      .catch(() => undefined);
  }, []);

  const updatePayload = (patch: Partial<RevisionPayload>) => setPayload((p) => ({ ...p, ...patch }));

  const handleSave = async (submit = false) => {
    if (!user) return;
    setError(null);
    setMessage(null);

    if (!payload.title.trim()) {
      setError('El título del módulo es obligatorio.');
      return;
    }

    const slug = payload.slug?.trim() || slugify(payload.title);
    if (!slug) {
      setError('No se pudo generar un identificador válido. Ajusta el título.');
      return;
    }

    const normalized: RevisionPayload = {
      ...payload,
      revisionType: 'module',
      id: slug,
      slug,
      number: payload.number ?? nextNumber,
      sortOrder: payload.number ?? nextNumber,
    };

    setLoading(true);
    try {
      const saved = await saveRevision({
        id: currentId,
        targetTopicId: null,
        moduleId: slug,
        parentId: null,
        action: 'create',
        payload: normalized,
        authorId: user.id,
      });
      setCurrentId(saved.id);

      if (submit) {
        await submitRevision(saved.id);
        setMessage('Módulo enviado a revisión. Un administrador lo publicará si es aprobado.');
        goBack('/colaborador');
      } else {
        setMessage('Borrador guardado.');
        navigate(`/colaborador/nuevo-modulo?revisionId=${saved.id}`, { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isVerifiedContributor) {
    return (
      <div className="pt-24 px-4 max-w-lg mx-auto text-center">
        <p className="text-slate-600 mb-4">Necesitas verificación de administrador para proponer módulos.</p>
        <Link to="/perfil" className="text-blue-600 underline">Completar perfil</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
      <BackButton fallback="/colaborador" />

      <h1 className="text-2xl font-bold mb-2">Proponer nuevo módulo</h1>
      <p className="text-sm text-slate-500 mb-6">
        Define la información del módulo. Una vez aprobado, podrás agregar temas y subtemas dentro de él.
      </p>

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Número de módulo</span>
            <input
              type="number"
              min={1}
              value={payload.number ?? nextNumber}
              onChange={(e) => updatePayload({ number: Number(e.target.value) })}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Emoji</span>
            <input
              value={payload.emoji ?? '📚'}
              onChange={(e) => updatePayload({ emoji: e.target.value })}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Título *</span>
          <input
            value={payload.title}
            onChange={(e) => updatePayload({ title: e.target.value })}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Identificador (URL)</span>
          <input
            value={payload.slug ?? ''}
            onChange={(e) => updatePayload({ slug: e.target.value })}
            placeholder={slugify(payload.title) || 'ej. electrodiagnostico-pediatrico'}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            Se usará en la URL: /modulo/{payload.slug || slugify(payload.title) || '…'}
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descripción</span>
          <textarea
            rows={3}
            value={payload.description ?? ''}
            onChange={(e) => updatePayload({ description: e.target.value })}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Color (gradiente Tailwind)</span>
          <select
            value={payload.color ?? MODULE_COLORS[0]}
            onChange={(e) => updatePayload({ color: e.target.value })}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            {MODULE_COLORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Save className="w-4 h-4" /> Guardar borrador
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Send className="w-4 h-4" /> Enviar a revisión
          </button>
        </div>
      </div>
    </div>
  );
}
