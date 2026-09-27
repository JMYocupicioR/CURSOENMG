import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Send, Plus, Trash2, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useAllModules } from '../../hooks/useAllModules';
import { useMergedModule } from '../../hooks/useMergedModule';
import {
  getRevisionById,
  getPublishedQuizForTopic,
  saveRevision,
  submitRevision,
} from '../../services/editorialService';
import { findTopicInTree, getAllFlatTopics } from '../../services/contentMerge';
import { defaultOptionsForType, publishedQuestionsToDraft } from '../../utils/quizScoring';
import { useGoBack } from '../../hooks/useGoBack';
import { BackButton } from '../common/BackButton';
import type { QuizQuestionDraft, QuizQuestionType } from '../../types/quiz';
import type { RevisionAction, RevisionPayload } from '../../types/database';

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: 'single', label: 'Opción única' },
  { value: 'multiple', label: 'Opción múltiple' },
  { value: 'true_false', label: 'Verdadero / Falso' },
  { value: 'image_choice', label: 'Imagen clínica' },
];

function emptyQuestion(type: QuizQuestionType = 'single'): QuizQuestionDraft {
  return {
    id: crypto.randomUUID(),
    type,
    stem: '',
    options: defaultOptionsForType(type),
    difficulty: 'basic',
  };
}

function emptyPayload(topicTitle?: string): RevisionPayload {
  return {
    revisionType: 'quiz',
    title: topicTitle ? `Evaluación: ${topicTitle}` : 'Evaluación del tema',
    passScore: 70,
    maxAttempts: null,
    shuffleQuestions: true,
    shuffleOptions: true,
    questions: [emptyQuestion()],
  };
}

export default function QuizEditorPage() {
  const { revisionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/colaborador');
  const { user } = useAuth();
  const { modules: availableModules } = useAllModules();

  const queryModuleId = searchParams.get('moduleId');
  const queryTopicId = searchParams.get('topicId');

  const [moduleId, setModuleId] = useState(queryModuleId ?? availableModules[0]?.id ?? '');
  const { module: mergedModule } = useMergedModule(moduleId);
  const [topicId, setTopicId] = useState<string | null>(queryTopicId);
  const [action, setAction] = useState<RevisionAction>('create');
  const [payload, setPayload] = useState<RevisionPayload>(emptyPayload());
  const [currentId, setCurrentId] = useState<string | undefined>(revisionId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const leafTopics = mergedModule
    ? getAllFlatTopics(mergedModule.topics).filter(
        ({ topic }) => !topic.children?.length && Boolean(topic.content?.trim() || topic.description?.trim())
      )
    : [];

  useEffect(() => {
    if (revisionId) return;
    if (!queryTopicId || !queryModuleId || !mergedModule) return;

    let cancelled = false;
    async function loadExisting() {
      const topic = findTopicInTree(mergedModule!.topics, queryTopicId!);
      const published = await getPublishedQuizForTopic(queryTopicId!);
      if (cancelled) return;

      if (published) {
        setAction('update');
        setPayload({
          revisionType: 'quiz',
          title: published.quiz.title ?? `Evaluación: ${topic?.title ?? queryTopicId}`,
          quizTopicId: queryTopicId!,
          passScore: published.quiz.pass_score,
          maxAttempts: published.quiz.max_attempts,
          shuffleQuestions: published.quiz.shuffle_questions,
          shuffleOptions: published.quiz.shuffle_options,
          questions: publishedQuestionsToDraft(published.questions),
        });
      } else {
        setPayload(emptyPayload(topic?.title));
      }
    }
    loadExisting().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [revisionId, queryTopicId, queryModuleId, mergedModule]);

  useEffect(() => {
    if (!revisionId || !user) return;
    getRevisionById(revisionId).then((rev) => {
      if (!rev) return;
      setModuleId(rev.module_id);
      setTopicId(rev.target_topic_id ?? rev.payload.quizTopicId ?? null);
      setAction(rev.action);
      setPayload(rev.payload);
      setCurrentId(rev.id);
    });
  }, [revisionId, user]);

  const updateQuestion = (index: number, updates: Partial<QuizQuestionDraft>) => {
    setPayload((prev) => {
      const questions = [...(prev.questions ?? [])];
      const current = questions[index];
      if (!current) return prev;
      if (updates.type && updates.type !== current.type) {
        questions[index] = { ...current, ...updates, options: defaultOptionsForType(updates.type) };
      } else {
        questions[index] = { ...current, ...updates };
      }
      return { ...prev, questions };
    });
  };

  const handleSave = async (submit = false) => {
    if (!user || !topicId) {
      setError('Selecciona un tema.');
      return;
    }
    if (!payload.questions?.length) {
      setError('Agrega al menos una pregunta.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const fullPayload: RevisionPayload = {
        ...payload,
        revisionType: 'quiz',
        quizTopicId: topicId,
      };
      const saved = await saveRevision({
        id: currentId,
        targetTopicId: topicId,
        moduleId,
        action,
        payload: fullPayload,
        authorId: user.id,
      });
      setCurrentId(saved.id);
      if (submit) {
        await submitRevision(saved.id);
        setMessage('Cuestionario enviado a revisión.');
        goBack('/colaborador');
      } else {
        setMessage('Borrador guardado.');
        navigate(`/colaborador/cuestionario/${saved.id}`, { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <BackButton fallback="/colaborador" />

      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-8 h-8 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Editor de cuestionario</h1>
          <p className="text-sm text-slate-500">Propuesta sujeta a revisión editorial antes de publicarse.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Módulo</span>
            <select
              value={moduleId}
              onChange={(e) => {
                setModuleId(e.target.value);
                setTopicId(null);
              }}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {availableModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number}. {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Tema (hoja con contenido)</span>
            <select
              value={topicId ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                setTopicId(id);
                const topic = findTopicInTree(mergedModule?.topics ?? [], id);
                setPayload((p) => ({
                  ...p,
                  title: topic ? `Evaluación: ${topic.title}` : p.title,
                  quizTopicId: id,
                }));
              }}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="">Seleccionar tema…</option>
              {leafTopics.map(({ topic, path }) => (
                <option key={topic.id} value={topic.id}>
                  {path.length > 1 ? '↳ '.repeat(path.length - 1) : ''}{topic.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium">Título del cuestionario</span>
            <input
              value={payload.title}
              onChange={(e) => setPayload({ ...payload, title: e.target.value })}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Puntaje mínimo (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={payload.passScore ?? 70}
              onChange={(e) => setPayload({ ...payload, passScore: Number(e.target.value) })}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Intentos permitidos (por defecto = 1 intento)</span>
            <input
              type="number"
              min={1}
              placeholder="1"
              value={payload.maxAttempts ?? ''}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  maxAttempts: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
          <div className="flex flex-col gap-2 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={payload.shuffleQuestions ?? true}
                onChange={(e) => setPayload({ ...payload, shuffleQuestions: e.target.checked })}
              />
              Mezclar preguntas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={payload.shuffleOptions ?? true}
                onChange={(e) => setPayload({ ...payload, shuffleOptions: e.target.checked })}
              />
              Mezclar opciones
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Preguntas</h2>
            <button
              type="button"
              onClick={() =>
                setPayload((p) => ({
                  ...p,
                  questions: [...(p.questions ?? []), emptyQuestion()],
                }))
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {(payload.questions ?? []).map((q, index) => (
            <div key={q.id ?? index} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Pregunta {index + 1}</span>
                <div className="flex gap-2">
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestion(index, { type: e.target.value as QuizQuestionType })
                    }
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {(payload.questions?.length ?? 0) > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPayload((p) => ({
                          ...p,
                          questions: p.questions?.filter((_, i) => i !== index),
                        }))
                      }
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={2}
                placeholder="Enunciado de la pregunta"
                value={q.stem}
                onChange={(e) => updateQuestion(index, { stem: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />

              {(q.type === 'image_choice') && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="URL de imagen clínica"
                    value={q.imageUrl ?? ''}
                    onChange={(e) => updateQuestion(index, { imageUrl: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    placeholder="Texto alternativo"
                    value={q.imageAlt ?? ''}
                    onChange={(e) => updateQuestion(index, { imageAlt: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}

              <div className="space-y-2">
                {q.options.map((opt, optIndex) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                      name={`correct-${index}`}
                      checked={opt.isCorrect}
                      onChange={() => {
                        const options = q.options.map((o, i) => {
                          if (q.type === 'multiple') {
                            return i === optIndex ? { ...o, isCorrect: !o.isCorrect } : o;
                          }
                          return { ...o, isCorrect: i === optIndex };
                        });
                        updateQuestion(index, { options });
                      }}
                    />
                    <input
                      value={opt.text}
                      disabled={q.type === 'true_false'}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[optIndex] = { ...options[optIndex], text: e.target.value };
                        updateQuestion(index, { options });
                      }}
                      placeholder={`Opción ${optIndex + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-70"
                    />
                  </div>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Explicación clínica (se muestra al finalizar)"
                value={q.explanation ?? ''}
                onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium"
          >
            <Save className="w-4 h-4" /> Guardar borrador
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
          >
            <Send className="w-4 h-4" /> Enviar a revisión
          </button>
        </div>
      </div>
    </div>
  );
}
