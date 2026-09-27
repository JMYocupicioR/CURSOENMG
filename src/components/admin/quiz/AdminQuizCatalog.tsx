import { useEffect, useState, useMemo, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { useAllModules } from '../../../hooks/useAllModules';
import { getAllFlatTopics, topicListKey } from '../../../services/contentMerge';
import { getAllQuizFlags } from '../../../services/quizService';
import { getTopicPublicUrl } from '../../../utils/adminUtils';
import type { QuizTopicFlag, QuizQuestionDraft } from '../../../types/quiz';
import { AdminQuizSimulatorModal } from './AdminQuizSimulatorModal';
import { getQuizEditorDataForTopic } from '../../../services/editorialService';
import {
  buildQuizCatalogPath,
  clearQuizCatalogReturn,
  parseQuizCatalogStatus,
  quizRowDomId,
  rememberQuizCatalogReturn,
  type QuizCatalogStatus,
} from '../../../utils/quizCatalogNavigation';

interface AdminQuizCatalogProps {
  onSelectTopic: (topicId: string, moduleId: string) => void;
}

type CatalogTopic = {
  topic: { id: string; title: string };
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  listKey: string;
};

export function AdminQuizCatalog({ onSelectTopic }: AdminQuizCatalogProps) {
  const { modules, loading: modulesLoading } = useAllModules();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [flags, setFlags] = useState<QuizTopicFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);

  const searchQuery = searchParams.get('q') ?? '';
  const selectedModuleFilter = searchParams.get('modulo') ?? 'all';
  const statusFilter = parseQuizCatalogStatus(searchParams.get('estado'));
  const focusedRowId = location.hash.replace(/^#/, '');

  const writeFilters = (patch: {
    q?: string;
    modulo?: string;
    estado?: QuizCatalogStatus;
  }) => {
    navigate(
      buildQuizCatalogPath({
        q: patch.q !== undefined ? patch.q : searchQuery,
        modulo: patch.modulo !== undefined ? patch.modulo : selectedModuleFilter,
        estado: patch.estado !== undefined ? patch.estado : statusFilter,
      }),
      { replace: true },
    );
  };

  // Simulator preview state
  const [simulatorData, setSimulatorData] = useState<{
    isOpen: boolean;
    title: string;
    passScore: number;
    questions: QuizQuestionDraft[];
  }>({
    isOpen: false,
    title: '',
    passScore: 70,
    questions: [],
  });

  useEffect(() => {
    clearQuizCatalogReturn();
  }, []);

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

      if (statusFilter === 'with_quiz' && !hasQuiz) return false;
      if (statusFilter === 'no_quiz' && hasQuiz) return false;
      if (selectedModuleFilter !== 'all' && item.moduleId !== selectedModuleFilter) return false;

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

  useEffect(() => {
    if (!focusedRowId || modulesLoading) return;
    const timer = window.setTimeout(() => {
      document.getElementById(focusedRowId)?.scrollIntoView({ block: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusedRowId, modulesLoading, filteredTopics.length]);

  const totalTopics = allLeafTopics.length;
  const topicsWithQuiz = allLeafTopics.filter((t) => {
    const f = flagsMap.get(t.topic.id);
    return Boolean(f && f.question_count > 0);
  }).length;
  const totalQuestions = flags.reduce((acc, f) => acc + (f.question_count || 0), 0);
  const coveragePercentage = totalTopics > 0 ? Math.round((topicsWithQuiz / totalTopics) * 100) : 0;
  const catalogFilters = {
    q: searchQuery,
    modulo: selectedModuleFilter,
    estado: statusFilter,
  };

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

  const loadingList = (modulesLoading || loadingFlags) && filteredTopics.length === 0;

  return (
    <div className="space-y-6">
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
            Abre el tema o el módulo para leerlo. Al volver, el renglón queda marcado para agregarle el cuestionario.
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

      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <select
            value={selectedModuleFilter}
            onChange={(e) => writeFilters({ modulo: e.target.value })}
            aria-label="Filtrar por módulo"
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
          >
            <option value="all">Todos los Módulos ({modules.length || 13})</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                Módulo {m.number}: {m.title}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => writeFilters({ q: e.target.value })}
              placeholder="Buscar por tema o módulo..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700 sm:flex sm:w-fit">
          <StatusTab
            label={`Todos (${allLeafTopics.length})`}
            active={statusFilter === 'all'}
            onClick={() => writeFilters({ estado: 'all' })}
            activeClass="text-indigo-600 dark:text-indigo-400"
          />
          <StatusTab
            label={`Con Quiz (${topicsWithQuiz})`}
            active={statusFilter === 'with_quiz'}
            onClick={() => writeFilters({ estado: 'with_quiz' })}
            activeClass="text-emerald-600 dark:text-emerald-400"
          />
          <StatusTab
            label={`Sin Quiz (${totalTopics - topicsWithQuiz})`}
            active={statusFilter === 'no_quiz'}
            onClick={() => writeFilters({ estado: 'no_quiz' })}
            activeClass="text-amber-600 dark:text-amber-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <p className="px-4 sm:px-5 py-3 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          Toca el nombre del tema o del módulo para abrirlo. La lista conserva el filtro y marca el renglón al regresar.
        </p>
        {loadingList ? (
          <p className="py-12 text-center text-sm text-slate-400">Cargando temas…</p>
        ) : filteredTopics.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            No se encontraron temas con los filtros aplicados.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTopics.map((item) => {
              const flag = flagsMap.get(item.topic.id);
              const hasQuiz = Boolean(flag && flag.question_count > 0);
              const rowId = quizRowDomId(item.moduleId, item.topic.id);
              return (
                <CatalogTopicRow
                  key={item.listKey}
                  item={item}
                  hasQuiz={hasQuiz}
                  questionCount={flag?.question_count ?? 0}
                  version={flag?.version}
                  passScore={flag?.pass_score ?? 70}
                  focused={focusedRowId === rowId}
                  rowId={rowId}
                  returnTo={buildQuizCatalogPath(catalogFilters, {
                    moduleId: item.moduleId,
                    topicId: item.topic.id,
                  })}
                  onSelectTopic={onSelectTopic}
                  onPreview={() => handleQuickPreview(item.topic.id, item.topic.title)}
                />
              );
            })}
          </ul>
        )}
      </div>

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

function StatusTab({
  label,
  active,
  onClick,
  activeClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition text-center whitespace-nowrap ${
        active
          ? `bg-white dark:bg-slate-900 shadow-xs ${activeClass}`
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function CatalogTopicRow({
  item,
  hasQuiz,
  questionCount,
  version,
  passScore,
  focused,
  rowId,
  returnTo,
  onSelectTopic,
  onPreview,
}: {
  item: CatalogTopic;
  hasQuiz: boolean;
  questionCount: number;
  version?: number;
  passScore: number;
  focused: boolean;
  rowId: string;
  returnTo: string;
  onSelectTopic: (topicId: string, moduleId: string) => void;
  onPreview: () => void;
}) {
  const publicUrl = getTopicPublicUrl(item.moduleId, item.topic.id);
  const openLesson = (event: MouseEvent<HTMLAnchorElement>) => {
    rememberQuizCatalogReturn(returnTo);
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  };

  return (
    <li
      id={rowId}
      className={`scroll-mt-28 px-4 py-4 sm:px-5 ${
        focused
          ? 'bg-indigo-50/80 dark:bg-indigo-950/30 ring-2 ring-inset ring-indigo-400/70'
          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
            {item.moduleNumber}
          </span>
          <div className="min-w-0">
            {focused && (
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300 mb-1">
                Continúa aquí
              </p>
            )}
            {publicUrl ? (
              <Link
                to={publicUrl}
                state={{ from: returnTo }}
                onClick={openLesson}
                className="group inline-flex items-start gap-1 text-left font-bold text-slate-900 dark:text-white leading-snug hover:text-indigo-600 dark:hover:text-indigo-300"
              >
                <span className="underline-offset-2 group-hover:underline">{item.topic.title}</span>
                <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-slate-400 group-hover:text-indigo-500" />
              </Link>
            ) : (
              <p className="font-bold text-slate-900 dark:text-white leading-snug">{item.topic.title}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <Link
                to={`/modulo/${item.moduleId}`}
                state={{ from: returnTo }}
                onClick={openLesson}
                className="hover:text-indigo-500 hover:underline underline-offset-2"
              >
                Módulo {item.moduleNumber}: {item.moduleTitle}
              </Link>
              <span aria-hidden="true">·</span>
              <code className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {item.topic.id}
              </code>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end lg:shrink-0">
          {hasQuiz ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Activo {version ? `(v${version})` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 w-fit">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Sin Cuestionario
            </span>
          )}
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {hasQuiz ? `${questionCount} reactivos` : '0 reactivos'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hasQuiz ? `Mín. ${passScore}%` : 'Sin mínimo'}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {hasQuiz && (
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                title="Probar simulador de alumno"
              >
                <Eye className="w-3.5 h-3.5" />
                Simular
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectTopic(item.topic.id, item.moduleId)}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {hasQuiz ? 'Editar cuestionario' : 'Agregar cuestionario'}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
