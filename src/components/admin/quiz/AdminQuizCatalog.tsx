import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  ExternalLink,
  Plus,
  ClipboardList,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAllModules } from '../../../hooks/useAllModules';
import { getAllFlatTopics, topicListKey } from '../../../services/contentMerge';
import { getAllQuizFlags } from '../../../services/quizService';
import { getTopicPublicUrl } from '../../../utils/adminUtils';
import type { QuizTopicFlag } from '../../../types/quiz';
import { AdminQuizSimulatorModal } from './AdminQuizSimulatorModal';
import { getQuizEditorDataForTopic } from '../../../services/editorialService';

interface AdminQuizCatalogProps {
  onSelectTopic: (topicId: string, moduleId: string) => void;
}

export function AdminQuizCatalog({ onSelectTopic }: AdminQuizCatalogProps) {
  const { modules, loading: modulesLoading } = useAllModules();
  const [flags, setFlags] = useState<QuizTopicFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_quiz' | 'no_quiz'>('all');

  // Simulator preview state
  const [simulatorData, setSimulatorData] = useState<{
    isOpen: boolean;
    title: string;
    passScore: number;
    questions: any[];
  }>({
    isOpen: false,
    title: '',
    passScore: 70,
    questions: [],
  });

  useEffect(() => {
    getAllQuizFlags()
      .then(setFlags)
      .catch((err) => console.warn('Error loading quiz flags:', err))
      .finally(() => setLoadingFlags(false));
  }, []);

  // Flatten all leaf topics from all modules
  const allLeafTopics = useMemo(() => {
    return modules.flatMap((m) => {
      const seen = new Map<string, number>();
      return getAllFlatTopics(m.topics)
        .filter(({ topic }) => !topic.children?.length && Boolean(topic.content?.trim() || topic.description?.trim()))
        .map(({ topic, path }) => {
          const pathKey = path.join('/');
          const occurrence = seen.get(pathKey) ?? 0;
          seen.set(pathKey, occurrence + 1);
          return {
            topic,
            path,
            moduleId: m.id,
            moduleNumber: m.number,
            moduleTitle: m.title,
            listKey: topicListKey(m.id, path, occurrence),
          };
        });
    });
  }, [modules]);

  // Flags map by topicId
  const flagsMap = useMemo(() => {
    const map = new Map<string, QuizTopicFlag>();
    flags.forEach((f) => map.set(f.topic_id, f));
    return map;
  }, [flags]);

  // Filtered topics list
  const filteredTopics = useMemo(() => {
    return allLeafTopics.filter((item) => {
      const flag = flagsMap.get(item.topic.id);
      const hasQuiz = Boolean(flag && flag.question_count > 0);

      // Status filter
      if (statusFilter === 'with_quiz' && !hasQuiz) return false;
      if (statusFilter === 'no_quiz' && hasQuiz) return false;

      // Module filter
      if (selectedModuleFilter !== 'all' && item.moduleId !== selectedModuleFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.topic.title.toLowerCase().includes(q);
        const matchesModule = item.moduleTitle.toLowerCase().includes(q);
        const matchesId = item.topic.id.toLowerCase().includes(q);
        return matchesTitle || matchesModule || matchesId;
      }

      return true;
    });
  }, [allLeafTopics, flagsMap, statusFilter, selectedModuleFilter, searchQuery]);

  // Stats calculation
  const totalTopics = allLeafTopics.length;
  const topicsWithQuiz = allLeafTopics.filter((t) => {
    const f = flagsMap.get(t.topic.id);
    return Boolean(f && f.question_count > 0);
  }).length;
  const totalQuestions = flags.reduce((acc, f) => acc + (f.question_count || 0), 0);
  const coveragePercentage = totalTopics > 0 ? Math.round((topicsWithQuiz / totalTopics) * 100) : 0;

  // Open direct student preview for a topic
  const handleQuickPreview = async (topicId: string, topicTitle: string) => {
    try {
      const data = await getQuizEditorDataForTopic(topicId);
      setSimulatorData({
        isOpen: true,
        title: data.title || topicTitle,
        passScore: data.passScore || 70,
        questions: data.questions || [],
      });
    } catch (e) {
      console.error(e);
      alert('No se pudo cargar la vista previa.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white border border-indigo-500/20 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <GraduationCap className="w-3.5 h-3.5" /> Catálogo de Evaluaciones
            </span>
            <span className="text-xs text-indigo-200/70">Acreditación COMEFYR</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">Gestión y Edición de Quizzes</h2>
          <p className="text-xs sm:text-sm text-indigo-200/80 max-w-xl mt-0.5">
            Supervisa los cuestionarios activos para los alumnos de los 13 módulos del programa y edita las preguntas directamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/admin/evaluaciones"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-semibold transition"
          >
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>Ver Intentos de Alumnos</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quizzes Activos
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {topicsWithQuiz}
            </span>
            <span className="text-xs text-slate-500 font-medium">de {totalTopics} temas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Banco de Preguntas
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {totalQuestions}
            </span>
            <span className="text-xs text-slate-500 font-medium">reactivos totales</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Cobertura del Curso
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {coveragePercentage}%
            </span>
            <span className="text-xs text-slate-500 font-medium">temas cubiertos</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Puntaje de Pase
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              70%
            </span>
            <span className="text-xs text-slate-500 font-medium">estándar COMEFYR</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tema o módulo..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Module Selector */}
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
          >
            <option value="all">Todos los Módulos (13)</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                Módulo {m.number}: {m.title}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos ({allLeafTopics.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('with_quiz')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'with_quiz'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Con Quiz ({topicsWithQuiz})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('no_quiz')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'no_quiz'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sin Quiz ({totalTopics - topicsWithQuiz})
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Table / List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Módulo & Tema</th>
                <th className="px-4 py-3.5">Estado del Quiz</th>
                <th className="px-4 py-3.5">Preguntas</th>
                <th className="px-4 py-3.5">Mínimo (%)</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No se encontraron temas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredTopics.map((item) => {
                  const flag = flagsMap.get(item.topic.id);
                  const hasQuiz = Boolean(flag && flag.question_count > 0);
                  const publicUrl = getTopicPublicUrl(item.moduleId, item.topic.id);

                  return (
                    <tr
                      key={item.listKey}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Topic title & module */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {item.moduleNumber}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-snug">
                              {item.topic.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>Módulo {item.moduleNumber}: {item.moduleTitle}</span>
                              <span>·</span>
                              <code className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {item.topic.id}
                              </code>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {hasQuiz ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Activo {flag?.version ? `(v${flag.version})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            Sin Cuestionario
                          </span>
                        )}
                      </td>

                      {/* Question count */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {hasQuiz ? (
                          <span className="font-bold text-slate-900 dark:text-white">
                            {flag?.question_count} reactivos
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Pass score */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {hasQuiz ? `${flag?.pass_score ?? 70}%` : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasQuiz && (
                            <button
                              type="button"
                              onClick={() => handleQuickPreview(item.topic.id, item.topic.title)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                              title="Probar simulador de alumno"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Simular</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectTopic(item.topic.id, item.moduleId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{hasQuiz ? 'Editar Quiz' : 'Crear Quiz'}</span>
                          </button>

                          {publicUrl && (
                            <Link
                              to={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver lección en curso"
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Simulator */}
      <AdminQuizSimulatorModal
        isOpen={simulatorData.isOpen}
        onClose={() => setSimulatorData((prev) => ({ ...prev, isOpen: false }))}
        quizTitle={simulatorData.title}
        passScore={simulatorData.passScore}
        questions={simulatorData.questions}
      />
    </div>
  );
}
