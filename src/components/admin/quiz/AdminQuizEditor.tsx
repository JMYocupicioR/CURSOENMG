import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Image as ImageIcon,
  Check,
  RotateCcw,
  FolderInput,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthProvider';
import { useAllModules } from '../../../hooks/useAllModules';
import { useMergedModule } from '../../../hooks/useMergedModule';
import { useGoBack } from '../../../hooks/useGoBack';
import { findTopicInTree, getAllFlatTopics, topicListKey } from '../../../services/contentMerge';
import {
  getQuizEditorDataForTopic,
  publishAdminQuizDirectly,
  saveRevision,
  deleteAdminQuizDirectly,
} from '../../../services/editorialService';
import { defaultOptionsForType } from '../../../utils/quizScoring';
import type {
  QuizDifficulty,
  QuizOption,
  QuizQuestionDraft,
  QuizQuestionType,
} from '../../../types/quiz';
import { AdminQuizSimulatorModal } from './AdminQuizSimulatorModal';
import { AdminMoveQuestionModal } from './AdminMoveQuestionModal';

const QUESTION_TYPES: { value: QuizQuestionType; label: string; description: string }[] = [
  { value: 'single', label: 'Opción Única', description: '1 respuesta correcta entre varias' },
  { value: 'multiple', label: 'Opción Múltiple', description: 'Varias respuestas correctas obligatorias' },
  { value: 'true_false', label: 'Verdadero / Falso', description: 'V o F predefinido' },
  { value: 'image_choice', label: 'Imagen Clínica', description: 'Viñeta con registro EMG, biopsia o trazo' },
];

const DIFFICULTIES: { value: QuizDifficulty; label: string; color: string }[] = [
  { value: 'basic', label: 'Básico', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { value: 'intermediate', label: 'Intermedio', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  { value: 'advanced', label: 'Avanzado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
];

function createEmptyQuestion(type: QuizQuestionType = 'single'): QuizQuestionDraft {
  return {
    id: crypto.randomUUID(),
    type,
    stem: '',
    options: defaultOptionsForType(type),
    difficulty: 'intermediate',
    explanation: '',
  };
}

interface AdminQuizEditorProps {
  initialTopicId?: string;
  initialModuleId?: string;
  onBackToCatalog?: () => void;
}

export function AdminQuizEditor({
  initialTopicId,
  initialModuleId,
  onBackToCatalog,
}: AdminQuizEditorProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const goBack = useGoBack('/admin/quizzes');
  const { modules: availableModules } = useAllModules();

  // Selected module & topic
  const [selectedModuleId, setSelectedModuleId] = useState<string>(availableModules[0]?.id ?? 'fundamentals');
  const { module: mergedModule } = useMergedModule(selectedModuleId);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId ?? '');
  const [selectedTopicPath, setSelectedTopicPath] = useState('');

  // Quiz configuration
  const [title, setTitle] = useState('');
  const [passScore, setPassScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([createEmptyQuestion()]);
  const [dataSource, setDataSource] = useState<'database' | 'fallback' | 'empty'>('empty');
  const [version, setVersion] = useState<number>(1);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [movingQuestionIndex, setMovingQuestionIndex] = useState<number | null>(null);
  const quizLoadToken = useRef(0);
  const appliedRouteTopic = useRef('');
  const mergedModuleRef = useRef(mergedModule);
  mergedModuleRef.current = mergedModule;

  // Available leaf topics for selected module. Option keys stay unique even
  // when two leaves in the same module reused a slug.
  const leafTopics = useMemo(() => {
    if (!mergedModule) return [];
    const seen = new Map<string, number>();
    return getAllFlatTopics(mergedModule.topics)
      .filter(({ topic }) => !topic.children?.length && Boolean(topic.content?.trim() || topic.description?.trim()))
      .map(({ topic, path }) => {
        const occurrence = seen.get(path.join('/')) ?? 0;
        seen.set(path.join('/'), occurrence + 1);
        return {
          topic,
          path,
          optionKey: topicListKey(selectedModuleId, path, occurrence),
        };
      });
  }, [mergedModule, selectedModuleId]);

  const selectedLeaf = leafTopics.find((item) => item.optionKey === selectedTopicPath) ?? null;

  // If initialTopicId was provided, open that module (the one from the catalog
  // when moduleId is present) instead of the first module that shares the slug.
  useEffect(() => {
    if (!initialTopicId || availableModules.length === 0) return;
    const routeKey = `${initialModuleId ?? ''}:${initialTopicId}`;
    if (appliedRouteTopic.current === routeKey) return;
    const preferred = initialModuleId
      ? availableModules.filter((mod) => mod.id === initialModuleId)
      : [];
    const rest = availableModules.filter((mod) => mod.id !== initialModuleId);
    for (const mod of [...preferred, ...rest]) {
      const match = getAllFlatTopics(mod.topics).find(({ topic }) => topic.id === initialTopicId);
      if (match) {
        setSelectedModuleId(mod.id);
        setSelectedTopicId(initialTopicId);
        setSelectedTopicPath(topicListKey(mod.id, match.path, 0));
        appliedRouteTopic.current = routeKey;
        break;
      }
    }
  }, [initialTopicId, initialModuleId, availableModules]);

  // Keep the dropdown on a real option after the merged tree loads.
  useEffect(() => {
    if (!selectedTopicId || leafTopics.length === 0) return;
    if (leafTopics.some((item) => item.optionKey === selectedTopicPath)) return;
    const match = leafTopics.find((item) => item.topic.id === selectedTopicId);
    if (match) setSelectedTopicPath(match.optionKey);
  }, [leafTopics, selectedTopicId, selectedTopicPath]);

  // Reload only when the selected topic changes. A module-tree refresh must
  // not refetch and paint the quiz from before a move finished saving.
  useEffect(() => {
    if (!selectedTopicId) return;

    const token = ++quizLoadToken.current;
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const topic = findTopicInTree(mergedModuleRef.current?.topics ?? [], selectedTopicId);
        const data = await getQuizEditorDataForTopic(selectedTopicId);
        if (cancelled || token !== quizLoadToken.current) return;

        setDataSource(data.source);
        setVersion(data.version);
        setTitle(data.title || (topic ? `Evaluación: ${topic.title}` : 'Evaluación del Tema'));
        setPassScore(data.passScore);
        setMaxAttempts(data.maxAttempts);
        setShuffleQuestions(data.shuffleQuestions);
        setShuffleOptions(data.shuffleOptions);

        if (data.questions && data.questions.length > 0) {
          setQuestions(
            data.questions.map((q) => ({
              ...q,
              id: q.id || crypto.randomUUID(),
              options: q.options.map((opt) => ({
                ...opt,
                id: opt.id || crypto.randomUUID(),
              })),
            }))
          );
        } else {
          setQuestions([createEmptyQuestion()]);
        }
      } catch (e) {
        if (!cancelled && token === quizLoadToken.current) {
          console.error(e);
          setErrorMessage('Error al cargar la información del cuestionario.');
        }
      } finally {
        if (!cancelled && token === quizLoadToken.current) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedTopicId]);

  // Handle module dropdown change
  const handleModuleChange = (newModuleId: string) => {
    setSelectedModuleId(newModuleId);
    setSelectedTopicId('');
    setSelectedTopicPath('');
    setQuestions([createEmptyQuestion()]);
    setTitle('');
  };

  // Handle topic change. The option value is the list key, not the slug,
  // so two leaves that shared an id stay selectable.
  const handleTopicChange = (optionKey: string) => {
    const match = leafTopics.find((item) => item.optionKey === optionKey);
    if (!match) return;
    setSelectedTopicPath(optionKey);
    setSelectedTopicId(match.topic.id);
    setTitle(`Evaluación: ${match.topic.title}`);
  };

  // Question mutators
  const updateQuestion = (index: number, updates: Partial<QuizQuestionDraft>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const current = copy[index];
      if (!current) return prev;

      if (updates.type && updates.type !== current.type) {
        copy[index] = {
          ...current,
          ...updates,
          options: defaultOptionsForType(updates.type),
        };
      } else {
        copy[index] = { ...current, ...updates };
      }
      return copy;
    });
  };

  const addOptionToQuestion = (qIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      if (!q) return prev;
      const newOption: QuizOption = {
        id: crypto.randomUUID(),
        text: '',
        isCorrect: false,
      };
      copy[qIndex] = {
        ...q,
        options: [...q.options, newOption],
      };
      return copy;
    });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      if (!q || q.options.length <= 2) return prev;
      const options = q.options.filter((_, i) => i !== optIndex);
      copy[qIndex] = { ...q, options };
      return copy;
    });
  };

  const toggleOptionCorrect = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      if (!q) return prev;

      const isMultiple = q.type === 'multiple';
      const options = q.options.map((opt, i) => {
        if (isMultiple) {
          return i === optIndex ? { ...opt, isCorrect: !opt.isCorrect } : opt;
        }
        return { ...opt, isCorrect: i === optIndex };
      });

      copy[qIndex] = { ...q, options };
      return copy;
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setExpandedIndex((prev) => {
      if (prev === index) return direction === 'up' ? index - 1 : index + 1;
      return prev;
    });
  };

  const duplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const q = prev[index];
      if (!q) return prev;
      const duplicated: QuizQuestionDraft = {
        ...q,
        id: crypto.randomUUID(),
        options: q.options.map((o) => ({ ...o, id: crypto.randomUUID() })),
      };
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
    setExpandedIndex(index + 1);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Un cuestionario debe tener al menos una pregunta.');
      return;
    }
    if (confirm('¿Eliminar esta pregunta del cuestionario?')) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
      setExpandedIndex(0);
    }
  };

  // Validation before save/publish
  const validateQuiz = (): string | null => {
    if (!selectedTopicId) return 'Por favor selecciona un tema hoja del curso.';
    if (!title.trim()) return 'El título del cuestionario no puede estar vacío.';
    if (questions.length === 0) return 'Debes incluir al menos una pregunta.';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.stem.trim()) return `La Pregunta ${i + 1} no tiene enunciado.`;
      if (q.options.length < 2) return `La Pregunta ${i + 1} debe tener al menos 2 opciones.`;

      const hasEmptyOption = q.options.some((o) => !o.text.trim());
      if (hasEmptyOption) return `La Pregunta ${i + 1} contiene opciones con texto en blanco.`;

      const hasCorrect = q.options.some((o) => o.isCorrect);
      if (!hasCorrect) return `La Pregunta ${i + 1} no tiene ninguna respuesta marcada como correcta.`;
    }

    return null;
  };

  // Direct Publish Action
  const handlePublishLive = async () => {
    if (!user) return;
    const validationError = validateQuiz();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await publishAdminQuizDirectly({
        topicId: selectedTopicId,
        moduleId: selectedModuleId,
        title,
        passScore,
        maxAttempts,
        shuffleQuestions,
        shuffleOptions,
        questions,
        authorId: user.id,
      });

      setDataSource('database');
      setVersion((v) => v + 1);
      setSuccessToast('¡Cuestionario publicado en vivo exitosamente! Los alumnos ya pueden resolverlo.');
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Error al publicar el cuestionario en vivo.');
    } finally {
      setSaving(false);
    }
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    if (!user) return;
    if (!selectedTopicId) {
      setErrorMessage('Selecciona un tema primero.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await saveRevision({
        targetTopicId: selectedTopicId,
        moduleId: selectedModuleId,
        action: 'update',
        authorId: user.id,
        payload: {
          revisionType: 'quiz',
          title,
          quizTopicId: selectedTopicId,
          passScore,
          maxAttempts,
          shuffleQuestions,
          shuffleOptions,
          questions,
        },
      });

      setSuccessToast('Borrador guardado en la cola editorial.');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e) {
      console.error(e);
      setErrorMessage('Error al guardar el borrador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCatalog || (() => goBack('/admin/quizzes'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al Catálogo
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Editor Directivo
              </span>
              {dataSource === 'database' && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> En producción (v{version})
                </span>
              )}
              {dataSource === 'fallback' && (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Basado en banco estático
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSimulator(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs sm:text-sm font-semibold transition shadow-xs"
          >
            <Eye className="w-4 h-4" /> Probar como Alumno
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" /> Guardar Borrador
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={handlePublishLive}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/25 transition disabled:opacity-50 hover:scale-102"
          >
            <Send className="w-4 h-4" />
            <span>{saving ? 'Publicando...' : 'Publicar en Vivo'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      {successToast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <p className="font-medium">{successToast}</p>
        </div>
      )}

      {/* Main Form Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Module & Topic Selection & Settings */}
        <div className="space-y-6 lg:col-span-1">
          {/* Target Topic Selection Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              Destino del Cuestionario
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Módulo Académico
              </label>
              <select
                value={selectedModuleId}
                onChange={(e) => handleModuleChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
              >
                {availableModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    Módulo {m.number}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Tema de Estudio (Hoja)
              </label>
              <select
                value={selectedTopicPath}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
              >
                <option value="">-- Seleccionar tema para evaluar --</option>
                {leafTopics.map(({ topic, optionKey }) => (
                  <option key={optionKey} value={optionKey} title={topic.title}>
                    {topic.title}
                  </option>
                ))}
              </select>
              {selectedLeaf && (
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-2 leading-snug">
                  {selectedLeaf.topic.title}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                El quiz se asociará a este tema y aparecerá al final de la lección para los alumnos.
              </p>
            </div>
          </div>

          {/* Academic & Scoring Settings */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Parámetros de Acreditación
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Título de la Evaluación
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Evaluación: Reflejo H y Respuestas Tardías"
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Puntaje Mínimo (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passScore}
                  onChange={(e) => setPassScore(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Intentos Permitidos
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Ilimitados"
                  value={maxAttempts ?? ''}
                  onChange={(e) =>
                    setMaxAttempts(e.target.value ? Math.max(1, Number(e.target.value)) : null)
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Aleatorizar orden de preguntas para alumnos</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Aleatorizar orden de opciones de respuesta</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Questions Builder */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reactivos y Preguntas ({questions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Diseña viñetas clínicas, opciones de respuesta y retroalimentaciones académicas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const newQ = createEmptyQuestion();
                setQuestions((prev) => [...prev, newQ]);
                setExpandedIndex(questions.length);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Agregar Pregunta
            </button>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {questions.map((q, index) => {
              const isExpanded = expandedIndex === index;

              return (
                <div
                  key={q.id || index}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'border-indigo-500/50 dark:border-indigo-500/40 bg-white dark:bg-slate-900 shadow-md'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300'
                  }`}
                >
                  {/* Question Card Header (Collapsible / Summary) */}
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="flex items-center justify-between p-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? 'Opción única'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              DIFFICULTIES.find((d) => d.value === (q.difficulty ?? 'intermediate'))?.color
                            }`}
                          >
                            {DIFFICULTIES.find((d) => d.value === (q.difficulty ?? 'intermediate'))?.label}
                          </span>
                          {q.imageUrl && (
                            <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5">
                              <ImageIcon className="w-3 h-3" /> Imagen
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate mt-1">
                          {q.stem ? q.stem : '(Haz clic para redactar el enunciado...)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Subir"
                        disabled={index === 0}
                        onClick={() => moveQuestion(index, 'up')}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Bajar"
                        disabled={index === questions.length - 1}
                        onClick={() => moveQuestion(index, 'down')}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Duplicar pregunta"
                        onClick={() => duplicateQuestion(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Mover o transferir a otro tema/módulo"
                        onClick={() => setMovingQuestionIndex(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <FolderInput className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar pregunta"
                        onClick={() => deleteQuestion(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Card Content (Expanded) */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {/* Top Action inside expanded */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500">Configuración del Reactivo</span>
                        <button
                          type="button"
                          onClick={() => setMovingQuestionIndex(index)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800/60"
                        >
                          <FolderInput className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Mover o transferir a otro tema...</span>
                        </button>
                      </div>

                      {/* Selectors Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Tipo de Reactivo
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              updateQuestion(index, { type: e.target.value as QuizQuestionType })
                            }
                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label} ({t.description})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Nivel de Dificultad
                          </label>
                          <select
                            value={q.difficulty ?? 'intermediate'}
                            onChange={(e) =>
                              updateQuestion(index, { difficulty: e.target.value as QuizDifficulty })
                            }
                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Stem Textarea */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Enunciado / Viñeta Clínica
                        </label>
                        <textarea
                          rows={3}
                          value={q.stem}
                          onChange={(e) => updateQuestion(index, { stem: e.target.value })}
                          placeholder="Escribe la viñeta clínica, antecedentes electrofisiológicos y pregunta..."
                          className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 leading-relaxed"
                        />
                      </div>

                      {/* Clinical Image Field (if image_choice) */}
                      {q.type === 'image_choice' && (
                        <div className="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/40 dark:bg-cyan-950/20 space-y-3">
                          <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> Registro de Imagen Clínica
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="url"
                              placeholder="URL de la imagen (ej: https://... o ruta pública)"
                              value={q.imageUrl ?? ''}
                              onChange={(e) => updateQuestion(index, { imageUrl: e.target.value })}
                              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                            <input
                              type="text"
                              placeholder="Pie de figura / texto alternativo"
                              value={q.imageAlt ?? ''}
                              onChange={(e) => updateQuestion(index, { imageAlt: e.target.value })}
                              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </div>

                          {q.imageUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 flex items-center justify-center bg-black/40">
                              <img
                                src={q.imageUrl}
                                alt={q.imageAlt || 'Vista previa'}
                                className="max-h-48 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options Section */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Opciones de Respuesta
                          </label>
                          {q.type !== 'true_false' && (
                            <button
                              type="button"
                              onClick={() => addOptionToQuestion(index)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar Opción
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {q.options.map((opt, optIndex) => (
                            <div
                              key={opt.id || optIndex}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                                opt.isCorrect
                                  ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {/* Radio or checkbox */}
                              <label className="flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                                  name={`question-${index}-correct`}
                                  checked={opt.isCorrect}
                                  onChange={() => toggleOptionCorrect(index, optIndex)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                              </label>

                              {/* Option text */}
                              <input
                                type="text"
                                value={opt.text}
                                disabled={q.type === 'true_false'}
                                onChange={(e) => {
                                  const options = [...q.options];
                                  options[optIndex] = { ...options[optIndex], text: e.target.value };
                                  updateQuestion(index, { options });
                                }}
                                placeholder={`Texto de la opción ${optIndex + 1}`}
                                className="flex-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                              />

                              {opt.isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md shrink-0">
                                  Correcta
                                </span>
                              )}

                              {q.type !== 'true_false' && q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(index, optIndex)}
                                  className="p-1 text-slate-400 hover:text-red-500 transition"
                                  title="Eliminar opción"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explanation / Clinical Pearl */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Retroalimentación Académica / Perla Clínica COMEFYR</span>
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation ?? ''}
                          onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                          placeholder="Justificación médica y electrodiagnóstica que verá el estudiante al concluir el examen..."
                          className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Simulator Modal */}
      <AdminQuizSimulatorModal
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        quizTitle={title}
        passScore={passScore}
        questions={questions}
      />

      {/* Transfer Question Modal */}
      <AdminMoveQuestionModal
        isOpen={movingQuestionIndex !== null}
        onClose={() => setMovingQuestionIndex(null)}
        question={movingQuestionIndex !== null ? questions[movingQuestionIndex] : null}
        questionIndex={movingQuestionIndex}
        currentModuleId={selectedModuleId}
        currentTopicId={selectedTopicId}
        onSuccess={async (mode, _targetTopicId, targetTopicTitle) => {
          if (mode === 'move' && movingQuestionIndex !== null) {
            if (!user) throw new Error('Sesión no disponible.');
            if (!selectedTopicId) throw new Error('Selecciona el tema de origen antes de mover.');
            quizLoadToken.current += 1;
            const remaining = questions.filter((_, index) => index !== movingQuestionIndex);
            await publishAdminQuizDirectly({
              topicId: selectedTopicId,
              moduleId: selectedModuleId,
              title: title.trim() || 'Evaluación del tema',
              passScore,
              maxAttempts,
              shuffleQuestions,
              shuffleOptions,
              questions: remaining,
              authorId: user.id,
            });
            setQuestions(remaining.length > 0 ? remaining : [createEmptyQuestion()]);
            setExpandedIndex(
              remaining.length === 0 ? 0 : Math.min(movingQuestionIndex, remaining.length - 1)
            );
            setDataSource('database');
            setVersion((current) => current + 1);
          }
          setSuccessToast(
            mode === 'move'
              ? `Pregunta movida a «${targetTopicTitle}». Esta evaluación ya quedó actualizada en vivo.`
              : `Pregunta copiada al tema «${targetTopicTitle}».`
          );
          setTimeout(() => setSuccessToast(null), 5000);
        }}
      />
    </div>
  );
}
