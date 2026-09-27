import { useEffect, useState } from 'react';
import {
  X,
  FolderInput,
  AlertCircle,
  Copy,
  MoveRight,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthProvider';
import { useAllModules } from '../../../hooks/useAllModules';
import { findTopicInTree } from '../../../services/contentMerge';
import {
  getQuizEditorDataForTopic,
  publishAdminQuizDirectly,
} from '../../../services/editorialService';
import type { QuizQuestionDraft } from '../../../types/quiz';
import {
  TopicSearchPicker,
  type TopicSearchSelection,
} from '../../common/TopicSearchPicker';

interface AdminMoveQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuizQuestionDraft | null;
  questionIndex: number | null;
  currentModuleId: string;
  currentTopicId: string;
  onSuccess: (
    mode: 'move' | 'copy',
    targetTopicId: string,
    targetTopicTitle: string,
  ) => void | Promise<void>;
}

export function AdminMoveQuestionModal({
  isOpen,
  onClose,
  question,
  questionIndex,
  currentModuleId,
  currentTopicId,
  onSuccess,
}: AdminMoveQuestionModalProps) {
  const { user } = useAuth();
  const { modules } = useAllModules();

  const [target, setTarget] = useState<TopicSearchSelection | null>(null);
  const [transferMode, setTransferMode] = useState<'move' | 'copy'>('move');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTarget(null);
    setTransferMode('move');
    setError(null);
  }, [isOpen, currentModuleId, currentTopicId]);

  const currentModule = modules.find((m) => m.id === currentModuleId);
  const currentTopic = currentModule
    ? findTopicInTree(currentModule.topics, currentTopicId)
    : null;
  const targetModule = target
    ? modules.find((m) => m.id === target.moduleId)
    : undefined;

  if (!isOpen || !question) return null;

  const handleTransfer = async () => {
    if (!user) return;
    if (!target) {
      setError('Por favor selecciona el tema destino.');
      return;
    }
    const targetTopicId = target.topicId;
    const targetModuleId = target.moduleId;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Load destination topic's quiz data
      const targetQuizData = await getQuizEditorDataForTopic(targetTopicId);
      const targetTopic = targetModule ? findTopicInTree(targetModule.topics, targetTopicId) : null;
      const targetTitle = targetQuizData.title || (targetTopic ? `Evaluación: ${targetTopic.title}` : 'Evaluación');

      // 2. Clone question with fresh UUIDs
      const clonedQuestion: QuizQuestionDraft = {
        ...question,
        id: crypto.randomUUID(),
        options: question.options.map((o) => ({
          ...o,
          id: crypto.randomUUID(),
        })),
      };

      // 3. Append to destination quiz questions
      const updatedTargetQuestions = [...(targetQuizData.questions || []), clonedQuestion];

      // 4. Save/publish target quiz
      await publishAdminQuizDirectly({
        topicId: targetTopicId,
        moduleId: targetModuleId,
        title: targetTitle,
        passScore: targetQuizData.passScore || 70,
        maxAttempts: targetQuizData.maxAttempts,
        shuffleQuestions: targetQuizData.shuffleQuestions,
        shuffleOptions: targetQuizData.shuffleOptions,
        questions: updatedTargetQuestions,
        authorId: user.id,
      });

      // 5. Persist the source quiz when moving, then close.
      await onSuccess(transferMode, targetTopicId, targetTopic?.title || target.title);
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Error al transferir la pregunta al tema destino.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                Organización de Banco de Preguntas
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Mover Pregunta a otro Tema
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Question Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                Reactivo #{questionIndex != null ? questionIndex + 1 : ''}
              </span>
              <span>{question.options.length} opciones · Dificultad: {question.difficulty || 'intermedia'}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
              {question.stem || '(Sin enunciado)'}
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              Ubicación actual: <span className="font-medium text-slate-700 dark:text-slate-300">{currentTopic?.title || currentTopicId}</span>
            </div>
          </div>

          <TopicSearchPicker
            modules={modules}
            excludeTopicId={currentTopicId}
            currentModuleId={currentModuleId}
            value={target}
            onChange={setTarget}
          />

          {/* Transfer Mode Options (Move vs Copy) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Modalidad de Transferencia
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferMode('move')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  transferMode === 'move'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <MoveRight className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="text-left">
                  <p>Mover</p>
                  <p className="text-[10px] font-normal opacity-80">Quitar de este quiz</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTransferMode('copy')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  transferMode === 'copy'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Copy className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="text-left">
                  <p>Duplicar / Copiar</p>
                  <p className="text-[10px] font-normal opacity-80">Mantener en ambos</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={submitting || !target}
            onClick={handleTransfer}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
          >
            <FolderInput className="w-4 h-4" />
            <span>{submitting ? 'Transfiriendo...' : transferMode === 'move' ? 'Mover Pregunta' : 'Copiar Pregunta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
