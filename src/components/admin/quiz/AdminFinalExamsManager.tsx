import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Trash2,
  Sparkles,
  GraduationCap,
  RotateCcw,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { getAllStudentAssignments, deleteAssignment } from '../../../services/studentPlanService';
import { getAdminProfiles } from '../../../services/editorialService';
import { filterGradeableStudents } from '../../../utils/adminUtils';
import { useSyllabusCatalog } from '../../../hooks/useSyllabusCatalog';
import type { StudentAssignment } from '../../../types/studentPlan';
import type { AdminProfileRow } from '../../../types/admin';
import AssignExamModal from '../AssignExamModal';

export interface ExamCampaignGroup {
  key: string;
  title: string;
  description: string;
  courseId?: string;
  courseTitle?: string;
  moduleId?: string;
  topicId?: string;
  topicName?: string;
  subtopicId?: string;
  subtopicTitle?: string;
  dueDate: string;
  timeLimitMinutes: number;
  minScore: number;
  questionCount: number;
  assignments: StudentAssignment[];
  recipientsCount: number;
  completedCount: number;
  pendingCount: number;
  averageScore: number;
  passCount: number;
  isOverdue: boolean;
  isAllCompleted: boolean;
  createdAt: string;
}

interface AdminFinalExamsManagerProps {
  onOpenAssignModal?: () => void;
}

export function AdminFinalExamsManager({ onOpenAssignModal }: AdminFinalExamsManagerProps) {
  const { courses } = useSyllabusCatalog();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Modal de asignación de examen
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [modalInitialTopic, setModalInitialTopic] = useState<{
    courseId?: string;
    moduleId?: string;
    topicId?: string;
    subtopicId?: string;
  } | null>(null);

  // Inspector de resultados de una campaña
  const [inspectCampaign, setInspectCampaign] = useState<ExamCampaignGroup | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProfiles, fetchedAssignments] = await Promise.all([
        getAdminProfiles(false, 'all'),
        getAllStudentAssignments(),
      ]);
      const gradeable = filterGradeableStudents(fetchedProfiles);
      setProfiles(gradeable);
      // Filtrar solo asignaciones de tipo 'exam'
      const examOnly = fetchedAssignments.filter((a) => a.type === 'exam');
      setAssignments(examOnly);
    } catch (err) {
      console.error('[AdminFinalExamsManager] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const profilesById = useMemo(() => {
    return new Map(profiles.map((p) => [p.id, p]));
  }, [profiles]);

  // Agrupar asignaciones individuales en "Campañas / Exámenes Finales Despachados"
  const campaigns: ExamCampaignGroup[] = useMemo(() => {
    const map = new Map<string, StudentAssignment[]>();

    assignments.forEach((asg) => {
      // Clave única basada en título + módulo/tema + fecha límite (o id común)
      const topicPart = asg.target_topic_id || asg.target_module_id || 'global';
      const duePart = asg.due_date ? asg.due_date.slice(0, 13) : 'nodue'; // agrupado por hora de vencimiento
      const titleNorm = asg.title.trim().toLowerCase();
      const groupKey = `${titleNorm}__${topicPart}__${duePart}`;

      const existing = map.get(groupKey) || [];
      existing.push(asg);
      map.set(groupKey, existing);
    });

    const now = Date.now();
    const result: ExamCampaignGroup[] = [];

    map.forEach((items, key) => {
      const sample = items[0];
      const cfg = sample.target_exam_config || {};
      const completed = items.filter((i) => i.status === 'submitted' || i.status === 'approved' || (i.grade !== null && i.grade !== undefined));
      const pending = items.filter((i) => !completed.includes(i));
      const graded = items.filter((i) => typeof i.grade === 'number');
      const avg = graded.length > 0
        ? Math.round(graded.reduce((acc, curr) => acc + (curr.grade || 0), 0) / graded.length)
        : 0;
      const minScore = sample.min_score ?? cfg.minPassingScore ?? 70;
      const passed = graded.filter((i) => (i.grade || 0) >= minScore).length;

      const dueTime = sample.due_date ? new Date(sample.due_date).getTime() : 0;
      const isOverdue = dueTime > 0 && dueTime < now && pending.length > 0;
      const isAllCompleted = items.length > 0 && pending.length === 0;

      result.push({
        key,
        title: sample.title,
        description: sample.description || '',
        courseId: cfg.courseId,
        courseTitle: cfg.courseTitle,
        moduleId: sample.target_module_id || cfg.moduleId,
        topicId: sample.target_topic_id ?? undefined,
        topicName: cfg.topicNames?.[0],
        subtopicId: sample.target_subtopic_id || cfg.subtopicId,
        subtopicTitle: sample.target_subtopic_title || cfg.subtopicTitle,
        dueDate: sample.due_date,
        timeLimitMinutes: cfg.timeLimitMinutes || 30,
        minScore,
        questionCount: cfg.questionCount || cfg.customQuestions?.length || cfg.selectedQuestionIds?.length || 10,
        assignments: items,
        recipientsCount: items.length,
        completedCount: completed.length,
        pendingCount: pending.length,
        averageScore: avg,
        passCount: passed,
        isOverdue,
        isAllCompleted,
        createdAt: sample.created_at,
      });
    });

    // Ordenar de más reciente a más antiguo
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [assignments]);

  // Filtrado de campañas
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = camp.title.toLowerCase().includes(q);
        const matchesTopic = (camp.topicName || '').toLowerCase().includes(q) || (camp.subtopicTitle || '').toLowerCase().includes(q);
        const matchesCourse = (camp.courseTitle || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesTopic && !matchesCourse) return false;
      }

      // Filtro de curso
      if (courseFilter !== 'all') {
        if (camp.courseId !== courseFilter) return false;
      }

      // Filtro de estado
      if (statusFilter === 'active') {
        if (camp.isAllCompleted || camp.isOverdue) return false;
      } else if (statusFilter === 'completed') {
        if (!camp.isAllCompleted) return false;
      } else if (statusFilter === 'overdue') {
        if (!camp.isOverdue) return false;
      }

      return true;
    });
  }, [campaigns, searchQuery, statusFilter, courseFilter]);

  // Métricas agregadas
  const stats = useMemo(() => {
    const totalExams = campaigns.length;
    const totalAssignedStudents = assignments.length;
    const completedAssignments = assignments.filter(
      (a) => a.status === 'submitted' || a.status === 'approved' || typeof a.grade === 'number'
    ).length;
    const pendingAssignments = totalAssignedStudents - completedAssignments;
    const gradedAssignments = assignments.filter((a) => typeof a.grade === 'number');
    const globalAvg = gradedAssignments.length > 0
      ? Math.round(gradedAssignments.reduce((acc, a) => acc + (a.grade || 0), 0) / gradedAssignments.length)
      : 0;

    return {
      totalExams,
      totalAssignedStudents,
      completedAssignments,
      pendingAssignments,
      globalAvg,
    };
  }, [campaigns, assignments]);

  // Eliminar toda la campaña (todas las asignaciones asociadas)
  const handleDeleteCampaign = async (campaign: ExamCampaignGroup) => {
    const confirm = window.confirm(
      `¿Estás seguro de eliminar el examen final "${campaign.title}" asignado a ${campaign.recipientsCount} alumno(s)? Esta acción borrará las tareas y sus registros en kárdex.`
    );
    if (!confirm) return;

    setDeletingId(campaign.key);
    try {
      for (const asg of campaign.assignments) {
        await deleteAssignment(asg.id, asg.student_id);
      }
      setActionMessage(`Examen "${campaign.title}" eliminado correctamente.`);
      setTimeout(() => setActionMessage(null), 4000);
      if (inspectCampaign?.key === campaign.key) {
        setInspectCampaign(null);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la asignación del examen.');
    } finally {
      setDeletingId(null);
    }
  };

  // Eliminar una asignación individual (para reiniciar intento a un alumno)
  const handleDeleteSingleAssignment = async (assignmentId: string, studentId: string, studentName: string) => {
    const confirm = window.confirm(
      `¿Reiniciar evaluación para ${studentName}? Se eliminará su entrega actual para permitirle un nuevo intento.`
    );
    if (!confirm) return;

    try {
      await deleteAssignment(assignmentId, studentId);
      setActionMessage(`Evaluación reiniciada para ${studentName}.`);
      setTimeout(() => setActionMessage(null), 4000);
      await loadData();
      // Actualizar el inspector
      if (inspectCampaign) {
        setInspectCampaign((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            assignments: prev.assignments.filter((a) => a.id !== assignmentId),
            recipientsCount: prev.recipientsCount - 1,
          };
        });
      }
    } catch (err) {
      console.error(err);
      alert('Error al reiniciar el examen del alumno.');
    }
  };

  const handleOpenNewExamModal = () => {
    setModalInitialTopic(null);
    if (onOpenAssignModal) {
      onOpenAssignModal();
    } else {
      setAssignModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de acción exitosa */}
      {actionMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-2.5 text-xs border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Hero Banner Pedagógico & CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-700/40">
        <div className="absolute -right-8 -top-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Evaluaciones Sumativas de Alto Nivel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Exámenes Finales & Especiales
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Crea exámenes formales para un curso, módulo, tema o subtema específico.
              Redacta preguntas clínicas exclusivas o importa del quiz del tema, y asígnalas
              con <strong>candado de tiempo estricto</strong> a toda la generación o a un alumno en particular.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenNewExamModal}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95 flex items-center gap-2.5 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Crear y Enviar Examen Final</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <span className="text-xs text-blue-200 block font-medium">Exámenes creados</span>
            <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalExams}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <span className="text-xs text-blue-200 block font-medium">Alumnos evaluados</span>
            <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalAssignedStudents}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <span className="text-xs text-blue-200 block font-medium">Entregas completadas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.completedAssignments}</span>
              <span className="text-xs text-blue-200 font-semibold">({stats.pendingAssignments} pend.)</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <span className="text-xs text-blue-200 block font-medium">Promedio de cohorte</span>
            <span className="text-2xl sm:text-3xl font-black text-cyan-300">
              {stats.globalAvg > 0 ? `${stats.globalAvg}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar examen por título, tema, subtema o curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Filtros de Curso y Estado */}
        <div className="flex flex-wrap items-center gap-2">
          {courses.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Todos los Cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-300 shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-300 shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              En Curso
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-300 shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'overdue'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Vencidos
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Exámenes Finales */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Cargando exámenes finales despachados...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {searchQuery || statusFilter !== 'all' || courseFilter !== 'all'
                ? 'No hay exámenes con estos filtros'
                : 'Aún no has creado ningún Examen Final'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {searchQuery || statusFilter !== 'all' || courseFilter !== 'all'
                ? 'Prueba modificando tu búsqueda o restableciendo los filtros de estado o curso.'
                : 'Crea tu primera evaluación sumativa. Podrás seleccionar el tema o subtema exacto del diplomado, personalizar las preguntas y despacharlo a toda la generación o a alumnos seleccionados.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewExamModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 inline-flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primer Examen Final</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCampaigns.map((camp) => {
            const pct = camp.recipientsCount > 0 ? Math.round((camp.completedCount / camp.recipientsCount) * 100) : 0;
            return (
              <div
                key={camp.key}
                className="group relative rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400/80 dark:hover:border-blue-500/60 transition-all hover:shadow-xl space-y-4 flex flex-col justify-between"
              >
                {/* Encabezado de la Tarjeta */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Badge de Curso / Módulo */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {camp.courseTitle && (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                          {camp.courseTitle}
                        </span>
                      )}
                      {camp.moduleId && (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {camp.moduleId}
                        </span>
                      )}
                      {camp.subtopicTitle ? (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {camp.subtopicTitle}
                        </span>
                      ) : camp.topicName ? (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300">
                          {camp.topicName}
                        </span>
                      ) : null}
                    </div>

                    {/* Estado de la Campaña */}
                    <div>
                      {camp.isAllCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Completado
                        </span>
                      ) : camp.isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
                          <AlertCircle className="w-3 h-3" /> Vencido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                          <Clock className="w-3 h-3" /> En Curso
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                    {camp.title}
                  </h3>

                  {camp.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {camp.description}
                    </p>
                  )}
                </div>

                {/* Parámetros Académicos */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Duración</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
                      <Clock3 className="w-3 h-3 text-indigo-500" />
                      {camp.timeLimitMinutes} min
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Mínimo</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {camp.minScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Preguntas</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {camp.questionCount} reactivos
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso y Vencimiento */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      <span>{camp.completedCount} de {camp.recipientsCount} alumnos entregaron</span>
                    </span>
                    <span className="font-extrabold text-blue-600 dark:text-cyan-400">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        pct === 100
                          ? 'bg-emerald-500'
                          : camp.isOverdue
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Vence: {camp.dueDate ? new Date(camp.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin límite'}
                    </span>
                    {camp.averageScore > 0 && (
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Promedio: <strong className="text-emerald-600 dark:text-emerald-400">{camp.averageScore}%</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInspectCampaign(camp)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Alumnos & Notas ({camp.recipientsCount})</span>
                  </button>

                  <button
                    type="button"
                    title="Eliminar examen final"
                    disabled={deletingId === camp.key}
                    onClick={() => handleDeleteCampaign(camp)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL INSPECTOR DE RESULTADOS DE LA CAMPAÑA ─── */}
      {inspectCampaign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Header del Inspector */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-cyan-300">
                    Kárdex de Examen
                  </span>
                  <span className="text-xs text-slate-400">
                    {inspectCampaign.recipientsCount} cursistas asignados
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {inspectCampaign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectCampaign(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen de Rendimiento del Inspector */}
            <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Completados</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {inspectCampaign.completedCount} de {inspectCampaign.recipientsCount}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Promedio Obtenido</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {inspectCampaign.averageScore > 0 ? `${inspectCampaign.averageScore}%` : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Aprobados (≥{inspectCampaign.minScore}%)</span>
                <span className="font-extrabold text-blue-600 dark:text-cyan-400">
                  {inspectCampaign.passCount} alumnos
                </span>
              </div>
            </div>

            {/* Lista de Alumnos */}
            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
              {inspectCampaign.assignments.map((asg) => {
                const profile = profilesById.get(asg.student_id);
                const studentName = profile?.display_name || 'Médico Cursista';
                const studentEmail = profile?.email || '';
                const isCompleted = asg.status === 'submitted' || asg.status === 'approved' || typeof asg.grade === 'number';
                const grade = asg.grade;
                const isPassed = typeof grade === 'number' && grade >= inspectCampaign.minScore;

                return (
                  <div key={asg.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-cyan-300 font-bold flex items-center justify-center shrink-0">
                        {studentName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {studentName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {studentEmail}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isCompleted ? (
                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                              isPassed
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {typeof grade === 'number' ? `${grade}%` : 'Entregado'}
                          </span>
                          {asg.submitted_at && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {new Date(asg.submitted_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                          Pendiente
                        </span>
                      )}

                      {/* Botón para reiniciar/eliminar intento de este alumno */}
                      <button
                        type="button"
                        title="Reiniciar examen para este alumno (permitir nuevo intento)"
                        onClick={() => handleDeleteSingleAssignment(asg.id, asg.student_id, studentName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer del Inspector */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Puedes reiniciar el intento de cualquier cursista para que vuelva a presentar.
              </span>
              <button
                type="button"
                onClick={() => setInspectCampaign(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-bold text-xs text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear y Asignar Examen Final */}
      <AssignExamModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        initialCourseId={modalInitialTopic?.courseId}
        initialModuleId={modalInitialTopic?.moduleId}
        initialTopicId={modalInitialTopic?.topicId}
        initialSubtopicId={modalInitialTopic?.subtopicId}
        profiles={profiles}
        onAssigned={async () => {
          await loadData();
          setAssignModalOpen(false);
          setActionMessage('¡Examen final asignado y despachado con éxito!');
          setTimeout(() => setActionMessage(null), 5000);
        }}
      />
    </div>
  );
}
