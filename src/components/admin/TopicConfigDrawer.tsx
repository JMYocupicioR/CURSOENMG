import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Save,
  ExternalLink,
  Edit3,
  Plus,
  GraduationCap,
  FileQuestion,
  Sparkles,
  Check,
  ChevronUp,
  ChevronDown,
  Video,
  Layers,
  BookOpen,
  Loader2,
  Search,
  Copy,
  MessageCircle,
} from 'lucide-react';
import type { Module, Topic } from '../../types/content';
import {
  LiveClassTopicQuickPicker,
  buildLiveClassTopicCatalog,
} from './LiveClassTopicQuickPicker';
import type {
  Course,
  LiveWorkshop,
  TopicTeachingCommitment,
} from '../../types/database';
import type { AcademicMilestone } from '../../types/academicGradebook';

function tryShowNativePicker(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();
  try {
    input.showPicker();
  } catch {
    // showPicker no disponible o rechazado por el navegador
  }
}

export type TopicDrawerTab = 'teaching' | 'general' | 'evaluation';

export interface TeacherOption {
  id: string;
  name: string;
  specialty: string;
  roleLabel: string;
  avatarUrl?: string | null;
}

interface TopicConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  module: Module | null;
  topic: Topic | null;
  parentTopic?: Topic | null;
  isVisible: boolean;
  sortOrder: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  initialTab?: TopicDrawerTab;
  teachers: TeacherOption[];
  commitments: TopicTeachingCommitment[];
  workshops: LiveWorkshop[];
  milestones: AcademicMilestone[];
  courseModules: Module[];
  hasQuiz: boolean;
  onToggleVisible: () => Promise<void> | void;
  onMove: (direction: -1 | 1) => Promise<void> | void;
  onAssignTeacher: (input: {
    teacherId: string;
    teacherName: string;
    includeSubtopics: boolean;
    milestoneId?: string | null;
  }) => Promise<void>;
  onRemoveTeacher: (input: {
    teacherId: string;
    commitmentIds: string[];
    includeSubtopics: boolean;
  }) => Promise<void>;
  onScheduleClass: (input: {
    workshopId?: string | null;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    streamUrl: string;
    teacherId?: string;
    teacherName?: string;
    additionalTopics?: { topicId: string; moduleId: string }[];
  }) => Promise<void>;
  onAssignMilestone: (milestoneId: string | null) => Promise<void>;
  onSaveTopicMeta: (input: {
    title: string;
    description: string;
    clinicalPearl?: string;
  }) => Promise<void>;
  onCreateSubtopic: () => void;
  onSelectSubtopic?: (subtopic: Topic) => void;
  onOpenQuizEditor: () => void;
  onOpenAssignExam: () => void;
  onOpenClassWizard: () => void;
}

function getInitials(name: string): string {
  const clean = name
    .replace(/^(Dr\.|Dra\.|Mtro\.|Mtra\.|Lic\.)\s+/i, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function TopicConfigDrawer({
  isOpen,
  onClose,
  course,
  module,
  topic,
  parentTopic,
  isVisible,
  canMoveUp,
  canMoveDown,
  initialTab = 'teaching',
  teachers,
  commitments,
  workshops,
  milestones,
  courseModules,
  hasQuiz,
  onToggleVisible,
  onMove,
  onAssignTeacher,
  onRemoveTeacher,
  onScheduleClass,
  onAssignMilestone,
  onSaveTopicMeta,
  onCreateSubtopic,
  onSelectSubtopic,
  onOpenQuizEditor,
  onOpenAssignExam,
  onOpenClassWizard,
}: TopicConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<TopicDrawerTab>(initialTab);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [customTeacherMode, setCustomTeacherMode] = useState(false);
  const [customTeacherName, setCustomTeacherName] = useState('');
  const [customTeacherSpecialty, setCustomTeacherSpecialty] = useState('Profesor Adjunto Invitado');
  const [includeSubtopics, setIncludeSubtopics] = useState(true);

  // Schedule state
  const classDateInputRef = useRef<HTMLInputElement>(null);
  const [additionalClassTopicIds, setAdditionalClassTopicIds] = useState<string[]>([]);
  const [classDate, setClassDate] = useState('');
  const [classTime, setClassTime] = useState('19:00');
  const [classDuration, setClassDuration] = useState(90);
  const [classStreamUrl, setClassStreamUrl] = useState('');
  const [classTitle, setClassTitle] = useState('');

  // General metadata state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPearl, setEditPearl] = useState('');

  // Busy & confirmation states
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Sync when topic changes
  useEffect(() => {
    if (!isOpen || !topic || !module) return;
    setActiveTab(initialTab);
    setFeedback(null);
    setTeacherSearch('');
    setCustomTeacherMode(false);
    setCustomTeacherName('');
    setIncludeSubtopics(Boolean(topic.children && topic.children.length > 0));

    setEditTitle(topic.title || '');
    setEditDesc(topic.description || '');
    setEditPearl(topic.clinicalPearls?.[0] || '');
  }, [isOpen, topic?.id, module?.id, initialTab]);

  // Compromisos docentes de este tema
  const topicCommitments = useMemo(() => {
    if (!topic || !module) return [];
    return commitments.filter(
      (c) => c.topic_id === topic.id && c.status !== 'withdrawn'
    );
  }, [commitments, topic, module]);

  // Taller en vivo vinculado a este tema
  const linkedWorkshop = useMemo(() => {
    if (!topic || !module) return null;
    const fromCommitmentId = topicCommitments.find((c) => c.workshop_id)?.workshop_id;
    if (fromCommitmentId) {
      const found = workshops.find((w) => w.id === fromCommitmentId);
      if (found) return found;
    }
    return (
      workshops.find(
        (w) =>
          w.topic_id === topic.id &&
          w.module_id === module.id &&
          w.status !== 'cancelled'
      ) ?? null
    );
  }, [workshops, topicCommitments, topic, module]);

  useEffect(() => {
    if (!topic) return;
    if (linkedWorkshop) {
      const dt = new Date(linkedWorkshop.scheduled_at);
      if (!Number.isNaN(dt.getTime())) {
        const tzOffset = dt.getTimezoneOffset() * 60000;
        const localIso = new Date(dt.getTime() - tzOffset).toISOString();
        setClassDate(localIso.slice(0, 10));
        setClassTime(localIso.slice(11, 16));
      }
      setClassDuration(linkedWorkshop.duration_minutes || 90);
      setClassStreamUrl(linkedWorkshop.stream_url || course?.live_meeting_url || '');
      setClassTitle(linkedWorkshop.title || `Clase: ${topic.title}`);
    } else {
      setClassDate('');
      setClassTime('19:00');
      setClassDuration(90);
      setClassStreamUrl(course?.live_meeting_url || '');
      setClassTitle(`Clase: ${topic.title}`);
    }
  }, [linkedWorkshop, topic?.id, course?.live_meeting_url]);

  const liveClassTopicCatalog = useMemo(
    () => buildLiveClassTopicCatalog(courseModules),
    [courseModules]
  );

  const liveClassModuleSuggestions = useMemo(() => {
    if (!module) return [];
    return liveClassTopicCatalog.filter((e) => e.moduleId === module.id);
  }, [liveClassTopicCatalog, module?.id]);

  const toggleAdditionalClassTopic = (topicId: string) => {
    if (!topic || topicId === topic.id) return;
    setAdditionalClassTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const addAllSubtopicsToLiveClass = () => {
    const ids = (topic?.children ?? []).map((s) => s.id);
    setAdditionalClassTopicIds((prev) => [...new Set([...prev, ...ids])]);
  };

  useEffect(() => {
    if (!topic) {
      setAdditionalClassTopicIds([]);
      return;
    }
    if (!linkedWorkshop) {
      setAdditionalClassTopicIds([]);
      return;
    }
    const linked = commitments
      .filter(
        (c) =>
          c.workshop_id === linkedWorkshop.id &&
          c.status !== 'withdrawn' &&
          c.topic_id !== topic.id
      )
      .map((c) => c.topic_id);
    setAdditionalClassTopicIds([...new Set(linked)]);
  }, [linkedWorkshop?.id, topic?.id, commitments]);

  // Corte académico actual del tema
  const currentMilestoneId = useMemo(() => {
    if (!topic) return null;
    const fromMilestone = milestones.find((m) =>
      m.target_topic_ids?.includes(topic.id)
    );
    if (fromMilestone) return fromMilestone.id;
    const fromCommitment = topicCommitments.find((c) => c.milestone_id)?.milestone_id;
    return fromCommitment ?? null;
  }, [milestones, topic, topicCommitments]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !topic || !module) return null;

  const subtopics = topic.children ?? [];
  const publicUrl = parentTopic
    ? `/modulo/${module.id}/${parentTopic.id}/${topic.id}`
    : `/modulo/${module.id}/${topic.id}`;

  const assignedTeacherIds = new Set(topicCommitments.map((c) => c.teacher_id));

  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.specialty.toLowerCase().includes(q) ||
      t.roleLabel.toLowerCase().includes(q)
    );
  });

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    if (type === 'ok') {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const buildTeacherInvitationText = (teacherName?: string): string => {
    const recipient = teacherName || topicCommitments[0]?.teacher_name || 'Profesor(a)';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const lessonLink = origin ? `${origin}${publicUrl}` : publicUrl;

    let dateLine = 'Por definir en calendario';
    if (classDate) {
      const dt = new Date(`${classDate}T${classTime || '19:00'}:00`);
      if (!Number.isNaN(dt.getTime())) {
        const formatted = dt.toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        dateLine = `${formatted.charAt(0).toUpperCase() + formatted.slice(1)} · ${classTime || '19:00'} hrs (${classDuration || 90} min)`;
      }
    } else if (linkedWorkshop) {
      const dt = new Date(linkedWorkshop.scheduled_at);
      if (!Number.isNaN(dt.getTime())) {
        dateLine = dt.toLocaleString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    const lines = [
      `🩺 *Asignación Docente · ElectroDx NeuroSAFE*`,
      `Hola *${recipient}*, te compartimos la ficha de tu tema asignado:`,
      ``,
      `🎓 *Curso:* ${course?.title || 'Diplomado ElectroDx'}`,
      `📘 *Módulo:* ${module.title}`,
      `📌 *Tema:* ${topic.title}`,
    ];

    if (subtopics.length > 0) {
      lines.push(
        `📂 *Subtemas (${subtopics.length}):* ${subtopics.map((s) => s.title).join(', ')}`
      );
    }

    lines.push(`📅 *Sesión en vivo:* ${dateLine}`);

    const stream = classStreamUrl.trim() || course?.live_meeting_url?.trim();
    if (stream) {
      lines.push(`🎥 *Aula virtual:* ${stream}`);
    }

    lines.push(`🔗 *Revisar tema y material:* ${lessonLink}`);
    return lines.join('\n');
  };

  const handleCopyInvitation = async (teacherName?: string) => {
    const text = buildTeacherInvitationText(teacherName);
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        'ok',
        `Ficha de invitación copiada al portapapeles${teacherName ? ` para ${teacherName}` : ''}.`
      );
    } catch {
      showToast('err', 'No se pudo copiar automáticamente al portapapeles.');
    }
  };

  const handleSendWhatsApp = (teacherName?: string) => {
    const text = buildTeacherInvitationText(teacherName);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAssignTeacherClick = async (teacherId: string, teacherName: string) => {
    setBusyAction(`assign-${teacherId}`);
    setFeedback(null);
    try {
      await onAssignTeacher({
        teacherId,
        teacherName,
        includeSubtopics: subtopics.length > 0 && includeSubtopics,
        milestoneId: currentMilestoneId,
      });
      showToast('ok', `Tema asignado a ${teacherName}`);
      setCustomTeacherMode(false);
      setCustomTeacherName('');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'No se pudo asignar el profesor');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAssignCustomTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customTeacherName.trim();
    if (!cleanName) return;
    const guestId = `guest_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await handleAssignTeacherClick(guestId, cleanName);
  };

  const handleRemoveTeacherClick = async (teacherId: string, teacherName: string) => {
    setBusyAction(`remove-${teacherId}`);
    setFeedback(null);
    try {
      const cids = commitments
        .filter((c) => c.teacher_id === teacherId && c.topic_id === topic.id)
        .map((c) => c.id);
      await onRemoveTeacher({
        teacherId,
        commitmentIds: cids,
        includeSubtopics: subtopics.length > 0 && includeSubtopics,
      });
      showToast('ok', `Se retiró a ${teacherName} de este tema`);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'No se pudo retirar al profesor');
    } finally {
      setBusyAction(null);
    }
  };

  const persistLiveClass = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!classDate) {
      setActiveTab('teaching');
      showToast('err', 'Selecciona una fecha en el calendario para programar la clase.');
      window.setTimeout(() => {
        classDateInputRef.current?.focus();
        tryShowNativePicker(classDateInputRef.current);
      }, 80);
      return;
    }
    const primaryCommitment = topicCommitments[0];
    if (additionalClassTopicIds.length > 0 && !primaryCommitment) {
      showToast(
        'err',
        'Asigna un docente a este tema antes de vincular otros temas a la misma clase.'
      );
      return;
    }
    setBusyAction('schedule');
    setFeedback(null);
    try {
      const isoDateTime = new Date(`${classDate}T${classTime || '19:00'}:00`).toISOString();
      const additionalTopics = additionalClassTopicIds
        .map((id) => liveClassTopicCatalog.find((e) => e.topicId === id))
        .filter(Boolean)
        .map((e) => ({ topicId: e!.topicId, moduleId: e!.moduleId }));
      await onScheduleClass({
        workshopId: linkedWorkshop?.id ?? null,
        title: classTitle.trim() || `Clase: ${topic.title}`,
        scheduledAt: isoDateTime,
        durationMinutes: classDuration || 90,
        streamUrl: classStreamUrl.trim(),
        teacherId: primaryCommitment?.teacher_id,
        teacherName: primaryCommitment?.teacher_name ?? undefined,
        additionalTopics,
      });
      showToast('ok', 'Clase en vivo guardada, con los temas incluidos.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'No se pudo guardar la fecha');
    } finally {
      setBusyAction(null);
    }
  };

  const handleMilestoneChange = async (milestoneId: string) => {
    setBusyAction('milestone');
    setFeedback(null);
    try {
      await onAssignMilestone(milestoneId || null);
      showToast('ok', milestoneId ? 'Corte académico vinculado al tema.' : 'Tema desvinculado del corte.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'No se pudo actualizar el corte');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      showToast('err', 'El título del tema no puede quedar vacío.');
      return;
    }
    setBusyAction('save-meta');
    setFeedback(null);
    try {
      await onSaveTopicMeta({
        title: editTitle.trim(),
        description: editDesc.trim(),
        clinicalPearl: editPearl.trim() || undefined,
      });
      showToast('ok', 'Información del tema actualizada.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'No se pudo guardar el tema');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-config-drawer-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* ─── CABECERA DEL PANEL ─── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap min-w-0">
              <span className="text-base">{module.emoji || '📘'}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                {module.title}
              </span>
              {parentTopic && (
                <>
                  <span>›</span>
                  <span className="truncate max-w-[140px]">{parentTopic.title}</span>
                </>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-cyan-300">
                {parentTopic ? 'Subtema' : 'Tema'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => void onToggleVisible()}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  isVisible
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 hover:bg-amber-100'
                }`}
                title={isVisible ? 'Clic para ocultar a los alumnos' : 'Clic para mostrar a los alumnos'}
              >
                {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{isVisible ? 'Visible' : 'Oculto'}</span>
              </button>

              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Abrir vista del alumno en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h2
            id="topic-config-drawer-title"
            className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug"
          >
            {topic.title}
          </h2>

          {/* Píldoras de resumen rápido */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {topicCommitments.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                <UserCheck className="w-3 h-3" />
                {topicCommitments.map((c) => c.teacher_name || 'Profesor').join(', ')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Sin profesor asignado
              </span>
            )}

            {linkedWorkshop && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200/80 dark:border-blue-800/60">
                <Calendar className="w-3 h-3" />
                {new Date(linkedWorkshop.scheduled_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}

            {hasQuiz && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <Check className="w-3 h-3" />
                Con Quiz
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2.5 mt-0.5 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300 min-w-0">
              <span className="font-bold text-slate-800 dark:text-slate-100">Clase en vivo.</span>{' '}
              {additionalClassTopicIds.length === 0
                ? 'Solo este tema.'
                : `Este tema y ${additionalClassTopicIds.length} más.`}
            </p>
            <button
              type="button"
              onClick={() => void persistLiveClass()}
              disabled={busyAction !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {busyAction === 'schedule' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Guardar clase en vivo</span>
            </button>
          </div>
        </div>

        {/* ─── NAVEGACIÓN DE 3 PESTAÑAS ─── */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 px-2 pt-1">
          {[
            { id: 'teaching', label: 'Docente y Fecha', icon: UserCheck },
            { id: 'general', label: 'Contenido y Orden', icon: BookOpen },
            { id: 'evaluation', label: 'Evaluación', icon: GraduationCap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TopicDrawerTab)}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 border-b-2 text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'border-blue-600 text-blue-600 dark:text-cyan-400 dark:border-cyan-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`shrink-0 mx-4 sm:mx-5 mt-3 p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>{feedback.type === 'ok' ? `✓ ${feedback.text}` : feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── CUERPO DEL PANEL ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* ===============================================================
              PESTAÑA 1: DOCENTE Y CALENDARIO DEL TEMA
             =============================================================== */}
          {activeTab === 'teaching' && (
            <div className="space-y-5 animate-fadeIn">
              {/* 1. PROFESORES ASIGNADOS */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Profesor(es) asignado(s) al tema
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Asigna directamente a un profesor adjunto (colaborador docente) o titular.
                    </p>
                  </div>
                </div>

                {/* Lista de profesores ya asignados */}
                {topicCommitments.length > 0 ? (
                  <div className="space-y-2">
                    {topicCommitments.map((commitment) => {
                      const tName = commitment.teacher_name || 'Profesor Asignado';
                      const tInfo = teachers.find((t) => t.id === commitment.teacher_id);
                      const isRemoving = busyAction === `remove-${commitment.teacher_id}`;
                      return (
                        <div
                          key={commitment.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                              {getInitials(tName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {tName}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {tInfo?.specialty || 'Docente asignado a este tema'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleCopyInvitation(tName)}
                              title="Copiar ficha del tema e invitación para el profesor"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Copiar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(tName)}
                              title="Enviar invitación de este tema por WhatsApp"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800/60 transition cursor-pointer"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() =>
                                void handleRemoveTeacherClick(commitment.teacher_id, tName)
                              }
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                            >
                              {isRemoving ? 'Quitando…' : 'Quitar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center bg-white/50 dark:bg-slate-900/40">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Este tema aún no tiene profesor asignado
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Haz clic en un médico de la lista de abajo para asignárselo al instante.
                    </p>
                  </div>
                )}

                {/* Opción de aplicar también a subtemas si tiene */}
                {subtopics.length > 0 && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50 text-xs font-semibold text-indigo-900 dark:text-indigo-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSubtopics}
                      onChange={(e) => setIncludeSubtopics(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Aplicar también a sus <strong>{subtopics.length} subtemas</strong>
                    </span>
                  </label>
                )}

                {/* Selector directo de Profesores Adjuntos / Colaboradores */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Seleccionar profesor (1 clic para asignar):
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomTeacherMode((v) => !v)}
                      className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      {customTeacherMode ? 'Elegir de la lista' : '+ Profesor invitado externo'}
                    </button>
                  </div>

                  {customTeacherMode ? (
                    <form
                      onSubmit={handleAssignCustomTeacher}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nombre del Médico / Profesor Adjunto
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Dra. Laura Méndez · Neurofisiología"
                          value={customTeacherName}
                          onChange={(e) => setCustomTeacherName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Cargo / Rol Docente
                        </label>
                        <input
                          type="text"
                          value={customTeacherSpecialty}
                          onChange={(e) => setCustomTeacherSpecialty(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomTeacherMode(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!customTeacherName.trim() || busyAction !== null}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          Asignar al tema
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {teachers.length > 4 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Buscar profesor por nombre o especialidad..."
                            value={teacherSearch}
                            onChange={(e) => setTeacherSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                      )}

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {filteredTeachers.map((teacher) => {
                          const isAssigned = assignedTeacherIds.has(teacher.id);
                          const isBusy = busyAction === `assign-${teacher.id}`;
                          return (
                            <button
                              key={teacher.id}
                              type="button"
                              disabled={busyAction !== null || isAssigned}
                              onClick={() => void handleAssignTeacherClick(teacher.id, teacher.name)}
                              className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border text-left transition cursor-pointer ${
                                isAssigned
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 opacity-80 cursor-default'
                                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center shrink-0">
                                  {getInitials(teacher.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {teacher.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {teacher.roleLabel} · {teacher.specialty}
                                  </p>
                                </div>
                              </div>

                              {isAssigned ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950">
                                  <Check className="w-3 h-3" /> Asignado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60">
                                  {isBusy ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserPlus className="w-3 h-3" />
                                  )}
                                  <span>Asignar</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. CALENDARIO DE CLASE PARA ESTE TEMA */}
              <form
                onSubmit={(e) => void persistLiveClass(e)}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                      Calendario de clase del tema
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Programa qué día y a qué hora se impartirá este tema en vivo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenClassWizard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200/70 dark:border-indigo-800/60 hover:bg-indigo-100 transition cursor-pointer shrink-0"
                    title="Abrir asistente completo de clases en vivo"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Asistente completo</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label
                      htmlFor="topic-class-session-date"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        tryShowNativePicker(classDateInputRef.current);
                      }}
                    >
                      Fecha de la sesión
                    </label>
                    <input
                      ref={classDateInputRef}
                      id="topic-class-session-date"
                      type="date"
                      value={classDate}
                      onChange={(e) => setClassDate(e.target.value)}
                      onClick={() => tryShowNativePicker(classDateInputRef.current)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hora (CDMX)
                    </label>
                    <input
                      type="time"
                      value={classTime}
                      onChange={(e) => setClassTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Duración
                    </label>
                    <select
                      value={classDuration}
                      onChange={(e) => setClassDuration(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value={45}>45 min</option>
                      <option value={60}>60 min (1 hr)</option>
                      <option value={90}>90 min (1.5 hrs)</option>
                      <option value={120}>120 min (2 hrs)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Video className="w-3 h-3 text-blue-500" />
                    <span>Enlace de Zoom / Google Meet (opcional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/... o se usará el aula habitual del curso"
                    value={classStreamUrl}
                    onChange={(e) => setClassStreamUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                  <LiveClassTopicQuickPicker
                    catalog={liveClassTopicCatalog}
                    primaryTopicId={topic.id}
                    primaryTopicTitle={topic.title}
                    selectedAdditionalIds={additionalClassTopicIds}
                    onSelectedAdditionalIdsChange={setAdditionalClassTopicIds}
                    suggestedEntries={liveClassModuleSuggestions}
                    disabled={busyAction !== null}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {linkedWorkshop ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Sesión programada activa
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Sin fecha en vivo programada todavía
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    {(linkedWorkshop || classDate) && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp()}
                        title="Compartir fecha y link de la sesión por WhatsApp"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-xs font-bold transition cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Enviar cita</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={busyAction !== null}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      {busyAction === 'schedule' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5" />
                      )}
                      <span>{linkedWorkshop ? 'Actualizar fecha' : 'Guardar fecha de clase'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* 3. CORTE ACADÉMICO (CHECKLIST DEL ALUMNO) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Corte académico (meta de estudio del alumno)
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Indica en qué periodo de evaluación deben haber completado este tema los residentes:
                </p>
                <select
                  disabled={busyAction !== null}
                  value={currentMilestoneId || ''}
                  onChange={(e) => void handleMilestoneChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Sin corte específico asignado --</option>
                  {milestones.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      Periodo {idx + 1}: {m.title} (Límite: {(m.due_date || '').slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ===============================================================
              PESTAÑA 2: CONTENIDO, ESTRUCTURA Y ORDEN
             =============================================================== */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fadeIn">
              <form
                onSubmit={handleSaveGeneral}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3.5"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Edición rápida del tema
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Título oficial del {parentTopic ? 'subtema' : 'tema'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descripción u objetivo clínico
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Breve resumen pedagógico de lo que aprenderá el médico residente..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Perla clínica destacada (opcional)
                  </label>
                  <input
                    type="text"
                    value={editPearl}
                    onChange={(e) => setEditPearl(e.target.value)}
                    placeholder="Consejo práctico clave de electrodiagnóstico..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <a
                    href={`/colaborador/nueva-revision?moduleId=${module.id}&topicId=${topic.id}&action=update${
                      parentTopic ? `&parentId=${parentTopic.id}` : ''
                    }&from=/admin/temario`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Abrir editor completo (Markdown / PDFs / Videos)</span>
                  </a>

                  <button
                    type="submit"
                    disabled={busyAction !== null}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === 'save-meta' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar</span>
                  </button>
                </div>
              </form>

              {/* Subtemas de este tema (si es tema principal) */}
              {!parentTopic && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Subtemas ({subtopics.length})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Desglosa este tema en subtemas específicos si lo necesitas.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {subtopics.length > 0 && (
                        <button
                          type="button"
                          onClick={addAllSubtopicsToLiveClass}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition cursor-pointer"
                          title="Incluir todos los subtemas en la misma sesión en vivo"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Todos en clase</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onCreateSubtopic}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nuevo subtema</span>
                      </button>
                    </div>
                  </div>

                  {subtopics.length > 0 && (
                    <ul className="space-y-1.5">
                      {subtopics.map((sub, i) => {
                        const inLiveClass = additionalClassTopicIds.includes(sub.id);
                        return (
                          <li
                            key={sub.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                          >
                            <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                              {i + 1}. {sub.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleAdditionalClassTopic(sub.id)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                                  inLiveClass
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                                }`}
                                title="Incluir este subtema en la misma clase en vivo que el tema principal"
                              >
                                {inLiveClass ? 'En clase ✓' : '+ Clase'}
                              </button>
                              {onSelectSubtopic && (
                                <button
                                  type="button"
                                  onClick={() => onSelectSubtopic(sub)}
                                  className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                                >
                                  Configurar →
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/70">
                    <LiveClassTopicQuickPicker
                      catalog={liveClassTopicCatalog}
                      primaryTopicId={topic.id}
                      primaryTopicTitle={topic.title}
                      selectedAdditionalIds={additionalClassTopicIds}
                      onSelectedAdditionalIdsChange={setAdditionalClassTopicIds}
                      suggestedEntries={liveClassModuleSuggestions}
                      disabled={busyAction !== null}
                      showPrimaryChip={false}
                      title="Sumar otro tema a la clase en vivo"
                      hint="Si eliges un tema general, entran también todos sus subtemas. Confirma con Guardar clase en vivo, arriba."
                      searchPlaceholder="Clic aquí para buscar otro tema…"
                    />
                  </div>
                </div>
              )}

              {/* Posición y Visibilidad */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Orden dentro del módulo
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cambia la posición en que aparece para los alumnos.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canMoveUp || busyAction !== null}
                    onClick={() => void onMove(-1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Subir</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canMoveDown || busyAction !== null}
                    onClick={() => void onMove(1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Bajar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              PESTAÑA 3: EVALUACIÓN DEL TEMA
             =============================================================== */}
          {activeTab === 'evaluation' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Cuestionario de autoevaluación (Quiz) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileQuestion className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Cuestionario del Tema (Quiz)
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hasQuiz
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {hasQuiz ? 'Activo' : 'Sin preguntas'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Preguntas de opción múltiple que el alumno responde al terminar de leer este tema para acreditar su progreso.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenQuizEditor}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <FileQuestion className="w-4 h-4" />
                  <span>{hasQuiz ? 'Editar preguntas del Quiz' : 'Crear Quiz para este tema'}</span>
                </button>
              </div>

              {/* Examen Final / Evaluación Asignada */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Examen Formal del Tema
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Crea o envía un examen específico sobre este tema a toda la cohorte o a residentes seleccionados.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenAssignExam}
                  className="w-full py-2.5 px-4 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Configurar o Asignar Examen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
