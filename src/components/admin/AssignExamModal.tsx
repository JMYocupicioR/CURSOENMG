import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
  Search,
  X,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
  Layers,
  FileQuestion,
  ShieldCheck,
} from 'lucide-react';
import { allModules } from '../../content/modules';
import { loadExamQuestions } from '../../services/examService';
import { createBatchAssignments } from '../../services/studentPlanService';
import { getAdminProfiles } from '../../services/editorialService';
import { filterGradeableStudents } from '../../utils/adminUtils';
import type { AdminProfileRow } from '../../types/admin';
import type { ExamQuestion } from '../../types/exam';
import type { AssignmentPriority } from '../../types/studentPlan';

interface AssignExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void | boolean | Promise<void | boolean>;
  initialStudentId?: string;
  initialStudentName?: string;
  initialDueDate?: string;
  profiles?: AdminProfileRow[];
}

export default function AssignExamModal({
  isOpen,
  onClose,
  onAssigned,
  initialStudentId,
  initialStudentName,
  initialDueDate,
  profiles: initialProfiles,
}: AssignExamModalProps) {
  // ─── Estado de Alumnos ───────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<AdminProfileRow[]>(initialProfiles || []);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [targetScope, setTargetScope] = useState<'single' | 'selected' | 'cohort'>(
    initialStudentId ? 'single' : 'selected'
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    initialStudentId ? new Set([initialStudentId]) : new Set()
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResidencyFilter, setStudentResidencyFilter] = useState<string>('all');

  // ─── Parámetros del Examen ──────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AssignmentPriority>('normal');
  const [minScore, setMinScore] = useState<number>(70);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(30);
  const [customMinutes, setCustomMinutes] = useState<string>('30');
  const [strictLock, setStrictLock] = useState<boolean>(true);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [allowRetakeRequest, setAllowRetakeRequest] = useState<boolean>(true);

  // ─── Configuración Curricular: Módulo, Tema, Subtema ─────────────────────────
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>('');

  // ─── Preguntas del Banco ────────────────────────────────────────────────────
  const [allBankQuestions, setAllBankQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionSelectionMode, setQuestionSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [autoQuestionCount, setAutoQuestionCount] = useState<number>(10);
  const [autoCriticalOnly, setAutoCriticalOnly] = useState<boolean>(false);
  const [manualSelectedQuestionIds, setManualSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [manualQuestionSearch, setManualQuestionSearch] = useState('');
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Cargar lista de alumnos si no se proveyeron
  useEffect(() => {
    if (isOpen) {
      if (!initialProfiles || initialProfiles.length === 0) {
        setLoadingProfiles(true);
        getAdminProfiles(false, 'all')
          .then((data) => setProfiles(filterGradeableStudents(data)))
          .catch((e) => console.error(e))
          .finally(() => setLoadingProfiles(false));
      } else {
        setProfiles(filterGradeableStudents(initialProfiles));
      }

      if (initialStudentId) {
        setSelectedStudentIds(new Set([initialStudentId]));
        setTargetScope('single');
      }
      if (initialDueDate) {
        setDueDate(initialDueDate);
      }
    }
  }, [isOpen, initialProfiles, initialStudentId, initialDueDate]);

  // Cargar banco de preguntas de examen
  useEffect(() => {
    if (isOpen && allBankQuestions.length === 0) {
      setLoadingQuestions(true);
      loadExamQuestions(undefined, { revealAnswers: true })
        .then(({ questions }) => setAllBankQuestions(questions))
        .catch((e) => console.error(e))
        .finally(() => setLoadingQuestions(false));
    }
  }, [isOpen, allBankQuestions.length]);

  // Módulo seleccionado y sus temas
  const currentModule = useMemo(() => {
    return allModules.find((m) => m.id === selectedModuleId);
  }, [selectedModuleId]);

  const availableTopics = useMemo(() => {
    return currentModule ? currentModule.topics : [];
  }, [currentModule]);

  // Tema seleccionado y sus subtemas
  const currentTopic = useMemo(() => {
    return availableTopics.find((t) => t.id === selectedTopicId);
  }, [availableTopics, selectedTopicId]);

  const availableSubtopics = useMemo(() => {
    return currentTopic?.children || [];
  }, [currentTopic]);

  const currentSubtopic = useMemo(() => {
    return availableSubtopics.find((st) => st.id === selectedSubtopicId);
  }, [availableSubtopics, selectedSubtopicId]);

  // Auto-sugerir título al cambiar módulo, tema o subtema si está vacío o es genérico
  useEffect(() => {
    if (currentSubtopic) {
      setTitle(`Evaluación de Refuerzo: ${currentSubtopic.title}`);
    } else if (currentTopic) {
      setTitle(`Evaluación de Refuerzo: ${currentTopic.title}`);
    } else if (currentModule) {
      setTitle(`Examen: Módulo ${currentModule.number} - ${currentModule.title}`);
    }
  }, [currentModule, currentTopic, currentSubtopic]);

  // Filtrar preguntas del banco según la selección curricular
  const filteredBankQuestions = useMemo(() => {
    let list = allBankQuestions;

    if (selectedModuleId) {
      list = list.filter((q) => q.module_id === selectedModuleId);
    }

    if (currentTopic) {
      const topicTitleLower = currentTopic.title.toLowerCase();
      list = list.filter(
        (q) =>
          q.topic_name.toLowerCase().includes(topicTitleLower) ||
          topicTitleLower.includes(q.topic_name.toLowerCase()) ||
          q.tags?.some((tag) => tag.toLowerCase().includes(topicTitleLower))
      );
    }

    if (currentSubtopic) {
      const subTitleLower = currentSubtopic.title.toLowerCase();
      const subFiltered = list.filter(
        (q) =>
          q.stem.toLowerCase().includes(subTitleLower) ||
          q.tags?.some((t) => t.toLowerCase().includes(subTitleLower))
      );
      if (subFiltered.length > 0) {
        list = subFiltered;
      }
    }

    if (autoCriticalOnly && questionSelectionMode === 'auto') {
      list = list.filter((q) => q.is_critical);
    }

    return list;
  }, [allBankQuestions, selectedModuleId, currentTopic, currentSubtopic, autoCriticalOnly, questionSelectionMode]);

  // Preguntas mostradas en el selector manual con búsqueda
  const manualVisibleQuestions = useMemo(() => {
    if (!manualQuestionSearch.trim()) return filteredBankQuestions;
    const q = manualQuestionSearch.toLowerCase();
    return filteredBankQuestions.filter(
      (item) =>
        item.stem.toLowerCase().includes(q) ||
        item.topic_name.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [filteredBankQuestions, manualQuestionSearch]);

  // Lista de alumnos filtrada para selección
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = studentSearch.toLowerCase();
      const matchSearch =
        p.display_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.institution && p.institution.toLowerCase().includes(q)) ||
        (p.cedula_profesional && p.cedula_profesional.includes(q));

      const matchRes =
        studentResidencyFilter === 'all'
          ? true
          : (p.residency_year || '').toLowerCase().includes(studentResidencyFilter.toLowerCase());

      return matchSearch && matchRes;
    });
  }, [profiles, studentSearch, studentResidencyFilter]);

  // Manejo de checkboxes de alumnos
  const toggleStudentSelected = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.size === filteredProfiles.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredProfiles.map((p) => p.id)));
    }
  };

  // Manejo de checkboxes de preguntas manuales
  const toggleQuestionSelected = (id: string) => {
    setManualSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllManualQuestions = () => {
    if (manualSelectedQuestionIds.size === manualVisibleQuestions.length) {
      setManualSelectedQuestionIds(new Set());
    } else {
      setManualSelectedQuestionIds(new Set(manualVisibleQuestions.map((q) => q.id)));
    }
  };

  // Determinar los IDs de alumnos que recibirán el examen
  const finalRecipientIds = useMemo(() => {
    if (targetScope === 'single') {
      return initialStudentId ? [initialStudentId] : [];
    }
    if (targetScope === 'cohort') {
      return profiles.map((p) => p.id);
    }
    return Array.from(selectedStudentIds);
  }, [targetScope, initialStudentId, profiles, selectedStudentIds]);

  // Preguntas seleccionadas finales
  const finalQuestionCount = useMemo(() => {
    if (questionSelectionMode === 'manual') {
      return manualSelectedQuestionIds.size;
    }
    return Math.min(autoQuestionCount, filteredBankQuestions.length || autoQuestionCount);
  }, [questionSelectionMode, manualSelectedQuestionIds.size, autoQuestionCount, filteredBankQuestions.length]);

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalRecipientIds.length === 0) {
      alert('Debes seleccionar al menos un alumno destinatario para el examen.');
      return;
    }
    if (!title.trim()) {
      alert('Por favor especifica un título para la evaluación.');
      return;
    }
    if (questionSelectionMode === 'manual' && manualSelectedQuestionIds.size === 0) {
      alert('Has elegido el modo de selección manual pero no has seleccionado ninguna pregunta.');
      return;
    }

    const effectiveTimeLimit = timeLimitMinutes === -1 ? Number(customMinutes) || 30 : timeLimitMinutes;

    setSubmitting(true);
    try {
      const manualIdsArray =
        questionSelectionMode === 'manual' ? Array.from(manualSelectedQuestionIds) : undefined;

      await createBatchAssignments(finalRecipientIds, {
        title: title.trim(),
        type: 'exam',
        description:
          description.trim() ||
          `Evaluación asignada de ElectroDx Diplomado. ${
            currentTopic ? `Tema: ${currentTopic.title}.` : ''
          } ${currentSubtopic ? `Subtema: ${currentSubtopic.title}.` : ''} Límite: ${effectiveTimeLimit} min.`,
        target_module_id: selectedModuleId || null,
        target_topic_id: selectedTopicId || null,
        target_subtopic_id: selectedSubtopicId || null,
        target_subtopic_title: currentSubtopic?.title || null,
        target_exam_config: {
          moduleId: selectedModuleId || undefined,
          topicNames: currentTopic ? [currentTopic.title] : undefined,
          subtopicId: selectedSubtopicId || undefined,
          subtopicTitle: currentSubtopic?.title || undefined,
          selectedQuestionIds: manualIdsArray,
          questionCount: finalQuestionCount,
          timeLimitMinutes: effectiveTimeLimit,
          strictLock: strictLock,
          maxAttempts: maxAttempts,
          attemptsCount: 0,
          allowRetakeRequest: allowRetakeRequest,
          retakeStatus: 'none',
          minPassingScore: minScore,
          mode: manualIdsArray && manualIdsArray.length > 0 ? 'CUSTOM' : 'TOPIC_SPECIFIC',
        },
        due_date: new Date(dueDate).toISOString(),
        status: 'pending',
        priority: priority,
        min_score: minScore,
      });

      const reloaded = await onAssigned?.();
      if (reloaded === false) {
        alert('El examen se asignó, pero el calendario no pudo recargar las tareas. Usa Reintentar.');
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error && err.message ? err.message : 'Error al crear y enviar el examen a los alumnos.';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Asignar Examen Personalizado</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  COMEFYR
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura destinatarios, temas curriculares y preguntas específicas con candado estricto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* ─── SECCIÓN 1: DESTINATARIOS (ALUMNOS) ─── */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  1. Destinatarios del Examen
                </span>
              </div>

              {/* Selector de modo de destinatarios */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                {initialStudentId && (
                  <button
                    type="button"
                    onClick={() => setTargetScope('single')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      targetScope === 'single'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Solo este Alumno
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTargetScope('selected')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    targetScope === 'selected'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Varios Alumnos ({selectedStudentIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('cohort')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    targetScope === 'cohort'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Toda la Cohorte ({profiles.length})
                </button>
              </div>
            </div>

            {targetScope === 'single' ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                    {initialStudentName ? initialStudentName.slice(0, 2).toUpperCase() : 'AL'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      {initialStudentName || 'Alumno Actual'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      El examen será asignado directamente a este cursista.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetScope('selected')}
                  className="text-xs text-indigo-600 hover:underline font-bold"
                >
                  + Enviar a más alumnos
                </button>
              </div>
            ) : targetScope === 'cohort' ? (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  El examen será enviado a todos los <strong>{profiles.length} médicos cursistas</strong> de manera simultánea.
                </span>
              </div>
            ) : (
              <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Filtros de búsqueda para alumnos */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, correo o cédula..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <select
                    value={studentResidencyFilter}
                    onChange={(e) => setStudentResidencyFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="all">Todos los grados</option>
                    <option value="R1">Solo R1</option>
                    <option value="R2">Solo R2</option>
                    <option value="R3">Solo R3</option>
                    <option value="R4">Solo R4</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleSelectAllStudents}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs whitespace-nowrap"
                  >
                    {selectedStudentIds.size === filteredProfiles.length ? 'Deseleccionar' : 'Seleccionar Todos'}
                  </button>
                </div>

                {/* Lista de selección de alumnos */}
                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                  {loadingProfiles ? (
                    <p className="text-center py-3 text-slate-400">Cargando lista de alumnos...</p>
                  ) : filteredProfiles.length === 0 ? (
                    <p className="text-center py-3 text-slate-400">No se encontraron cursistas con este filtro.</p>
                  ) : (
                    filteredProfiles.map((p) => {
                      const isChecked = selectedStudentIds.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStudentSelected(p.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                {p.display_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {p.email} {p.institution ? `· ${p.institution}` : ''}
                              </span>
                            </div>
                          </div>
                          {p.residency_year && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {p.residency_year}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>
                    <strong>{selectedStudentIds.size}</strong> cursistas seleccionados
                  </span>
                  <span>Total cohorte: {profiles.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECCIÓN 2: PERSONALIZACIÓN CURRICULAR (MÓDULO, TEMA, SUBTEMA) ─── */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                2. Contenido Curricular de la Evaluación
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Selector de Módulo */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Módulo de Referencia
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => {
                    setSelectedModuleId(e.target.value);
                    setSelectedTopicId('');
                    setSelectedSubtopicId('');
                  }}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="">Todos los Módulos (Global)</option>
                  {allModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Módulo {m.number}: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Tema */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tema Específico
                </label>
                <select
                  disabled={!selectedModuleId}
                  value={selectedTopicId}
                  onChange={(e) => {
                    setSelectedTopicId(e.target.value);
                    setSelectedSubtopicId('');
                  }}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-50"
                >
                  <option value="">
                    {selectedModuleId ? 'Todos los temas del módulo' : 'Selecciona un módulo primero'}
                  </option>
                  {availableTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Subtema */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subtema Específico
                </label>
                <select
                  disabled={!selectedTopicId || availableSubtopics.length === 0}
                  value={selectedSubtopicId}
                  onChange={(e) => setSelectedSubtopicId(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-50"
                >
                  <option value="">
                    {!selectedTopicId
                      ? 'Selecciona tema'
                      : availableSubtopics.length === 0
                      ? 'Sin subtemas anidados'
                      : 'Todos los subtemas'}
                  </option>
                  {availableSubtopics.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resumen del filtro */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>
                Banco disponible con este filtro:{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {filteredBankQuestions.length} preguntas
                </strong>
              </span>
              {currentSubtopic && (
                <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Subtema: {currentSubtopic.title}
                </span>
              )}
            </div>
          </div>

          {/* ─── SECCIÓN 3: PREGUNTAS (AUTO VS MANUAL) ─── */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  3. Selección de Preguntas
                </span>
              </div>

              {/* Selector de modo de preguntas */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setQuestionSelectionMode('auto')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    questionSelectionMode === 'auto'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🎲 Automática / Aleatoria
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionSelectionMode('manual')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    questionSelectionMode === 'manual'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🎯 Selección Manual Específica ({manualSelectedQuestionIds.size})
                </button>
              </div>
            </div>

            {questionSelectionMode === 'auto' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad de Preguntas a Generar
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, filteredBankQuestions.length || 50)}
                      value={autoQuestionCount}
                      onChange={(e) => setAutoQuestionCount(Math.max(1, Number(e.target.value)))}
                      className="w-24 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                    <span className="text-slate-500 text-[11px]">
                      de {filteredBankQuestions.length} disponibles
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:pt-5">
                  <input
                    type="checkbox"
                    id="autoCriticalOnly"
                    checked={autoCriticalOnly}
                    onChange={(e) => setAutoCriticalOnly(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="autoCriticalOnly" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                    <strong className="block">Solo preguntas de alta rentabilidad</strong>
                    <span className="text-[11px] text-slate-500">
                      Filtrar únicamente preguntas de alta prioridad clínica y examen de certificación
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              /* MODO MANUAL DE PREGUNTAS */
              <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por texto de viñeta, perla o etiqueta..."
                      value={manualQuestionSearch}
                      onChange={(e) => setManualQuestionSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllManualQuestions}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs whitespace-nowrap"
                  >
                    {manualSelectedQuestionIds.size === manualVisibleQuestions.length
                      ? 'Deseleccionar'
                      : 'Seleccionar Todas'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                  {loadingQuestions ? (
                    <p className="text-center py-4 text-slate-400">Cargando banco de preguntas...</p>
                  ) : manualVisibleQuestions.length === 0 ? (
                    <p className="text-center py-4 text-slate-400">
                      No hay preguntas que coincidan con los filtros seleccionados.
                    </p>
                  ) : (
                    manualVisibleQuestions.map((q) => {
                      const isChecked = manualSelectedQuestionIds.has(q.id);
                      const isExpanded = previewQuestionId === q.id;
                      return (
                        <div key={q.id} className="pt-1.5">
                          <div className="flex items-start justify-between gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg">
                            <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleQuestionSelected(q.id)}
                                className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                              />
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-snug">
                                  {q.stem}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {q.topic_name}
                                  </span>
                                  {q.is_critical && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                                      ★ Crítica COMEFYR
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                    {q.difficulty === 1 ? 'Básico' : q.difficulty === 2 ? 'Intermedio' : 'Avanzado'}
                                  </span>
                                  <span className="text-slate-400">({q.options.length} opciones)</span>
                                </div>
                              </div>
                            </label>

                            <button
                              type="button"
                              onClick={() => setPreviewQuestionId(isExpanded ? null : q.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Ver opciones y respuesta"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Previsualización expandida de la pregunta */}
                          {isExpanded && (
                            <div className="mt-1 ml-6 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
                              <p className="font-bold text-slate-700 dark:text-slate-300">Opciones de Respuesta:</p>
                              <div className="space-y-1">
                                {q.options.map((opt, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-1.5 rounded-lg flex items-start gap-1.5 ${
                                      opt.is_correct
                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold border border-emerald-200 dark:border-emerald-800'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <span>{opt.is_correct ? '✓' : '·'}</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                              {q.pearl && (
                                <p className="text-amber-700 dark:text-amber-300 text-[10px] italic pt-1">
                                  💡 <strong>Perla:</strong> {q.pearl}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>
                    <strong>{manualSelectedQuestionIds.size}</strong> preguntas seleccionadas
                  </span>
                  <span>Disponibles: {manualVisibleQuestions.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECCIÓN 4: PARÁMETROS DE LA ASIGNACIÓN Y SEGURIDAD ─── */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                4. Parámetros de Seguridad y Entrega
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Título Oficial de la Asignación
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Evaluación de Refuerzo: Plexopatía Braquial"
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instrucciones Clínicas y Mensaje para el Alumno
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe los objetivos, lecturas obligatorias o parámetros esperados para la entrega..."
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha y Hora Límite de Entrega
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Calificación Mínima Aprobatoria (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            {/* Configuración de Tiempo y Candado Estricto */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Tiempo Límite para Resolver:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 20, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTimeLimitMinutes(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          timeLimitMinutes === m
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50'
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTimeLimitMinutes(-1)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        timeLimitMinutes === -1
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      Personalizado
                    </button>
                    {timeLimitMinutes === -1 && (
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="w-16 p-1 text-center rounded-lg bg-white dark:bg-slate-900 border border-amber-300 text-xs font-bold"
                      />
                    )}
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-amber-200 dark:sm:border-amber-800/60 sm:pl-4">
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block">
                    Tiempo configurado
                  </span>
                  <span className="text-base font-black text-amber-950 dark:text-amber-100">
                    {timeLimitMinutes === -1 ? `${customMinutes || 30} min` : `${timeLimitMinutes} min`}
                  </span>
                </div>
              </div>

              {/* Candado Estricto Checkbox */}
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="strictLockCheckbox"
                  checked={strictLock}
                  onChange={(e) => setStrictLock(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                />
                <label htmlFor="strictLockCheckbox" className="cursor-pointer">
                  <span className="font-bold text-amber-950 dark:text-amber-200 block text-xs">
                    Modo Examen Estricto (Cronómetro continuo en tiempo real)
                  </span>
                  <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed block">
                    Al comenzar, el alumno es notificado de que no podrá salir ni pausar la evaluación.
                    <strong> Incluso si cierra el navegador o la plataforma, el tiempo seguirá corriendo</strong> contra la hora límite y se enviará automáticamente.
                  </span>
                </label>
              </div>
            </div>

            {/* Configuración de Intentos y Permisos de Repetición */}
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-indigo-950 dark:text-indigo-200 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Límite de Intentos Permitidos:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { val: 1, label: '1 intento (Oficial / Estricto)' },
                      { val: 2, label: '2 intentos' },
                      { val: 3, label: '3 intentos' },
                      { val: 0, label: 'Ilimitados' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setMaxAttempts(opt.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          maxAttempts === opt.val
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-indigo-200 dark:sm:border-indigo-800/60 sm:pl-4">
                  <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 block">
                    Política de Intentos
                  </span>
                  <span className="text-sm font-black text-indigo-950 dark:text-indigo-100">
                    {maxAttempts === 0 ? 'Sin límite' : maxAttempts === 1 ? '1 intento único' : `${maxAttempts} intentos máx.`}
                  </span>
                </div>
              </div>

              {/* Checkbox de Solicitud de Permiso */}
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="allowRetakeCheckbox"
                  checked={allowRetakeRequest}
                  onChange={(e) => setAllowRetakeRequest(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
                />
                <label htmlFor="allowRetakeCheckbox" className="cursor-pointer">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 block text-xs">
                    Permitir al cursista solicitar autorización de reintento si agota sus oportunidades
                  </span>
                  <span className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed block">
                    Si el cursista agota sus intentos o reprueba, el examen quedará bloqueado y se habilitará un botón para que envíe una <strong>solicitud de desbloqueo académica</strong> para aprobación del profesor.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Resumen de Asignación */}
          <div className="p-3 bg-slate-100/80 dark:bg-slate-800/70 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div>
              <span>Destinatarios: </span>
              <strong className="text-indigo-600 dark:text-indigo-400">{finalRecipientIds.length} alumno(s)</strong>
            </div>
            <div>
              <span>Preguntas: </span>
              <strong className="text-emerald-600 dark:text-emerald-400">{finalQuestionCount} reactivos</strong>
            </div>
            <div>
              <span>Tiempo: </span>
              <strong className="text-amber-600 dark:text-amber-400">
                {timeLimitMinutes === -1 ? customMinutes : timeLimitMinutes} min
              </strong>
            </div>
            <div>
              <span>Intentos: </span>
              <strong className="text-indigo-600 dark:text-indigo-400">
                {maxAttempts === 0 ? 'Ilimitados' : `${maxAttempts} intento(s)`}
              </strong>
            </div>
            <div>
              <span>Mínimo: </span>
              <strong className="text-slate-900 dark:text-white">{minScore}%</strong>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || finalRecipientIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Asignando Examen...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Asignar Examen a {finalRecipientIds.length} Cursista
                    {finalRecipientIds.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
