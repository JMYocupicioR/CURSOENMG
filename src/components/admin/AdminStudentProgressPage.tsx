import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { AssignmentMaterialsList } from '../student/AssignmentMaterialsList';
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  FileText,
  Send,
  Plus,
  Target,
  ExternalLink,
  Edit3,
  Save,
  Check,
  Search,
  Filter,
  Shield,
  Stethoscope,
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Circle,
  TrendingUp,
  UserCheck,
  HelpCircle,
  BarChart3,
  Layers,
  Phone,
  Linkedin,
  FileCheck,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import AssignExamModal from './AssignExamModal';
import AssignHomeworkModal from './AssignHomeworkModal';
import { AssignClinicalCaseModal } from './AssignClinicalCaseModal';
import { useAuth } from '../../contexts/AuthProvider';
import {
  getStudentFullDossier,
  getDetailedExamBreakdown,
  createLearningPlan,
  updateLearningPlan,
  deleteLearningPlan,
  createAssignment,
  gradeAssignment,
  deleteAssignment,
  saveAdminStudentNotes,
  approveExamRetake,
  rejectExamRetake,
} from '../../services/studentPlanService';
import { isAppendixModule } from '../../content/appendixModules';
import { allModules } from '../../content/modules';
import { getAllTopicIds } from '../../services/studentService';
import { getModuleLabel, getTopicPublicUrl } from '../../utils/adminUtils';
import type { Topic, Module } from '../../types/content';
import type {
  StudentFullDossier,
  StudentExamDetail,
  AssignmentType,
  AssignmentPriority,
  StudentAssignment,
} from '../../types/studentPlan';
import StudentKardexModal from './StudentKardexModal';

type Tab = 'summary' | 'exams' | 'domains' | 'activity' | 'dossier' | 'plans';

// ─── Subcomponents for Granular Topic & Subtopic Progress Breakdown ─────────

interface TopicItemRowProps {
  topic: Topic;
  moduleId: string;
  depth?: number;
  completedTopicSet: Set<string>;
  filter: 'all' | 'completed' | 'pending';
  searchQuery: string;
  onAssignTopic: (topicTitle: string, moduleId: string, topicId: string) => void;
  parentCompleted?: boolean;
}

function TopicItemRow({
  topic,
  moduleId,
  depth = 0,
  completedTopicSet,
  filter,
  searchQuery,
  onAssignTopic,
  parentCompleted = false,
}: TopicItemRowProps) {
  const isLeaf = !topic.children || topic.children.length === 0;
  const consultation = isAppendixModule(moduleId);
  const isCompleted = !consultation && (completedTopicSet.has(topic.id) || parentCompleted);

  const allLeafIds = useMemo(() => (isLeaf ? [topic.id] : getAllTopicIds(topic.children || [])), [topic, isLeaf]);
  const leafCount = isLeaf ? 1 : allLeafIds.length;
  const completedLeafCount = isLeaf
    ? isCompleted
      ? 1
      : 0
    : allLeafIds.filter((id) => completedTopicSet.has(id) || isCompleted).length;
  const isSectionComplete = !isLeaf && (completedLeafCount === leafCount || isCompleted) && leafCount > 0;
  const isSectionPartial = !isLeaf && completedLeafCount > 0 && !isSectionComplete;

  // Filter check
  const searchMatch =
    !searchQuery.trim() ||
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (!isLeaf && topic.children?.some((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())));

  if (!searchMatch) return null;

  if (!consultation && filter === 'completed') {
    if (isLeaf && !isCompleted) return null;
    if (!isLeaf && completedLeafCount === 0 && !isCompleted) return null;
  } else if (!consultation && filter === 'pending') {
    if (isLeaf && isCompleted) return null;
    if (!isLeaf && isSectionComplete) return null;
  }

  const topicUrl = getTopicPublicUrl(moduleId, topic.id);

  if (!isLeaf) {
    return (
      <div
        className={`space-y-1.5 ${
          depth > 0
            ? 'ml-3 sm:ml-5 border-l-2 border-slate-200/80 dark:border-slate-800 pl-3 sm:pl-4'
            : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {topic.title}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ({leafCount} {leafCount === 1 ? 'lección' : 'lecciones'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {consultation ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Consulta
              </span>
            ) : isSectionComplete ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Sección Completa ({completedLeafCount}/{leafCount})
              </span>
            ) : isSectionPartial ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                <Clock className="w-3 h-3" />
                En progreso ({completedLeafCount}/{leafCount})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                Pendiente (0/{leafCount})
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {topic.children?.map((child) => (
            <TopicItemRow
              key={child.id}
              topic={child}
              moduleId={moduleId}
              depth={depth + 1}
              completedTopicSet={completedTopicSet}
              filter={filter}
              searchQuery={searchQuery}
              onAssignTopic={onAssignTopic}
              parentCompleted={isCompleted || isSectionComplete}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
        depth > 0 ? 'ml-2 sm:ml-4' : ''
      } ${
        isCompleted
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/70 shadow-2xs'
          : 'bg-white/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {isCompleted ? (
          <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        ) : (
          <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
            <Circle className="w-3.5 h-3.5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-xs font-semibold ${
                isCompleted
                  ? 'text-emerald-950 dark:text-emerald-200 font-bold'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {topic.title}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {topic.id}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            consultation
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              : isCompleted
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {consultation ? (
            'Consulta'
          ) : isCompleted ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Leído / Completado
            </>
          ) : (
            'Pendiente'
          )}
        </span>

        {topicUrl && (
          <a
            href={topicUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir lección en nueva pestaña"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <button
          type="button"
          onClick={() => onAssignTopic(topic.title, moduleId, topic.id)}
          title="Asignar tarea específica sobre este tema"
          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden md:inline">Tarea</span>
        </button>
      </div>
    </div>
  );
}

interface ModuleTopicsBreakdownProps {
  module: Module;
  completedTopicSet: Set<string>;
  filter: 'all' | 'completed' | 'pending';
  searchQuery: string;
  onFilterChange: (filter: 'all' | 'completed' | 'pending') => void;
  onSearchChange: (query: string) => void;
  onAssignTopic: (topicTitle: string, moduleId: string, topicId: string) => void;
}

function ModuleTopicsBreakdown({
  module,
  completedTopicSet,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onAssignTopic,
}: ModuleTopicsBreakdownProps) {
  const allLeafIds = useMemo(() => getAllTopicIds(module.topics), [module]);
  const totalCount = allLeafIds.length;
  const completedCount = useMemo(
    () => allLeafIds.filter((id) => completedTopicSet.has(id)).length,
    [allLeafIds, completedTopicSet]
  );
  const pendingCount = Math.max(0, totalCount - completedCount);
  const consultation = isAppendixModule(module.id);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
      {/* Subtopics Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-850/70 border border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Todos ({totalCount})
            </button>
            {!consultation && (
            <>
            <button
              type="button"
              onClick={() => onFilterChange('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                filter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completados ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'pending'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            </>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-60"
          />
        </div>
      </div>

      {/* Topics list */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filter === 'completed' && completedCount === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-850/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              El alumno aún no ha marcado subtemas completados en este módulo.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Puedes asignarle una tarea o lectura para orientar su estudio.
            </p>
          </div>
        ) : (
          module.topics.map((t) => (
            <TopicItemRow
              key={t.id}
              topic={t}
              moduleId={module.id}
              completedTopicSet={completedTopicSet}
              filter={filter}
              searchQuery={searchQuery}
              onAssignTopic={onAssignTopic}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminStudentProgressPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();

  const [dossier, setDossier] = useState<StudentFullDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [showKardexModal, setShowKardexModal] = useState(false);

  // Exam Detail state (Question by question breakdown)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [examDetail, setExamDetail] = useState<StudentExamDetail | null>(null);
  const [loadingExamDetail, setLoadingExamDetail] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'errors' | 'correct'>('all');

  // Admin Notes state
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // New Plan Modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanModules, setNewPlanModules] = useState<string[]>([]);
  const [newPlanTargetDate, setNewPlanTargetDate] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // New Assignment Modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showAssignCaseModal, setShowAssignCaseModal] = useState(false);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgType, setAsgType] = useState<AssignmentType>('exam');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgModuleId, setAsgModuleId] = useState('');
  const [asgTopicId, setAsgTopicId] = useState('');
  const [asgDueDate, setAsgDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [asgPriority, setAsgPriority] = useState<AssignmentPriority>('normal');
  const [asgMinScore, setAsgMinScore] = useState(70);
  const [savingAsg, setSavingAsg] = useState(false);

  // Grade Assignment Modal state
  const [gradingTarget, setGradingTarget] = useState<StudentAssignment | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Module & Subtopics Breakdown state
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set());
  const [moduleFilters, setModuleFilters] = useState<Record<string, 'all' | 'completed' | 'pending'>>({});
  const [moduleSearches, setModuleSearches] = useState<Record<string, string>>({});
  const [globalTopicFilter, setGlobalTopicFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const completedTopicSet = useMemo(() => {
    return new Set(dossier?.completedTopicIds || []);
  }, [dossier?.completedTopicIds]);

  // Automatically expand modules that have completed topics when dossier loads
  useEffect(() => {
    if (dossier?.completedTopicIds && dossier.completedTopicIds.length > 0) {
      const doneSet = new Set(dossier.completedTopicIds);
      const modsWithProgress = allModules
        .filter((m) => getAllTopicIds(m.topics).some((tid) => doneSet.has(tid)))
        .map((m) => m.id);
      if (modsWithProgress.length > 0) {
        setExpandedModuleIds(new Set(modsWithProgress));
      }
    }
  }, [dossier]);

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleToggleAllModules = () => {
    if (expandedModuleIds.size === allModules.length) {
      setExpandedModuleIds(new Set());
    } else {
      setExpandedModuleIds(new Set(allModules.map((m) => m.id)));
    }
  };

  const handleQuickAssignTopic = (topicTitle: string, moduleId: string, topicId: string) => {
    setAsgTitle(`Lectura / Tarea: ${topicTitle}`);
    setAsgType('reading');
    setAsgDesc(`Revisar a profundidad y dominar el subtema ${topicTitle} (${topicId}) del Módulo ${moduleId}.`);
    setAsgModuleId(moduleId);
    setAsgTopicId(topicTitle);
    setAsgPriority('normal');
    setShowAssignmentModal(true);
    setActiveTab('plans');
  };

  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentFullDossier(studentId);
      setDossier(data);
      setAdminNotes(data.profile.admin_notes || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el expediente del alumno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  // When selecting an attempt, load detailed question-by-question breakdown
  const handleSelectAttempt = async (attemptId: string) => {
    if (!dossier) return;
    setSelectedAttemptId(attemptId);
    const attempt = dossier.quizAttempts.find((a) => a.id === attemptId);
    if (!attempt) return;

    setLoadingExamDetail(true);
    try {
      const detail = await getDetailedExamBreakdown(attempt);
      setExamDetail(detail);
    } catch (e) {
      console.error('Error loading exam breakdown:', e);
    } finally {
      setLoadingExamDetail(false);
    }
  };

  // Save Admin Notes
  const handleSaveNotes = async () => {
    if (!studentId) return;
    setSavingNotes(true);
    try {
      await saveAdminStudentNotes(studentId, adminNotes);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2500);
    } catch (e) {
      alert('Error al guardar notas confidenciales');
    } finally {
      setSavingNotes(false);
    }
  };

  // Submit New Learning Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !newPlanTitle.trim()) return;
    setSavingPlan(true);
    try {
      await createLearningPlan(studentId, {
        title: newPlanTitle,
        description: newPlanDesc,
        priority_modules: newPlanModules,
        target_date: newPlanTargetDate ? new Date(newPlanTargetDate).toISOString() : null,
      });
      setShowPlanModal(false);
      setNewPlanTitle('');
      setNewPlanDesc('');
      setNewPlanModules([]);
      setNewPlanTargetDate('');
      await loadData();
    } catch (e) {
      alert('Error al crear plan de estudio');
    } finally {
      setSavingPlan(false);
    }
  };

  // Submit New Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !asgTitle.trim() || !asgDueDate) return;
    setSavingAsg(true);
    try {
      await createAssignment({
        student_id: studentId,
        title: asgTitle,
        type: asgType,
        description: asgDesc,
        target_module_id: asgModuleId || null,
        target_topic_id: asgTopicId || null,
        due_date: new Date(asgDueDate).toISOString(),
        priority: asgPriority,
        min_score: asgMinScore,
        status: 'pending',
      });
      setShowAssignmentModal(false);
      setAsgTitle('');
      setAsgDesc('');
      setAsgModuleId('');
      setAsgTopicId('');
      await loadData();
    } catch (e) {
      alert('Error al crear asignación calendarizada');
    } finally {
      setSavingAsg(false);
    }
  };

  // Grade Assignment
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingTarget || !studentId) return;
    setSavingGrade(true);
    try {
      await gradeAssignment(gradingTarget.id, studentId, gradeInput, feedbackInput, user?.id);
      setGradingTarget(null);
      await loadData();
    } catch (e) {
      alert('Error al asentar calificación');
    } finally {
      setSavingGrade(false);
    }
  };

  // Pre-fill assignment from weak domain
  const handleQuickAssignOpportunity = (topicName: string, moduleId: string) => {
    setAsgTitle(`Refuerzo Clínico: ${topicName}`);
    setAsgType('exam');
    setAsgDesc(`Examen focalizado para superar las brechas identificadas en ${topicName} (Módulo ${moduleId}).`);
    setAsgModuleId(moduleId);
    setAsgTopicId(topicName);
    setAsgPriority('high');
    setShowAssignmentModal(true);
    setActiveTab('plans');
  };

  if (loading) {
    return (
      <AdminLayout title="Cargando expediente del alumno...">
        <div className="py-24 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">
            Compilando métricas curriculares, exámenes y actividad del alumno...
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !dossier) {
    return (
      <AdminLayout title="Expediente no disponible">
        <div className="py-16 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {error || 'No se encontró la información del alumno'}
          </h2>
          <BackButton
            fallback="/admin/alumnos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium cursor-pointer"
          />
        </div>
      </AdminLayout>
    );
  }

  const { profile, metrics, streakInfo, domainAssessment, learningPlans, assignments } = dossier;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <BackButton
            fallback="/admin/alumnos"
            iconClassName="w-3.5 h-3.5"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          />

          <div className="flex items-center gap-3">
            <Link
              to={`/admin/usuarios/${profile.id}/perfil`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-xs font-semibold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar perfil</span>
            </Link>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Recargar progreso y expediente en tiempo real"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar datos</span>
            </button>

            <span className="text-xs text-slate-400 hidden sm:inline">ID del Alumno:</span>
            <code className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {profile.id.slice(0, 8)}…
            </code>
          </div>
        </div>

        {/* ─── Hero Student Dossier Card ─── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Student Info */}
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 flex items-center justify-center text-white text-2xl font-black shadow-md overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile.display_name?.slice(0, 2).toUpperCase() || 'AL'
                  )}
                </div>
                {profile.cedula_verified && (
                  <div
                    className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-900 rounded-full shadow-xs"
                    title="Cédula verificada SEP"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {profile.display_name}
                  </h1>
                  {profile.residency_year && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {profile.residency_year}
                    </span>
                  )}
                  {profile.enrollment_status === 'approved' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Acceso Activo COMEFYR
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      En espera
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{profile.specialty || 'Medicina de Rehabilitación'}</span>
                  {profile.institution && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {profile.institution}
                    </span>
                  )}
                  {profile.cedula_profesional && (
                    <span>
                      Cédula:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {profile.cedula_profesional}
                      </strong>
                    </span>
                  )}
                </div>

                {profile.credentials && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {profile.credentials}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar in Hero */}
            <div className="flex items-center gap-3 sm:gap-6 bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-center px-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Avance Global
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {metrics.overallProgressPct}%
                </span>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center px-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Promedio
                </span>
                <span
                  className={`text-2xl font-black ${
                    metrics.averageScore >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : metrics.averageScore >= 70
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {metrics.averageScore}%
                </span>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center px-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block flex items-center justify-center gap-0.5">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500" /> Racha
                </span>
                <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                  {streakInfo.currentStreak} <span className="text-xs font-semibold text-slate-400">días</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Elegibilidad de Certificación:
              </span>
              {metrics.isCertificationEligible ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                  <Award className="w-3.5 h-3.5" /> Cumple Requisitos COMEFYR ({metrics.certificateFolio})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> En proceso ({metrics.completedTopicsCount}/{metrics.totalCurriculumTopics} temas)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowKardexModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kardex Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAssignmentModal(true);
                  setActiveTab('plans');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Asignar Tarea o Examen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPlanModal(true);
                  setActiveTab('plans');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Crear Plan de Estudio</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Navigation Tabs ─── */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
          {[
            { id: 'summary', label: 'Resumen & Avance', icon: BarChart3 },
            { id: 'exams', label: `Exámenes (${dossier.quizAttempts.length})`, icon: GraduationCap },
            { id: 'domains', label: 'Áreas de Oportunidad', icon: Target },
            { id: 'activity', label: 'Logins & Racha', icon: Flame },
            { id: 'dossier', label: 'Expediente & CV', icon: FileText },
            { id: 'plans', label: `Planes & Tareas (${assignments.length})`, icon: Calendar },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as Tab)}
                className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: RESUMEN Y AVANCE CURRICULAR ─── */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Temas Completados
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {metrics.completedTopicsCount}
                  </span>
                  <span className="text-xs text-slate-400">de {metrics.totalCurriculumTopics} totales</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    style={{ width: `${metrics.overallProgressPct}%` }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Créditos COMEFYR (CME)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {metrics.cmeCreditsEarned}
                  </span>
                  <span className="text-xs text-slate-400">de {metrics.maxCmeCredits} pts</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {metrics.academicHoursEarned} de {metrics.maxAcademicHours} horas académicas oficiales
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Quizzes Aprobados
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {metrics.quizzesPassedCount}
                  </span>
                  <span className="text-xs text-slate-400">
                    de {metrics.quizzesAttemptedCount} presentados
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tasa de aprobación: {metrics.quizzesAttemptedCount > 0 ? Math.round((metrics.quizzesPassedCount / metrics.quizzesAttemptedCount) * 100) : 0}%
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Tareas y Asignaciones
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                    {assignments.filter((a) => a.status === 'approved').length}
                  </span>
                  <span className="text-xs text-slate-400">
                    de {assignments.length} asignadas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {assignments.filter((a) => a.status === 'pending').length} pendientes de entrega
                </p>
              </div>
            </div>

            {/* Módulo por Módulo Breakdown con Desglose de Subtemas */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    Avance Curricular por Módulo (13 Módulos COMEFYR)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seguimiento detallado de lectura y evaluaciones por unidad temática y subtemas clínicos
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setGlobalTopicFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        globalTopicFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Todos ({dossier.metrics.totalCurriculumTopics})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalTopicFilter('completed')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        globalTopicFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completados ({dossier.metrics.completedTopicsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalTopicFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        globalTopicFilter === 'pending'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Pendientes ({dossier.metrics.totalCurriculumTopics - dossier.metrics.completedTopicsCount})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAllModules}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {expandedModuleIds.size === allModules.length ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Contraer todos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Expandir todos
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {allModules.map((m) => {
                  const modProg = dossier.moduleProgress.find((p) => p.moduleId === m.id);
                  const modStat = dossier.moduleStats?.find((s) => s.moduleId === m.id);
                  const totalTopics = modStat?.totalTopics ?? getAllTopicIds(m.topics).length;
                  const completedTopics = modStat?.completedTopics ?? 0;
                  const progressPct = modStat?.progressPct ?? (totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0);
                  const quizAttempted = (modProg?.quizzesAttempted ?? 0) > 0;
                  const quizPassed = modProg?.bestScores?.some((s) => s.passed) ?? false;
                  const avgScore = modProg?.averageScore ?? null;
                  const isExpanded = expandedModuleIds.has(m.id);
                  const filter = moduleFilters[m.id] || globalTopicFilter;
                  const searchQuery = moduleSearches[m.id] || '';

                  // If global filter is 'completed' and this module has 0 completed topics, optionally don't render or deemphasize
                  const consultation = isAppendixModule(m.id);
                  if (consultation && globalTopicFilter !== 'all') return null;
                  if (globalTopicFilter === 'completed' && completedTopics === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={m.id}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? 'border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/15 dark:bg-indigo-950/10 p-4 shadow-xs'
                          : 'border-slate-200/70 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-850/40'
                      }`}
                    >
                      {/* Module Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div
                          onClick={() => toggleModuleExpanded(m.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer select-none group"
                        >
                          <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {m.emoji || '📖'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                                Módulo {m.number}: {m.title}
                              </p>
                              {completedTopics > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                                  {progressPct}%
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <p className="text-xs text-slate-400">
                                {consultation ? (
                                  'Material de consulta. No entra en el avance del alumno.'
                                ) : (
                                  <>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{completedTopics}</span> de {totalTopics} temas leídos · Quizzes: {modProg?.quizzesAvailable ?? 0}
                                  </>
                                )}
                              </p>
                              {!consultation && (
                              <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden hidden md:block">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons on right */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {quizAttempted ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                quizPassed
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {quizPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              Score: {avgScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic hidden md:inline">Sin evaluar</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleQuickAssignOpportunity(m.title, m.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                          >
                            Asignar Tarea
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleModuleExpanded(m.id)}
                            className={`p-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                              isExpanded
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                            title={isExpanded ? 'Ocultar subtemas' : 'Ver desglose de subtemas'}
                          >
                            <span className="hidden sm:inline">
                              {isExpanded ? 'Ocultar' : `Subtemas (${totalTopics})`}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Subtopics breakdown (when expanded) */}
                      {isExpanded && (
                        <ModuleTopicsBreakdown
                          module={m}
                          completedTopicSet={completedTopicSet}
                          filter={filter}
                          searchQuery={searchQuery}
                          onFilterChange={(newF) => setModuleFilters((prev) => ({ ...prev, [m.id]: newF }))}
                          onSearchChange={(newQ) => setModuleSearches((prev) => ({ ...prev, [m.id]: newQ }))}
                          onAssignTopic={handleQuickAssignTopic}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: EXÁMENES & ACIERTOS Y ERRORES ─── */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: List of Quiz Attempts */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Historial de Evaluaciones
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecciona un examen para ver aciertos y errores detallados
                  </p>
                </div>

                {dossier.quizAttempts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center italic">
                    El alumno aún no ha respondido cuestionarios evaluativos.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {dossier.quizAttempts.map((att) => {
                      const isSelected = selectedAttemptId === att.id;
                      return (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => handleSelectAttempt(att.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                                att.passed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {att.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {att.score}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(att.completed_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {att.topic_id}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {getModuleLabel(att.module_id)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Question by Question Breakdown */}
              <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-6 space-y-5">
                {!selectedAttemptId ? (
                  <div className="py-24 text-center space-y-3">
                    <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Ningún examen seleccionado
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Haz clic en cualquiera de las evaluaciones del historial izquierdo para auditar las respuestas del alumno pregunta a pregunta.
                    </p>
                  </div>
                ) : loadingExamDetail ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Cargando desglose de preguntas...</p>
                  </div>
                ) : examDetail ? (
                  <div className="space-y-5">
                    {/* Exam Overview Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {examDetail.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Total: {examDetail.totalQuestions} preguntas ·{' '}
                          <strong className="text-emerald-600">{examDetail.correctCount} aciertos</strong> ·{' '}
                          <strong className="text-red-500">{examDetail.incorrectCount} errores</strong>
                        </p>
                      </div>

                      {/* Filter Toggles */}
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <button
                          type="button"
                          onClick={() => setQuestionFilter('all')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                            questionFilter === 'all'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          Todas ({examDetail.totalQuestions})
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionFilter('errors')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                            questionFilter === 'errors'
                              ? 'bg-red-600 text-white'
                              : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                          }`}
                        >
                          Solo Errores ({examDetail.incorrectCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionFilter('correct')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                            questionFilter === 'correct'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          Aciertos ({examDetail.correctCount})
                        </button>
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                      {examDetail.questions
                        .filter((q) => {
                          if (questionFilter === 'errors') return !q.isCorrect;
                          if (questionFilter === 'correct') return q.isCorrect;
                          return true;
                        })
                        .map((q, qIndex) => {
                          return (
                            <div
                              key={q.questionId || qIndex}
                              className={`p-4 rounded-2xl border transition ${
                                q.isCorrect
                                  ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                                  : 'bg-red-50/30 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      q.isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-red-600 text-white'
                                    }`}
                                  >
                                    {qIndex + 1}
                                  </span>
                                  <span
                                    className={`text-xs font-bold uppercase tracking-wide ${
                                      q.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                                    }`}
                                  >
                                    {q.isCorrect ? 'Acierto' : 'Error en respuesta'}
                                  </span>
                                </div>

                                {q.isCritical && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300">
                                    <Sparkles className="w-3 h-3" /> Pregunta Crítica COMEFYR
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                                {q.stem}
                              </p>

                              {/* Student vs Correct Answer */}
                              <div className="space-y-1.5 text-xs">
                                <div
                                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                    q.isCorrect
                                      ? 'bg-emerald-100/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                      : 'bg-red-100/60 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {q.isCorrect ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    <span className="font-bold">Respuesta del alumno:</span>{' '}
                                    {q.selectedOptionText}
                                  </div>
                                </div>

                                {!q.isCorrect && (
                                  <div className="p-2.5 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold">Respuesta correcta esperada:</span>{' '}
                                      {q.correctOptionText}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Explanation & Pearl */}
                              {(q.explanation || q.pearl) && (
                                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
                                  {q.explanation && (
                                    <p className="text-slate-600 dark:text-slate-300">
                                      <strong className="text-indigo-600 dark:text-indigo-400">
                                        Justificación pedagógica:
                                      </strong>{' '}
                                      {q.explanation}
                                    </p>
                                  )}
                                  {q.pearl && (
                                    <p className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px]">
                                      ⭐ <strong>Perla COMEFYR:</strong> {q.pearl}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: ÁREAS DE OPORTUNIDAD & DOMINIOS ─── */}
        {activeTab === 'domains' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Áreas Bien Dominadas */}
              <div className="rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Áreas Bien Dominadas (Maestría &ge;80%)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Temas donde el alumno ha demostrado comprensión y retención sobresaliente
                    </p>
                  </div>
                </div>

                {domainAssessment.masteredTopics.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    Aún no se registran temas con precisión mayor a 80%.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {domainAssessment.masteredTopics.map((item, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.topicName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.moduleId} · {item.totalAttempts} intentos registrados
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {item.accuracyPct}% Acierto
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Áreas de Oportunidad */}
              <div className="rounded-3xl border border-red-200/80 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-red-500 text-white shadow-xs">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Áreas de Oportunidad Críticas (&lt;70%)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Temas con mayor tasa de error o fallas en preguntas prioritarias del Consejo
                    </p>
                  </div>
                </div>

                {domainAssessment.opportunityTopics.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    Excelente: No hay brechas críticas registradas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {domainAssessment.opportunityTopics.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-red-200/60 dark:border-red-800/40 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.topicName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.moduleId} · {item.criticalFailures} fallas críticas
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                            {item.accuracyPct}% Acierto
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          💡 <strong>Recomendación:</strong> {item.recommendedActions}
                        </p>

                        <button
                          type="button"
                          onClick={() => handleQuickAssignOpportunity(item.topicName, item.moduleId)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Asignar Tarea de Refuerzo Calendarizada</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: LOGINS & RACHA DE PARTICIPACIÓN ─── */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Streak Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/20 space-y-1">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-orange-500" /> Racha Actual
                </span>
                <span className="text-3xl font-black text-orange-700 dark:text-orange-300">
                  {streakInfo.currentStreak} días
                </span>
                <p className="text-xs text-orange-800/70 dark:text-orange-400/80">
                  Días continuos con actividad de estudio
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Récord Histórico
                </span>
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {streakInfo.longestStreak} días
                </span>
                <p className="text-xs text-slate-400">Mejor racha alcanzada</p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Días Activos Totales
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {streakInfo.totalActiveDays}
                </span>
                <p className="text-xs text-slate-400">Días diferentes con sesiones</p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Total de Inicios de Sesión
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {streakInfo.totalSessions}
                </span>
                <p className="text-xs text-slate-400">Logins registrados</p>
              </div>
            </div>

            {/* 30-Day Activity Calendar Grid */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mapa de Actividad (Últimos 30 días)
                </h3>
                <p className="text-xs text-slate-400">
                  Consistencia de participación y estudio en la plataforma
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({ length: 30 }).map((_, i) => {
                  const d = new Date(Date.now() - (29 - i) * 86400000);
                  const dateStr = d.toISOString().slice(0, 10);
                  const isActive = streakInfo.activeDatesLast30Days.includes(dateStr);

                  return (
                    <div
                      key={dateStr}
                      className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold border transition ${
                        isActive
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                      title={`${dateStr}: ${isActive ? 'Activo' : 'Sin actividad'}`}
                    >
                      <span>{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chronological Activity Logs */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bitácora Cronológica de Actividad
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dossier.activityLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.action === 'user_login'
                          ? 'Inicio de sesión en la plataforma'
                          : log.action === 'topic_completed'
                          ? 'Tema completado y verificado'
                          : log.action === 'quiz_submitted'
                          ? 'Evaluación respondida'
                          : log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {new Date(log.created_at).toLocaleString('es-MX')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: EXPEDIENTE & CURRÍCULUM MÉDICO ─── */}
        {activeTab === 'dossier' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Academic Credentials */}
              <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Expediente Académico y Acreditación COMEFYR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Datos profesionales auditados para emisión de diploma con valor curricular
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Cédula Profesional General (SEP)
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.cedula_profesional || 'No registrada'}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        profile.cedula_verified
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {profile.cedula_verified ? 'Verificada SEP oficial' : 'Pendiente de validación'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Cédula de Especialidad
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.specialty_cedula || 'En formación / No registrada'}
                    </p>
                    <span className="text-[10px] text-slate-400">Especialidad médica avalada</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Sede Hospitalaria Actual
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.institution || 'No especificada'}
                    </p>
                    <span className="text-[10px] text-slate-400">Hospital o centro de adscripción</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Universidad de Egreso / Posgrado
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.academic_institution || 'No especificada'}
                    </p>
                    <span className="text-[10px] text-slate-400">Institución universitaria</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Subespecialidad / Fellowships
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.subspecialty || 'Electrodiagnóstico y EMG'}
                    </p>
                    <span className="text-[10px] text-slate-400">Alta especialidad de enfoque</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Certificación Consejo CMMR
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.cmmr_certified ? 'Certificado Vigente' : 'En formación o trámite'}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {profile.cmmr_number ? `Folio: ${profile.cmmr_number}` : 'CMMR México'}
                    </span>
                  </div>
                </div>

                {/* Bio / Curriculum Summary */}
                {profile.bio && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Semblanza Curricular Médica
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                      {profile.bio}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Confidential Admin Notes */}
              <div className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Notas Docentes Confidenciales
                  </h3>
                </div>

                <p className="text-xs text-slate-500">
                  Anotaciones privadas visibles únicamente para directores y profesores sobre el desempeño y tutoría del alumno.
                </p>

                <textarea
                  rows={8}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Escribe observaciones académicas sobre el alumno, casos evaluados, pendientes o acuerdos tutoriales..."
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
                />

                <div className="flex items-center justify-between">
                  {notesSavedSuccess ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold">
                      <Check className="w-4 h-4" /> Guardado con éxito
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Auto-sincronizado</span>
                  )}

                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingNotes ? 'Guardando...' : 'Guardar Notas'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: PLANES PERSONALIZADOS & TAREAS CALENDARIZADAS ─── */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Planes de Estudio y Asignaciones Calendarizadas
                </h3>
                <p className="text-xs text-slate-500">
                  Envía tareas, reportes de casos o exámenes a la cuenta del alumno con fechas límites de entrega
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nueva Tarea / Examen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHomeworkModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nueva tarea</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAssignCaseModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>+ Asignar Caso EMG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>+ Nuevo Plan</span>
                </button>
              </div>
            </div>

            {/* Active Plans Section */}
            {learningPlans.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Planes de Aprendizaje Activos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {learningPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                            {plan.title}
                          </h5>
                          {plan.target_date && (
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> Meta:{' '}
                              {new Date(plan.target_date).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {plan.status === 'active' ? 'En curso' : plan.status}
                        </span>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {plan.description}
                        </p>
                      )}

                      {plan.priority_modules.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {plan.priority_modules.map((pm, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300"
                            >
                              {pm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments List */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Tareas y Exámenes Asignados al Alumno
              </h4>

              {assignments.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Aún no se han calendarizado tareas o exámenes para este alumno.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((asg) => {
                    const isOverdue = new Date(asg.due_date).getTime() < Date.now() && asg.status === 'pending';

                    return (
                      <div
                        key={asg.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                asg.type === 'exam'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : asg.type === 'clinical_case'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {asg.type === 'exam'
                                ? 'Examen Asignado'
                                : asg.type === 'clinical_case'
                                ? 'Caso Clínico'
                                : asg.type === 'emg_report'
                                ? 'Reporte EMG'
                                : 'Tarea'}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                asg.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : asg.status === 'submitted'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  : isOverdue
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {asg.status === 'approved'
                                ? 'Aprobada'
                                : asg.status === 'submitted'
                                ? 'Entregada (Revisar)'
                                : isOverdue
                                ? 'Vencida'
                                : 'Pendiente'}
                            </span>

                            {asg.type === 'exam' && asg.target_exam_config?.maxAttempts !== undefined && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <RotateCcw className="w-3 h-3 text-indigo-500" />
                                Intentos: {asg.target_exam_config.attemptsCount || 0} / {asg.target_exam_config.maxAttempts === 0 ? '∞' : asg.target_exam_config.maxAttempts}
                              </span>
                            )}

                            {asg.target_exam_config?.retakeStatus === 'requested' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white animate-pulse">
                                Reintento Solicitado
                              </span>
                            )}

                            {asg.priority === 'urgent' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
                                Urgente
                              </span>
                            )}
                          </div>

                          <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                            {asg.title}
                          </h5>

                          <p className="text-xs text-slate-500 max-w-xl">
                            {asg.description}
                          </p>
                          <AssignmentMaterialsList materials={asg.materials} />

                          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Entrega calendarizada:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {new Date(asg.due_date).toLocaleString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>
                          </p>

                          {/* Student Submission & Feedback display */}
                          {asg.student_notes && (
                            <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 text-xs">
                              <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                                Entrega del alumno:
                              </span>
                              <p className="text-slate-600 dark:text-slate-300">{asg.student_notes}</p>
                            </div>
                          )}

                          {asg.grade != null && (
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="font-bold text-emerald-600">Calificación: {asg.grade}/100</span>
                              {asg.feedback && (
                                <span className="text-slate-500 italic">· "{asg.feedback}"</span>
                              )}
                            </div>
                          )}

                          {/* Tarjeta de Solicitud de Reintento por el Alumno */}
                          {asg.target_exam_config?.retakeStatus === 'requested' && (
                            <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  Solicitud de Permiso para Reintentar Examen
                                </span>
                                <span className="text-[10px] text-amber-700 dark:text-amber-300">
                                  {asg.target_exam_config.retakeRequestedAt
                                    ? new Date(asg.target_exam_config.retakeRequestedAt).toLocaleString('es-MX', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Pendiente'}
                                </span>
                              </div>

                              {asg.target_exam_config.retakeReason && (
                                <p className="text-slate-700 dark:text-slate-200 italic pl-3 border-l-2 border-amber-500 text-xs">
                                  "{asg.target_exam_config.retakeReason}"
                                </p>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`¿Aprobar 1 reintento adicional para "${asg.title}"?`)) {
                                      await approveExamRetake(asg.id, studentId!, user?.id, 1);
                                      loadData();
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Aprobar Reintento
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = prompt('Motivo del rechazo (opcional):', 'Intentos reglamentarios agotados.');
                                    if (reason !== null) {
                                      await rejectExamRetake(asg.id, studentId!, user?.id, reason);
                                      loadData();
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                                >
                                  Rechazar
                                </button>
                              </div>
                            </div>
                          )}

                          {asg.target_exam_config?.retakeStatus === 'approved' && (
                            <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Reintento autorizado por el profesor ({asg.target_exam_config.retakeReviewedBy || 'Docente'}).
                            </div>
                          )}

                          {asg.target_exam_config?.retakeStatus === 'rejected' && (
                            <div className="mt-2 text-[11px] text-red-500 font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              Reintento denegado ({asg.target_exam_config.retakeReviewNotes || 'No autorizado'}).
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          {asg.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() => {
                                setGradingTarget(asg);
                                setGradeInput(asg.grade ?? 85);
                                setFeedbackInput(asg.feedback ?? '');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                            >
                              Evaluar y Calificar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Eliminar asignación "${asg.title}"?`)) {
                                deleteAssignment(asg.id, studentId!).then(loadData);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 text-xs font-medium hover:bg-red-50 transition cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: NUEVA ASIGNACIÓN / EXAMEN AVANZADO ─── */}
      <AssignExamModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        initialStudentId={studentId}
        initialStudentName={dossier?.profile.display_name}
        onAssigned={loadData}
      />

      <AssignHomeworkModal
        isOpen={showHomeworkModal}
        onClose={() => setShowHomeworkModal(false)}
        initialStudentId={studentId}
        initialStudentName={dossier?.profile.display_name}
        onAssigned={loadData}
      />

      {/* ─── MODAL: ASIGNAR CASO CLÍNICO EMG ─── */}
      <AssignClinicalCaseModal
        isOpen={showAssignCaseModal}
        onClose={() => setShowAssignCaseModal(false)}
        initialStudentId={studentId}
        onAssigned={loadData}
      />

      {/* ─── MODAL: NUEVO PLAN DE ESTUDIO ─── */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <span>Crear Plan de Estudio Personalizado</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Plan
                </label>
                <input
                  type="text"
                  required
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="Ej. Plan de Nivelación en Radiculopatías y Plexo"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Objetivo Curricular / Descripción
                </label>
                <textarea
                  rows={3}
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  placeholder="Describe los alcances y justificación pedagógica del plan..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha Meta
                </label>
                <input
                  type="date"
                  value={newPlanTargetDate}
                  onChange={(e) => setNewPlanTargetDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {savingPlan ? 'Creando...' : 'Crear Plan de Estudio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CALIFICAR ASIGNACIÓN ─── */}
      {gradingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Calificar Entrega: {gradingTarget.title}
            </h3>

            {gradingTarget.student_notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px]">
                  Notas del alumno
                </span>
                <p className="text-slate-700 dark:text-slate-200">{gradingTarget.student_notes}</p>
              </div>
            )}

            <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Calificación (0 a 100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Retroalimentación Docente para el Alumno
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Escribe comentarios formativos, felicitaciones o puntos específicos a mejorar..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {savingGrade ? 'Guardando...' : 'Asentar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {studentId && (
        <StudentKardexModal
          isOpen={showKardexModal}
          onClose={() => setShowKardexModal(false)}
          studentId={studentId}
          profile={profile}
        />
      )}
    </AdminLayout>
  );
}
