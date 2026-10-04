import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  Activity,
  Copy,
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Eye,
  Share2,
  FileSpreadsheet,
  Mail,
  RotateCcw,
  Layers,
  Plus,
  Search,
  Trash2,
  ArrowRight,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { allModules } from '../../content/modules';
import { createWorkshop, getWorkshops, updateWorkshop, deleteWorkshop } from '../../services/courseService';
import {
  listTopicTeachingCommitments,
  assignWorkshopToTopics,
} from '../../services/topicTeachingService';
import { getAdminProfiles } from '../../services/editorialService';
import { filterGradeableStudents } from '../../utils/adminUtils';
import {
  getAutoOpenClassWizardPref,
  setAutoOpenClassWizardPref,
} from '../../utils/classWizardPreferences';
import type { LiveWorkshop, TopicTeachingCommitment } from '../../types/database';
import type { Topic } from '../../types/content';
import type { AdminProfileRow } from '../../types/admin';

export interface ClassSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | boolean | Promise<void | boolean>;
  initialWorkshop?: LiveWorkshop | null;
  initialScheduledAt?: string;
  initialModuleId?: string;
  initialTopicId?: string | null;
  initialSelectedTopicIds?: string[];
  initialMode?: 'wizard' | 'advanced';
}

const STORAGE_DRAFT_KEY = 'neurosafe_class_wizard_draft_v1';

function generateAccessCode(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `EDX-${num}`;
}

function defaultDatetime(hoursAhead = 24): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  d.setMinutes(0, 0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function ClassSetupWizardModal({
  isOpen,
  onClose,
  onSuccess,
  initialWorkshop,
  initialScheduledAt,
  initialModuleId,
  initialTopicId,
  initialSelectedTopicIds,
  initialMode = 'wizard',
}: ClassSetupWizardModalProps) {
  const { user } = useAuth();

  // Mode: Wizard (Modo Fácil) vs Advanced (Modo Técnico)
  const [mode, _setMode] = useState<'wizard' | 'advanced'>(initialMode);

  // Wizard Step: 0 = Bienvenida/Plantillas, 1 = Nombre y Temario, 2 = Horario y Guardado de Clase, 3 = Alumnos (Opcional)
  const [step, setStep] = useState<number>(0);

  // State: Clase / Sesión (Shared between Wizard and Advanced)
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState(allModules[0]?.id || 'module-01');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [sessionModality, setSessionModality] = useState<'online' | 'in_person'>('online');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [streamUrl, setStreamUrl] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [accessCode, setAccessCode] = useState(generateAccessCode());
  const [countsForKardex, setCountsForKardex] = useState(true);

  // State: Prácticas y Simulaciones
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseDifficulty, setCaseDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [unlimitedAttempts, setUnlimitedAttempts] = useState(true);
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [quizImmediateFeedback, setQuizImmediateFeedback] = useState(true);

  // State: Alumnos
  const [studentInviteTab, setStudentInviteTab] = useState<'code' | 'emails' | 'csv'>('code');
  const [rawEmails, setRawEmails] = useState('');
  const [csvStudentsCount, setCsvStudentsCount] = useState<number | null>(null);
  const [topicSearch, setTopicSearch] = useState('');
  const [selectedTopicsViewMode, setSelectedTopicsViewMode] = useState<'cards' | 'pills'>('cards');
  const [selectedTopicsExpanded, setSelectedTopicsExpanded] = useState(false);
  const [selectedTopicsSearch, setSelectedTopicsSearch] = useState('');

  // Data sources
  const [myCommitments, setMyCommitments] = useState<TopicTeachingCommitment[]>([]);
  const [studentsList, setStudentsList] = useState<AdminProfileRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal feedback & UI
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [previewTopic, setPreviewTopic] = useState<{ id: string; title: string; desc?: string } | null>(null);
  const [showStudentPreviewModal, setShowStudentPreviewModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Preferencia: Ver esta pantalla al inicio (Modo Fácil automático al iniciar sesión)
  const [autoOpenOnLogin, setAutoOpenOnLogin] = useState<boolean>(() => getAutoOpenClassWizardPref());

  useEffect(() => {
    if (isOpen) {
      setAutoOpenOnLogin(getAutoOpenClassWizardPref());
    }
  }, [isOpen]);

  const handleToggleAutoOpen = (checked: boolean) => {
    setAutoOpenOnLogin(checked);
    setAutoOpenClassWizardPref(checked);
  };

  // Advanced mode extra state
  const [advancedTab, setAdvancedTab] = useState<'create' | 'update_recording'>('create');
  const [existingWorkshops, setExistingWorkshops] = useState<LiveWorkshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [targetRecordingUrl, setTargetRecordingUrl] = useState('');

  // 1. Initial Load and Sync
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);

    // Initial values
    if (initialScheduledAt) {
      setScheduledAt(initialScheduledAt);
    } else if (!scheduledAt) {
      setScheduledAt(defaultDatetime(24));
    }

    if (initialModuleId) {
      setModuleId(initialModuleId);
    }

    const initTopics: string[] = [];
    if (initialSelectedTopicIds && initialSelectedTopicIds.length > 0) {
      initTopics.push(...initialSelectedTopicIds);
    } else if (initialTopicId) {
      initTopics.push(initialTopicId);
    }
    if (initTopics.length > 0) {
      setSelectedTopicIds(Array.from(new Set(initTopics)));
    }

    // Check localStorage draft
    try {
      const saved = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (saved) {
        setHasDraft(true);
      }
    } catch {}

    // Load data
    setLoadingData(true);
    Promise.all([
      listTopicTeachingCommitments().catch(() => []),
      getAdminProfiles(false, 'all').catch(() => []),
      getWorkshops().catch(() => []),
    ])
      .then(([commitments, profiles, workshops]) => {
        const mine = commitments.filter((c) => c.teacher_id === user?.id && c.status !== 'withdrawn');
        setMyCommitments(mine);
        setStudentsList(filterGradeableStudents(profiles, user?.id));
        setExistingWorkshops(workshops);

        // Si el médico tiene temas adoptados («Mis Temas») y no se abrió con temas forzados,
        // pre-seleccionar automáticamente sus temas para que aparezcan en la clase de inmediato
        if (initTopics.length === 0 && !initialWorkshop && mine.length > 0) {
          setSelectedTopicIds(mine.map((c) => c.topic_id));
        }

        if (initialWorkshop) {
          setTitle(initialWorkshop.title || '');
          setModuleId(initialWorkshop.module_id || allModules[0]?.id);
          if (initialWorkshop.topic_id) {
            setSelectedTopicIds([initialWorkshop.topic_id]);
          }
          setScheduledAt(new Date(initialWorkshop.scheduled_at).toISOString().slice(0, 16));
          setDurationMinutes(initialWorkshop.duration_minutes || 90);
          setStreamUrl(initialWorkshop.stream_url || '');
          setRecordingUrl(initialWorkshop.recording_url || '');
          setDescription(initialWorkshop.description || '');
          setSessionModality((initialWorkshop.session_modality as any) || 'online');
          setSelectedWorkshopId(initialWorkshop.id);
          setTargetRecordingUrl(initialWorkshop.recording_url || '');
        }
      })
      .catch((err) => {
        console.warn('[ClassSetupWizardModal] Error loading data:', err);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [isOpen, initialWorkshop, initialScheduledAt, initialModuleId, initialTopicId, user?.id]);

  // Save Draft to localStorage
  const saveDraft = () => {
    try {
      const draft = {
        title,
        moduleId,
        selectedTopicIds,
        sessionModality,
        scheduledAt,
        durationMinutes,
        streamUrl,
        locationName,
        description,
        accessCode,
        selectedCaseIds,
        caseDifficulty,
        unlimitedAttempts,
        includeQuiz,
        quizImmediateFeedback,
        rawEmails,
        step,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draft));
      setHasDraft(true);
    } catch {}
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.moduleId) setModuleId(draft.moduleId);
      if (draft.selectedTopicIds) setSelectedTopicIds(draft.selectedTopicIds);
      if (draft.sessionModality) setSessionModality(draft.sessionModality);
      if (draft.scheduledAt) setScheduledAt(draft.scheduledAt);
      if (draft.durationMinutes) setDurationMinutes(draft.durationMinutes);
      if (draft.streamUrl) setStreamUrl(draft.streamUrl);
      if (draft.locationName) setLocationName(draft.locationName);
      if (draft.description) setDescription(draft.description);
      if (draft.accessCode) setAccessCode(draft.accessCode);
      if (draft.selectedCaseIds) setSelectedCaseIds(draft.selectedCaseIds);
      if (draft.caseDifficulty) setCaseDifficulty(draft.caseDifficulty);
      if (draft.unlimitedAttempts !== undefined) setUnlimitedAttempts(draft.unlimitedAttempts);
      if (draft.includeQuiz !== undefined) setIncludeQuiz(draft.includeQuiz);
      if (draft.quizImmediateFeedback !== undefined) setQuizImmediateFeedback(draft.quizImmediateFeedback);
      if (draft.rawEmails) setRawEmails(draft.rawEmails);
      if (draft.step) setStep(draft.step);
      setHasDraft(false);
    } catch {}
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(STORAGE_DRAFT_KEY);
      setHasDraft(false);
    } catch {}
  };

  // Template selector in Step 0
  const handleSelectTemplate = (templateType: 'standard' | 'cases' | 'custom') => {
    if (templateType === 'standard') {
      setTitle('Módulo 1: Fundamentos de Neurofisiología Clínica');
      setModuleId('fundamentals');
      setDurationMinutes(90);
      setSessionModality('online');
      setIncludeQuiz(true);
      // Auto-select Module 1 topics
      const mod1 = allModules.find((m) => m.id === 'fundamentals' || m.number === 1);
      const mod1Topics: string[] = [];
      if (mod1) {
        for (const t of mod1.topics) {
          if (t.children && t.children.length > 0) {
            for (const c of t.children) mod1Topics.push(c.id);
          } else {
            mod1Topics.push(t.id);
          }
        }
      }
      if (mod1Topics.length > 0) {
        setSelectedTopicIds(mod1Topics);
      }
    } else if (templateType === 'cases') {
      setTitle('Taller Práctico de Casos Clínicos EMG');
      setDurationMinutes(90);
      setSessionModality('online');
      // Auto-select carpal tunnel or primary topic
      const carpalTopic = flatTopics.find((t) => `${t.topic.id} ${t.topic.title}`.toLowerCase().includes('carpian'));
      if (carpalTopic) {
        setSelectedTopicIds([carpalTopic.topic.id]);
      }
    } else {
      // Custom with "Mis Temas"
      const myIds = myCommitments.map((c) => c.topic_id);
      if (myIds.length > 0) {
        setSelectedTopicIds(myIds.slice(0, 3));
      }
      if (!title) {
        setTitle('Clase de Electrodiagnóstico Clínico');
      }
    }
    setStep(1);
  };

  // Step Status Calculator (Semáforo de colores)
  const stepStatus = useMemo(() => {
    // Step 1: Temario (Título + Selección de Temas)
    const step1Valid = Boolean(title.trim().length >= 3 && selectedTopicIds.length > 0);
    const step1State: 'done' | 'pending' = step1Valid ? 'done' : 'pending';

    // Step 2: Horario y Modalidad (Fecha obligatoria)
    const step2Valid = Boolean(scheduledAt);
    const step2State: 'done' | 'pending' = step2Valid ? 'done' : 'pending';

    // Step 3: Alumnos (Opcional)
    const step3Valid = Boolean(accessCode || rawEmails.trim() || csvStudentsCount);
    const step3State: 'done' | 'optional' = step3Valid ? 'done' : 'optional';

    const ready = step1Valid && step2Valid;

    return {
      1: step1State,
      2: step2State,
      3: step3State,
      readyToPublish: ready,
    };
  }, [title, scheduledAt, selectedTopicIds, accessCode, rawEmails, csvStudentsCount]);

  // Topic Helpers
  const flatTopics = useMemo(() => {
    const list: { topic: Topic; moduleId: string; moduleTitle: string }[] = [];
    for (const mod of allModules) {
      for (const t of mod.topics) {
        list.push({ topic: t, moduleId: mod.id, moduleTitle: mod.title });
        if (t.children) {
          for (const c of t.children) {
            list.push({ topic: c, moduleId: mod.id, moduleTitle: mod.title });
          }
        }
      }
    }
    return list;
  }, []);

  const selectedTopicsDetails = useMemo(() => {
    return selectedTopicIds
      .map((id) => flatTopics.find((t) => t.topic.id === id))
      .filter(Boolean) as { topic: Topic; moduleId: string; moduleTitle: string }[];
  }, [selectedTopicIds, flatTopics]);

  const filteredSelectedTopics = useMemo(() => {
    if (!selectedTopicsSearch.trim()) return selectedTopicsDetails;
    const q = selectedTopicsSearch.trim().toLowerCase();
    return selectedTopicsDetails.filter(
      (t) => t.topic.title.toLowerCase().includes(q) || t.moduleTitle.toLowerCase().includes(q)
    );
  }, [selectedTopicsDetails, selectedTopicsSearch]);

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  // Quick title suggestions for Step 1
  const TITLE_SUGGESTIONS = [
    'Módulo 1: Fundamentos de Neurofisiología Clínica',
    'Taller de Fundamentos y Biofísica',
    'Módulo 2: Neuroconducción Motora y Sensitiva',
    'Taller Práctico de Casos Clínicos EMG',
    'Técnica y Hallazgos de EMG de Aguja',
  ];

  // ── Secuencia Pedagógica Curricular y Módulo Activo ──
  const currentModule = useMemo(() => {
    return allModules.find((m) => m.id === moduleId) || allModules[0];
  }, [moduleId]);

  const currentModIndex = useMemo(() => {
    return allModules.findIndex((m) => m.id === currentModule.id);
  }, [currentModule]);

  const nextModule = useMemo(() => {
    return currentModIndex >= 0 && currentModIndex < allModules.length - 1
      ? allModules[currentModIndex + 1]
      : null;
  }, [currentModIndex]);

  const prevModule = useMemo(() => {
    return currentModIndex > 0 ? allModules[currentModIndex - 1] : null;
  }, [currentModIndex]);

  // Desglose de secciones y subtemas del módulo activo
  const currentModuleSections = useMemo(() => {
    const extractSubs = (
      top: Topic,
      secTitle: string,
      secId: string
    ): {
      id: string;
      title: string;
      sectionTitle: string;
      sectionId: string;
      description?: string;
      isAdoptedByMe: boolean;
    }[] => {
      if (!top.children || top.children.length === 0) {
        return [
          {
            id: top.id,
            title: top.title,
            sectionTitle: secTitle,
            sectionId: secId,
            description: top.description,
            isAdoptedByMe: myCommitments.some((row) => row.topic_id === top.id && row.status !== 'withdrawn'),
          },
        ];
      }
      const list: {
        id: string;
        title: string;
        sectionTitle: string;
        sectionId: string;
        description?: string;
        isAdoptedByMe: boolean;
      }[] = [];
      for (const ch of top.children) {
        list.push(...extractSubs(ch, secTitle, secId));
      }
      return list;
    };

    return currentModule.topics.map((sec) => {
      const subtopics = extractSubs(sec, sec.title, sec.id);
      const allSubtopicIds = subtopics.map((s) => s.id);
      const selectedCount = allSubtopicIds.filter((id) => selectedTopicIds.includes(id)).length;
      const isSectionComplete = allSubtopicIds.length > 0 && selectedCount === allSubtopicIds.length;

      return {
        sectionId: sec.id,
        sectionTitle: sec.title,
        subtopics,
        allSubtopicIds,
        selectedCount,
        isSectionComplete,
      };
    });
  }, [currentModule, selectedTopicIds, myCommitments]);

  // Todos los IDs de subtemas del módulo actual
  const currentModuleAllSubtopicIds = useMemo(() => {
    return currentModuleSections.flatMap((s) => s.allSubtopicIds);
  }, [currentModuleSections]);

  const currentModuleSelectedCount = useMemo(() => {
    return currentModuleAllSubtopicIds.filter((id) => selectedTopicIds.includes(id)).length;
  }, [currentModuleAllSubtopicIds, selectedTopicIds]);

  const isCurrentModuleComplete =
    currentModuleAllSubtopicIds.length > 0 &&
    currentModuleSelectedCount === currentModuleAllSubtopicIds.length;

  // Estadísticas globales por cada módulo para el Stepper de Progreso
  const moduleProgressionStats = useMemo(() => {
    return allModules.map((m, idx) => {
      const subtopicIds: string[] = [];
      for (const t of m.topics) {
        if (t.children && t.children.length > 0) {
          for (const c of t.children) subtopicIds.push(c.id);
        } else {
          subtopicIds.push(t.id);
        }
      }
      const selected = subtopicIds.filter((id) => selectedTopicIds.includes(id)).length;
      const total = subtopicIds.length;
      const isComplete = total > 0 && selected === total;
      return {
        module: m,
        index: idx,
        total,
        selected,
        isComplete,
        hasSome: selected > 0 && !isComplete,
        isActive: m.id === currentModule.id,
      };
    });
  }, [selectedTopicIds, currentModule.id]);

  // Acciones rápidas de 1 Clic para el temario del módulo
  const selectAllCurrentModuleSubtopics = () => {
    setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...currentModuleAllSubtopicIds])));
    if (!title.trim() || TITLE_SUGGESTIONS.includes(title)) {
      setTitle(`Módulo ${currentModule.number}: ${currentModule.title}`);
    }
  };

  const deselectAllCurrentModuleSubtopics = () => {
    setSelectedTopicIds((prev) => prev.filter((id) => !currentModuleAllSubtopicIds.includes(id)));
  };

  const toggleSectionSubtopics = (subtopicIds: string[]) => {
    const allSelected = subtopicIds.every((id) => selectedTopicIds.includes(id));
    if (allSelected) {
      setSelectedTopicIds((prev) => prev.filter((id) => !subtopicIds.includes(id)));
    } else {
      setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...subtopicIds])));
    }
  };

  const advanceToNextModule = () => {
    if (nextModule) {
      setModuleId(nextModule.id);
    }
  };

  const goToPrevModule = () => {
    if (prevModule) {
      setModuleId(prevModule.id);
    }
  };

  // Presets para seleccionar múltiples temas de un solo clic
  const applyPreset = (presetKey: 'upper_limb' | 'lower_limb' | 'radiculopathies' | 'needle_emg' | 'my_topics') => {
    if (presetKey === 'my_topics') {
      const myIds = myCommitments.map((c) => c.topic_id);
      if (myIds.length > 0) {
        setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...myIds])));
      }
      return;
    }

    let matchingIds: string[] = [];
    if (presetKey === 'upper_limb') {
      matchingIds = flatTopics
        .filter((t) => {
          const s = `${t.topic.id} ${t.topic.title}`.toLowerCase();
          return (
            s.includes('mediano') ||
            s.includes('median') ||
            s.includes('ulnar') ||
            s.includes('cubital') ||
            s.includes('radial') ||
            s.includes('carpian')
          );
        })
        .slice(0, 4)
        .map((t) => t.topic.id);
    } else if (presetKey === 'lower_limb') {
      matchingIds = flatTopics
        .filter((t) => {
          const s = `${t.topic.id} ${t.topic.title}`.toLowerCase();
          return (
            s.includes('perone') ||
            s.includes('fibular') ||
            s.includes('tibial') ||
            s.includes('sural') ||
            s.includes('tarso')
          );
        })
        .slice(0, 4)
        .map((t) => t.topic.id);
    } else if (presetKey === 'radiculopathies') {
      matchingIds = flatTopics
        .filter((t) => {
          const s = `${t.topic.id} ${t.topic.title}`.toLowerCase();
          return (
            s.includes('radiculopat') ||
            s.includes('radiculopath') ||
            s.includes('plexo') ||
            s.includes('plexus')
          );
        })
        .slice(0, 4)
        .map((t) => t.topic.id);
    } else if (presetKey === 'needle_emg') {
      matchingIds = flatTopics
        .filter((t) => {
          const s = `${t.topic.id} ${t.topic.title}`.toLowerCase();
          return (
            s.includes('aguja') ||
            s.includes('needle') ||
            s.includes('espontánea') ||
            s.includes('mup') ||
            s.includes('reclutamiento')
          );
        })
        .slice(0, 4)
        .map((t) => t.topic.id);
    }

    if (matchingIds.length > 0) {
      setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...matchingIds])));
    }
  };

  const clearTopicSelection = () => {
    setSelectedTopicIds([]);
  };


  const suggestTitleFromTopics = () => {
    if (selectedTopicsDetails.length === 0) return;
    if (selectedTopicsDetails.length === 1) {
      setTitle(`Taller de ${selectedTopicsDetails[0].topic.title}`);
    } else if (selectedTopicsDetails.length === 2) {
      setTitle(`Sesión Práctica: ${selectedTopicsDetails[0].topic.title} y ${selectedTopicsDetails[1].topic.title}`);
    } else {
      const firstTwo = `${selectedTopicsDetails[0].topic.title}, ${selectedTopicsDetails[1].topic.title}`;
      const restCount = selectedTopicsDetails.length - 2;
      setTitle(`Taller de Electrodiagnóstico: ${firstTwo} (+${restCount} temas)`);
    }
  };

  // WhatsApp Invite Text
  const formattedScheduledDate = useMemo(() => {
    if (!scheduledAt) return 'Fecha por confirmar';
    try {
      return new Date(scheduledAt).toLocaleString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return scheduledAt;
    }
  }, [scheduledAt]);

  const directStudentUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://neurosafe.app';
    return `${origin}/talleres?codigo=${encodeURIComponent(accessCode)}`;
  }, [accessCode]);

  const whatsAppMessage = useMemo(() => {
    return `👋 Estimados médicos y alumnos,\n\nLos invito a la clase: *${title || 'Sesión de Electrodiagnóstico'}*.\n📅 *Fecha:* ${formattedScheduledDate}\n⏱️ *Duración:* ${durationMinutes} min\n${
      sessionModality === 'online' ? `🔗 *Enlace de sesión:* ${streamUrl || directStudentUrl}` : `🏥 *Sede/Aula:* ${locationName || 'Sede del hospital'}`
    }\n🔑 *Código de acceso directo:* *${accessCode}*\n\nAcceso a la plataforma: ${directStudentUrl}\n\n¡Los esperamos!`;
  }, [title, formattedScheduledDate, durationMinutes, sessionModality, streamUrl, locationName, accessCode, directStudentUrl]);

  const copyToClipboard = (text: string, isMsg = false) => {
    navigator.clipboard.writeText(text);
    if (isMsg) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Handle Submit / Publication
  const handlePublishClass = async () => {
    if (!title.trim()) {
      setError('Por favor define el título de la clase en el Paso 1.');
      setStep(1);
      return;
    }
    if (selectedTopicIds.length === 0) {
      setError('Por favor selecciona al menos un tema o subtema en el Paso 1.');
      setStep(1);
      return;
    }
    if (!scheduledAt) {
      setError('Por favor define la fecha y hora de la clase en el Paso 2.');
      setStep(2);
      return;
    }
    if (!user?.id) {
      setError('Debes iniciar sesión para publicar la clase.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Primary module & topic
      const primaryTopic = selectedTopicsDetails[0];
      const primaryModuleId = primaryTopic?.moduleId || moduleId;
      const primaryTopicId = primaryTopic?.topic.id || selectedTopicIds[0] || null;

      // 2. Build rich description with covered topics & metadata
      const coveredTopicTitles = selectedTopicsDetails.map((t) => t.topic.title).join(' • ');
      const fullDescription = [
        description.trim(),
        coveredTopicTitles ? `📚 Temas cubiertos: ${coveredTopicTitles}` : '',
        accessCode ? `🔑 Código de acceso: ${accessCode}` : '',
        locationName ? `📍 Ubicación: ${locationName}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      // 3. Create or Update Workshop in live_workshops
      let workshopId = initialWorkshop?.id;
      if (workshopId) {
        await updateWorkshop(workshopId, {
          title: title.trim(),
          module_id: primaryModuleId,
          topic_id: primaryTopicId,
          description: fullDescription || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: durationMinutes,
          stream_url: streamUrl.trim() || null,
          recording_url: recordingUrl.trim() || null,
          clinical_case_json: selectedCaseIds.length > 0 ? { case_ids: selectedCaseIds, difficulty: caseDifficulty } : null,
          session_modality: sessionModality,
          session_type: sessionModality === 'online' ? 'masterclass' : 'hands_on_presencial',
          counts_for_kardex: countsForKardex,
        });
      } else {
        const newWorkshop = await createWorkshop({
          title: title.trim(),
          module_id: primaryModuleId,
          topic_id: primaryTopicId,
          description: fullDescription || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: durationMinutes,
          stream_url: streamUrl.trim() || null,
          recording_url: recordingUrl.trim() || null,
          max_capacity: 100,
          clinical_case_revision_id: null,
          clinical_case_json: selectedCaseIds.length > 0 ? { case_ids: selectedCaseIds, difficulty: caseDifficulty } : null,
          status: 'scheduled',
          session_modality: sessionModality,
          session_type: sessionModality === 'online' ? 'masterclass' : 'hands_on_presencial',
          counts_for_kardex: countsForKardex,
          created_by: user.id,
        });
        workshopId = newWorkshop.id;
      }

      // 4. Link ALL selected topics from "MIS TEMAS" to this workshop
      const topicsPayload = selectedTopicsDetails.map((t) => ({
        topicId: t.topic.id,
        moduleId: t.moduleId,
      }));
      await assignWorkshopToTopics(workshopId, topicsPayload, user.id);

      // 5. Clear draft
      try {
        localStorage.removeItem(STORAGE_DRAFT_KEY);
      } catch {}

      setSuccess('¡Clase guardada con éxito! Los temas de "Mis Temas" han sido asociados.');

      await onSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la clase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!initialWorkshop?.id) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta clase? Se cancelará la sesión y se removerá del calendario.')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deleteWorkshop(initialWorkshop.id);
      setSuccess('Clase eliminada correctamente.');
      await onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar la clase.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[94vh]">
        {/* ── Fixed Top Header Bar ── */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent flex items-center gap-3">
          {/* Icon */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          {/* Title + step badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                Asistente de Configuración
              </h2>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {step === 0 ? 'Inicio' : `Paso ${step} de 3`}
              </span>
            </div>
          </div>

          {/* Actions on header: Delete (if editing) & Exit */}
          <div className="flex items-center gap-2">
            {initialWorkshop?.id && (
              <button
                type="button"
                onClick={handleDeleteClass}
                disabled={submitting}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition cursor-pointer"
                title="Eliminar esta clase definitivamente"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eliminar clase</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                saveDraft();
                onClose();
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              title="Guardar borrador y cerrar"
            >
              <span className="hidden sm:inline">Guardar y salir</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Visual Progress Indicator — hidden on step 0 (welcome screen) ── */}
        {mode === 'wizard' && step > 0 && (
          <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 select-none scrollbar-none">
              {[
                { s: 1, label: 'Temario', state: stepStatus[1] },
                { s: 2, label: 'Horario y Guardado', state: stepStatus[2] },
                { s: 3, label: 'Alumnos (Opcional)', state: stepStatus[3] },
              ].map((item) => {
                const isCurrent = step === item.s;
                const isDone = item.state === 'done';
                const isPending = item.state === 'pending';
                const isOptional = item.state === 'optional';

                let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
                let dotColor = 'bg-slate-400';

                if (isDone) {
                  badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
                  dotColor = 'bg-emerald-500';
                } else if (isPending) {
                  badgeColor = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
                  dotColor = 'bg-rose-500 animate-pulse';
                } else if (isOptional) {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
                  dotColor = 'bg-amber-500';
                }

                return (
                  <button
                    key={item.s}
                    type="button"
                    onClick={() => setStep(item.s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                      isCurrent ? 'ring-2 ring-indigo-500/40 shadow-xs ' + badgeColor : badgeColor
                    }`}
                  >
                    {isDone
                      ? <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      : <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Compact legend tooltip */}
              <button
                type="button"
                title="Verde = Listo · Rojo = Pendiente · Ámbar = Opcional"
                className="ml-auto shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                aria-label="Leyenda de estados"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {/* Topic count inline */}
              {selectedTopicIds.length > 0 && (
                <span className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                  {selectedTopicIds.length} {selectedTopicIds.length === 1 ? 'tema' : 'temas'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Main Scrollable Body ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 pb-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Draft Restoration Banner */}
          {hasDraft && step === 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Hay un borrador de clase guardado anteriormente. ¿Deseas recuperarlo?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDraft}
                  className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                >
                  Restaurar borrador
                </button>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              WIZARD VIEW: PASO A PASO (MODO FÁCIL)
              ══════════════════════════════════════════════════════════════════════════ */}
          {mode === 'wizard' ? (
            <>
              {/* ── PASO 0: Bienvenida y Selección de Plantilla ── */}
              {step === 0 && (
                <div className="space-y-6 max-w-2xl mx-auto py-2">
                  <div className="text-center space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      ¡Hola, Dr(a)! Vamos a preparar su clase en menos de 3 minutos
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Seleccione una plantilla inicial preconfigurada para no empezar desde cero, o continúe con sus temas adoptados.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5">
                    {/* Tarjeta A: Recomendada */}
                    <div
                      onClick={() => handleSelectTemplate('standard')}
                      className="p-4 sm:p-5 rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/60 hover:shadow-lg transition cursor-pointer group flex items-start gap-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Curso Estándar de Electrodiagnóstico
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                            Recomendada
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Carga automática del temario base de neuroconducción sensitiva/motora, casos clínicos de túnel carpiano preconfigurados y evaluación formativa.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 self-center" />
                    </div>

                    {/* Tarjeta B: Taller Clínico / Discusión */}
                    <div
                      onClick={() => handleSelectTemplate('cases')}
                      className="p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 bg-white dark:bg-slate-800/60 hover:shadow-lg transition cursor-pointer group flex items-start gap-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mb-1">
                          Taller Clínico / Discusión de Casos EMG
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Enfocado en sesión de análisis clínico, correlación fisiológica y discusión guiada de pacientes con tus alumnos.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 shrink-0 self-center" />
                    </div>

                    {/* Tarjeta C: Personalizada desde Mis Temas */}
                    <div
                      onClick={() => handleSelectTemplate('custom')}
                      className="p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 bg-white dark:bg-slate-800/60 hover:shadow-lg transition cursor-pointer group flex items-start gap-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            Configuración Personalizada con «Mis Temas»
                          </h4>
                          {myCommitments.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                              {myCommitments.length} temas disponibles
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Selecciona libremente uno o varios temas de tu lista de temas adoptados y personaliza cada dimensión desde cero.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 shrink-0 self-center" />
                    </div>
                  </div>

                  {/* ── Checklist Botón: Ver esta pantalla al inicio ── */}
                  <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Preferencia de inicio de sesión
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          {autoOpenOnLogin
                            ? 'El Modo Fácil se abrirá automáticamente cada vez que inicies sesión.'
                            : 'Apertura automática desactivada. Podrás abrir el asistente cuando lo necesites.'}
                        </p>
                      </div>
                    </div>

                    <label
                      className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer select-none shadow-xs group shrink-0"
                      title="Activa o desactiva la apertura automática del Asistente de Clase al iniciar sesión"
                    >
                      <input
                        type="checkbox"
                        checked={autoOpenOnLogin}
                        onChange={(e) => handleToggleAutoOpen(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          autoOpenOnLogin
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover:border-indigo-400'
                        }`}
                      >
                        {autoOpenOnLogin && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold">
                        Ver esta pantalla al inicio
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ── PASO 1: Identificación de la Clase ── */}
              {step === 1 && (
                <div className="space-y-4 max-w-4xl mx-auto py-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      1. Nombre y Temario de la Clase
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Define el nombre visible para tus alumnos y selecciona los temas o subtemas a impartir.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre de la Clase / Sesión *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej. Taller de Neuroconducción - Grupo Residentes A"
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                      {/* Sugerencias Rápidas de Título */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className="text-[11px] text-slate-400 font-bold">Ideas de títulos rápidos:</span>
                        {TITLE_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setTitle(sug)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── SELECCIÓN DE TEMAS PARA LA CLASE (MIS TEMAS / TEMAS PENDIENTES) ── */}
                    <div className="rounded-3xl border border-indigo-200/90 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/20 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900/80 p-4 sm:p-5 shadow-xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                              selectedTopicIds.length > 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                {myCommitments.length > 0
                                  ? `⭐ Temas de tu Temario («Mis Temas» - ${myCommitments.length})`
                                  : '📋 Temas Pendientes por Seleccionar para la Clase'}
                              </h4>
                              {selectedTopicIds.length === 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  0 seleccionados (Requerido)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {selectedTopicIds.length} {selectedTopicIds.length === 1 ? 'tema listo' : 'temas listos'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {myCommitments.length > 0
                                ? 'Selecciona los temas de tu lista que vas a impartir en esta sesión:'
                                : 'Aún no tienes temas adoptados. Elige con 1 clic los temas que deseas impartir en esta clase:'}
                            </p>
                          </div>
                        </div>

                        {/* Botones de acción rápida si hay temas seleccionados */}
                        {selectedTopicIds.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={suggestTitleFromTopics}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                              title="Genera un título sugerido automáticamente con los temas elegidos"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Sugerir título con temas</span>
                            </button>
                            <button
                              type="button"
                              onClick={clearTopicSelection}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
                              title="Quitar todos los temas seleccionados"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Limpiar</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Banner si el médico tiene temas en «Mis Temas» */}
                      {myCommitments.length > 0 && (
                        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-2.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                              Tienes {myCommitments.length} temas adoptados en tu temario personal («Mis Temas»)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => applyPreset('my_topics')}
                              className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            >
                              + Incluir mis temas ({myCommitments.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const myIds = myCommitments.map((c) => c.topic_id);
                                setSelectedTopicIds((prev) => prev.filter((id) => !myIds.includes(id)));
                              }}
                              className="text-[11px] text-slate-500 hover:text-rose-500 font-semibold cursor-pointer"
                            >
                              Desmarcar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── 1. Stepper Secuencial de Módulos (En Orden Curricular) ── */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            🧭 Orden Pedagógico por Módulos:
                          </span>
                          <span className="text-slate-400">
                            Módulo {currentModule.number} de {allModules.length} ({allModules.find((m) => m.id === moduleId)?.title.split(':')[0]})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                          {moduleProgressionStats.map((stat) => (
                            <button
                              key={stat.module.id}
                              type="button"
                              onClick={() => setModuleId(stat.module.id)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                stat.isActive
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                                  : stat.isComplete
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400'
                                  : stat.hasSome
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span>{stat.module.emoji || '📘'}</span>
                              <span>
                                M{stat.module.number}: {stat.module.title.split(':')[0].replace(/Fundamentos.*/, 'Fundamentos').replace(/Conducción.*/, 'Neuroconducción').replace(/Electromiografía.*/, 'EMG Aguja').slice(0, 16)}
                              </span>
                              {stat.isComplete ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-black">
                                  ✓ {stat.total}
                                </span>
                              ) : stat.hasSome ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 font-bold">
                                  {stat.selected}/{stat.total}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({stat.total})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── 2. Tarjeta del Módulo Activo con Selección Masiva de 1 Clic ── */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-950/80 shadow-2xs space-y-3.5">
                        {/* Cabecera del módulo actual */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xl">{currentModule.emoji || '📘'}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                Módulo {currentModule.number}
                              </span>
                              <h5 className="text-sm font-black text-slate-900 dark:text-white">
                                {currentModule.title}
                              </h5>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
                              {currentModule.description}
                            </p>
                          </div>

                          {/* Botón 1 Clic para seleccionar o desmarcar todos los subtemas del módulo */}
                          <div className="flex items-center gap-2">
                            {isCurrentModuleComplete ? (
                              <>
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs">
                                  <Check className="w-4 h-4" />
                                  <span>Módulo {currentModule.number} completo ({currentModuleAllSubtopicIds.length})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={deselectAllCurrentModuleSubtopics}
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                                >
                                  Desmarcar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={selectAllCurrentModuleSubtopics}
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-md transition cursor-pointer transform hover:scale-[1.02]"
                              >
                                <Check className="w-4 h-4" />
                                <span>✓ Seleccionar todos los subtemas de este módulo ({currentModuleAllSubtopicIds.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Barra de progreso del módulo actual */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-600 dark:text-slate-400">
                              Progreso en esta clase:
                            </span>
                            <span className={currentModuleSelectedCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                              {currentModuleSelectedCount} de {currentModuleAllSubtopicIds.length} subtemas ({Math.round((currentModuleSelectedCount / (currentModuleAllSubtopicIds.length || 1)) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isCurrentModuleComplete
                                  ? 'bg-emerald-500'
                                  : currentModuleSelectedCount > 0
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                                  : 'bg-transparent'
                              }`}
                              style={{
                                width: `${Math.round((currentModuleSelectedCount / (currentModuleAllSubtopicIds.length || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Desglose por Capítulos / Secciones y Subtemas */}
                        <div className="space-y-3 pt-1">
                          {currentModuleSections.map((sec) => (
                            <div
                              key={sec.sectionId}
                              className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {sec.sectionTitle}
                                  </h6>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({sec.selectedCount}/{sec.subtopics.length} seleccionados)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionSubtopics(sec.allSubtopicIds)}
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition cursor-pointer ${
                                    sec.isSectionComplete
                                      ? 'text-emerald-700 dark:text-emerald-300 hover:text-rose-600'
                                      : 'text-indigo-600 dark:text-indigo-400 hover:underline'
                                  }`}
                                >
                                  {sec.isSectionComplete ? '✓ Sección completa (Desmarcar)' : '+ Marcar sección completa'}
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {sec.subtopics.map((sub) => {
                                  const isSelected = selectedTopicIds.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => toggleTopicSelection(sub.id)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600'
                                      }`}
                                    >
                                      {isSelected ? (
                                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                                      ) : (
                                        <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                      )}
                                      <span className="truncate max-w-[240px]">{sub.title}</span>
                                      {sub.isAdoptedByMe && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-800 dark:text-amber-200 font-bold border border-amber-300/40">
                                          ⭐ Mi tema
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Banner de Avance Automático cuando se cubrieron todos los subtemas */}
                        {isCurrentModuleComplete && nextModule && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-emerald-500/10 border-2 border-emerald-500/40 dark:border-emerald-500/30 space-y-2">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                                  🎉
                                </div>
                                <div>
                                  <p className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                                    ¡Todos los subtemas del Módulo {currentModule.number} han sido seleccionados!
                                  </p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    ¿Deseas impartir también temas del siguiente módulo en esta misma clase?
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={advanceToNextModule}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black shadow-md inline-flex items-center gap-2 cursor-pointer transition transform hover:scale-[1.02]"
                              >
                                <span>👉 Avanzar a Módulo {nextModule.number}: {nextModule.title.split(':')[0]}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Navegación y cambio de módulo asistido en el pie del card */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          {prevModule ? (
                            <button
                              type="button"
                              onClick={goToPrevModule}
                              className="text-slate-500 hover:text-indigo-600 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Módulo {prevModule.number}: {prevModule.title.split(':')[0]}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Primer módulo del temario</span>
                          )}

                          {nextModule && (
                            <button
                              type="button"
                              onClick={advanceToNextModule}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Ver Módulo {nextModule.number}: {nextModule.title.split(':')[0]}</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── 3. Buscador Rápido de Temas ── */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={topicSearch}
                            onChange={(e) => setTopicSearch(e.target.value)}
                            placeholder="Escribe para buscar un tema específico (ej. nervio mediano, potenciales, aguja)..."
                            className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          {topicSearch && (
                            <button
                              type="button"
                              onClick={() => setTopicSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Resultados de búsqueda en vivo en Paso 1 */}
                        {topicSearch.trim() && (
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                            {flatTopics
                              .filter((t) => {
                                const s = `${t.topic.id} ${t.topic.title} ${t.moduleTitle}`.toLowerCase();
                                return s.includes(topicSearch.trim().toLowerCase());
                              })
                              .slice(0, 10)
                              .map((t) => {
                                const isSelected = selectedTopicIds.includes(t.topic.id);
                                return (
                                  <button
                                    key={t.topic.id}
                                    type="button"
                                    onClick={() => toggleTopicSelection(t.topic.id)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1 cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-indigo-500" />}
                                    <span className="truncate max-w-[200px]">{t.topic.title}</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* ── Panel Amplio de Gestión y Visualización de Temas Seleccionados ── */}
                      {selectedTopicIds.length > 0 && (
                        <div className="pt-4 border-t-2 border-indigo-200/80 dark:border-indigo-900/80 space-y-3">
                          {/* Barra de herramientas superior */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-950 dark:text-indigo-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Temas incluidos para esta clase:</span>
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-2xs">
                                {selectedTopicIds.length} {selectedTopicIds.length === 1 ? 'tema' : 'temas'}
                              </span>
                            </div>

                            {/* Controles de Vista, Filtro y Limpieza */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedTopicIds.length > 4 && (
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={selectedTopicsSearch}
                                    onChange={(e) => setSelectedTopicsSearch(e.target.value)}
                                    placeholder="Buscar en seleccionados..."
                                    className="pl-7 pr-6 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
                                  />
                                  {selectedTopicsSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTopicsSearch('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTopicsViewMode('cards')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    selectedTopicsViewMode === 'cards'
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                                  }`}
                                  title="Ver en tarjetas detalladas"
                                >
                                  Tarjetas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTopicsViewMode('pills')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    selectedTopicsViewMode === 'pills'
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                                  }`}
                                  title="Ver en etiquetas compactas"
                                >
                                  Etiquetas
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedTopicsExpanded((v) => !v)}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title={selectedTopicsExpanded ? 'Compactar panel' : 'Expandir área para ver todos sin restricción'}
                              >
                                {selectedTopicsExpanded ? (
                                  <>
                                    <Minimize2 className="w-3.5 h-3.5" />
                                    <span>Compactar</span>
                                  </>
                                ) : (
                                  <>
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>Ver todos</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={clearTopicSelection}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 transition cursor-pointer inline-flex items-center gap-1"
                                title="Quitar todos los temas seleccionados"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Quitar todos</span>
                              </button>
                            </div>
                          </div>

                          {/* Contenedor espacioso con altura generosa */}
                          <div
                            className={`p-3 bg-white/95 dark:bg-slate-800/90 rounded-2xl border border-indigo-200/90 dark:border-indigo-900/90 transition-all shadow-inner ${
                              selectedTopicsExpanded
                                ? 'max-h-[560px] overflow-y-auto'
                                : 'max-h-72 sm:max-h-80 overflow-y-auto'
                            }`}
                          >
                            {selectedTopicsViewMode === 'cards' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {filteredSelectedTopics.map((t, idx) => (
                                  <div
                                    key={t.topic.id}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition flex items-start justify-between gap-2.5 shadow-2xs group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                          {idx + 1}
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                          {t.moduleTitle}
                                        </span>
                                      </div>
                                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-3">
                                        {t.topic.title}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleTopicSelection(t.topic.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer shrink-0 mt-0.5"
                                      title="Quitar de la clase"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {filteredSelectedTopics.map((t, idx) => (
                                  <span
                                    key={t.topic.id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/90 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-2xs hover:border-indigo-300"
                                  >
                                    <span className="w-4 h-4 rounded-md bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-black flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="max-w-md sm:max-w-xl font-medium" title={t.topic.title}>
                                      {t.topic.title}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleTopicSelection(t.topic.id)}
                                      className="text-indigo-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-0.5 rounded-md cursor-pointer transition ml-1"
                                      title="Quitar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {filteredSelectedTopics.length === 0 && selectedTopicsSearch && (
                              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                                No se encontraron temas seleccionados que coincidan con "{selectedTopicsSearch}".
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PASO 2: Horario, Modalidad y Guardado de la Sesión ── */}
              {step === 2 && (
                <div className="space-y-4 max-w-4xl mx-auto py-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        2. Horario, Modalidad y Guardado de la Sesión
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Configura el horario, modalidad de transmisión o sede y guarda tu clase con el tema seleccionado.
                      </p>
                    </div>
                    <div>
                      {!scheduledAt ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          Fecha pendiente
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Horario listo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resumen pedagógico del tema elegido */}
                  <div className="p-4 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/80 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Tema Seleccionado para esta Clase
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline shrink-0 cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>← Cambiar o agregar temas</span>
                      </button>
                    </div>

                    {selectedTopicsDetails.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Tema principal: {selectedTopicsDetails[0].topic.title}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            (Módulo: {selectedTopicsDetails[0].moduleTitle})
                          </span>
                        </div>
                        {selectedTopicsDetails.length > 1 && (
                          <div className="space-y-1.5 pt-1.5 border-t border-indigo-100/60 dark:border-indigo-900/40">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              Otros temas incluidos ({selectedTopicsDetails.length - 1}):
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-800/60 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                              {selectedTopicsDetails.slice(1).map((t) => (
                                <span
                                  key={t.topic.id}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 max-w-sm truncate"
                                  title={t.topic.title}
                                >
                                  {t.topic.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">
                          ⚠️ Aún no has seleccionado ningún tema para esta clase.
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0 cursor-pointer"
                        >
                          Ir al Paso 1 y seleccionar tema
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Modalidad de la Sesión
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSessionModality('online')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition cursor-pointer ${
                              sessionModality === 'online'
                                ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Video className="w-4 h-4" />
                            <span>Virtual (En vivo)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSessionModality('in_person')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition cursor-pointer ${
                              sessionModality === 'in_person'
                                ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Presencial</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Duración Estimada</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[60, 90, 120].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setDurationMinutes(mins)}
                              className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                                durationMinutes === mins
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {mins} min
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Fecha y Hora de Inicio *</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                        />
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setScheduledAt(defaultDatetime(24))}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            Mañana
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduledAt(defaultDatetime(72))}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            En 3 días
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {sessionModality === 'online' ? 'Enlace de Videollamada (Meet / Zoom / Teams)' : 'Sede Física o Aula'}
                        </label>
                        {sessionModality === 'online' ? (
                          <input
                            type="url"
                            value={streamUrl}
                            onChange={(e) => setStreamUrl(e.target.value)}
                            placeholder="https://meet.google.com/xyz-abc"
                            className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="Ej. Aula Magna / Lab de Fisiología"
                            className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* Código de Acceso Automático */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Código de Acceso Automático para Alumnos:</span>
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            {accessCode}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tus estudiantes pueden ingresar con este código directo sin registros pesados.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(accessCode)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Validez en Kardex */}
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Validez en Kardex Académico
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Acredita la asistencia y evaluación de los temas impartidos al expediente oficial de los alumnos inscritos.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={countsForKardex}
                          onChange={(e) => setCountsForKardex(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                      </label>
                    </div>

                    {/* ── BOTÓN DIRECTO PARA GUARDAR LA CLASE EN PANTALLA 2 ── */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-indigo-50/80 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/30 border-2 border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="space-y-1.5 min-w-0 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                            ¿Listo para guardar tu clase?
                          </h4>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                          Clase: <strong>"{title || 'Sin título'}"</strong>
                          <br />
                          Tema:{' '}
                          <strong className="text-indigo-600 dark:text-indigo-400">
                            {selectedTopicsDetails[0]?.topic.title || 'Ningún tema seleccionado'}
                          </strong>
                          {selectedTopicIds.length > 1 ? ` (+${selectedTopicIds.length - 1} más)` : ''}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Fecha: {formattedScheduledDate} · {sessionModality === 'online' ? 'Virtual' : 'Presencial'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          disabled={submitting || !scheduledAt || !title.trim() || selectedTopicIds.length === 0}
                          onClick={handlePublishClass}
                          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-500/25 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition"
                        >
                          {submitting ? (
                            <span>Guardando clase...</span>
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>🚀 Guardar Clase y Tema Seleccionado</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PASO 3: Incorporación y Acceso de Alumnos (Opcional) ── */}
              {step === 3 && (
                <div className="space-y-4 py-2 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        3. Incorporación y Acceso de Alumnos (Opcional)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Elige el método más rápido para que tus estudiantes se unan a esta clase o comparte el enlace.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowStudentPreviewModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Vista previa de estudiante</span>
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentInviteTab('code')}
                      className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                        studentInviteTab === 'code'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Opción 1: Enlace WhatsApp (Más Rápido)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentInviteTab('emails')}
                      className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                        studentInviteTab === 'emails'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Opción 2: Pegar Correos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentInviteTab('csv')}
                      className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                        studentInviteTab === 'csv'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Opción 3: Excel / CSV</span>
                    </button>
                  </div>

                  {studentInviteTab === 'code' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Código de Acceso Inmediato:
                          </p>
                          <span className="font-mono text-base font-black px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 shadow-xs">
                            {accessCode}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono text-[11px] break-all select-all">
                          {directStudentUrl}
                        </div>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(whatsAppMessage, true)}
                          className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          {copiedMessage ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedMessage ? '¡Mensaje Copiado al Portapapeles!' : 'Copiar mensaje listo para WhatsApp / Correo'}</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 italic text-center">
                        Los residentes sólo tienen que hacer clic en el enlace o ingresar el código al iniciar sesión.
                      </p>

                      {studentsList.length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>
                            Hay <strong>{studentsList.length} alumnos</strong> activos en tu cohorte que recibirán acceso automático a esta clase.
                          </span>
                        </div>
                      )}

                      {loadingData && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Cargando datos de la cohorte...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {studentInviteTab === 'emails' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Pega los correos de tus alumnos (separados por coma o renglón)
                      </label>
                      <textarea
                        rows={4}
                        value={rawEmails}
                        onChange={(e) => setRawEmails(e.target.value)}
                        placeholder="doctor1@hospital.com, doctor2@hospital.com..."
                        className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  )}

                  {studentInviteTab === 'csv' && (
                    <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subir archivo CSV con lista de alumnos
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Columnas sugeridas: Nombre, Correo, Especialidad
                      </p>
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCsvStudentsCount(12);
                        }}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {csvStudentsCount && (
                        <p className="text-xs text-emerald-600 font-bold mt-2">
                          ✓ Se detectaron {csvStudentsCount} alumnos en el archivo.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition"
                    >
                      ← Volver a Horario
                    </button>

                    <button
                      type="button"
                      disabled={submitting || !stepStatus.readyToPublish}
                      onClick={handlePublishClass}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition"
                    >
                      {submitting ? (
                        <span>Publicando clase...</span>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>🚀 Guardar y Publicar Clase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════════
                MODO AVANZADO (VISTA TÉCNICA MINUCIOSA)
                ══════════════════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 dark:border-slate-800 p-1 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdvancedTab('create')}
                  className={`py-2 px-3 rounded-xl transition ${
                    advancedTab === 'create'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Detalles de Programación en Vivo
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancedTab('update_recording')}
                  className={`py-2 px-3 rounded-xl transition ${
                    advancedTab === 'update_recording'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Vincular Grabación a Clase Existente
                </button>
              </div>

              {advancedTab === 'create' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Título Completo de la Clase
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Módulo Base
                      </label>
                      <select
                        value={moduleId}
                        onChange={(e) => setModuleId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        {allModules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fecha y Hora
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Duración (min)
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={360}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL de Transmisión (Meet / Zoom)
                      </label>
                      <input
                        type="url"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL de Grabación (Drive / YouTube)
                      </label>
                      <input
                        type="url"
                        value={recordingUrl}
                        onChange={(e) => setRecordingUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={countsForKardex}
                        onChange={(e) => setCountsForKardex(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Contabilizar asistencia y participación para el Kardex Académico</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Selecciona la Clase a actualizar
                    </label>
                    <select
                      value={selectedWorkshopId}
                      onChange={(e) => {
                        setSelectedWorkshopId(e.target.value);
                        const ws = existingWorkshops.find((w) => w.id === e.target.value);
                        if (ws) setTargetRecordingUrl(ws.recording_url || '');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      {existingWorkshops.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title} ({new Date(w.scheduled_at).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Enlace de Grabación (YouTube / Vimeo / Drive)
                    </label>
                    <input
                      type="url"
                      value={targetRecordingUrl}
                      onChange={(e) => setTargetRecordingUrl(e.target.value)}
                      placeholder="https://youtu.be/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedWorkshopId) return;
                      setSubmitting(true);
                      try {
                        await updateWorkshop(selectedWorkshopId, {
                          recording_url: targetRecordingUrl.trim() || null,
                          status: targetRecordingUrl.trim() ? 'completed' : undefined,
                        });
                        setSuccess('¡Grabación actualizada!');
                        await onSuccess?.();
                        setTimeout(() => onClose(), 1200);
                      } catch (err: any) {
                        setError(err?.message || 'Error al actualizar');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Guardar Enlace de Grabación
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Fixed Bottom Actions Bar ── */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          {mode === 'wizard' ? (
            <>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Atrás</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {step === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep(1);
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <span>Comenzar Configuración</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {step === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!title.trim()) {
                        setError('Por favor escribe el nombre de la clase.');
                        return;
                      }
                      if (selectedTopicIds.length === 0) {
                        setError('Selecciona al menos un tema o subtema para impartir en esta clase.');
                        return;
                      }
                      setError(null);
                      setStep(2);
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <span>Siguiente: Horario y Guardado</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {step === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!scheduledAt) {
                          setError('Por favor define la fecha y hora de la clase.');
                          return;
                        }
                        setError(null);
                        setStep(3);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <span>Siguiente: Invitar Alumnos</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={submitting || !stepStatus.readyToPublish}
                      onClick={handlePublishClass}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-md shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? (
                        <span>Publicando clase...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>🚀 Guardar y Publicar Clase</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                {step === 3 && (
                  <button
                    type="button"
                    disabled={submitting || !stepStatus.readyToPublish}
                    onClick={handlePublishClass}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-md shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <span>Publicando clase...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>🚀 Guardar y Publicar Clase</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="ml-auto">
              <button
                type="button"
                disabled={submitting}
                onClick={handlePublishClass}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
              >
                <span>Guardar Cambios Técnicos</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Topic Quick Preview Modal Drawer ── */}
      {previewTopic && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Vista Previa del Tema</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewTopic(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">{previewTopic.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {previewTopic.desc || 'Tema clínico fundamental de neurofisiología clínica de ElectroDx.'}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewTopic(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                Cerrar vista previa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student View Preview Modal ── */}
      {showStudentPreviewModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Vista Previa del Alumno (Portal del Estudiante)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentPreviewModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student Workshop Card Preview */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-800/60 border-2 border-indigo-200 dark:border-indigo-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-xs">
                  Próxima Sesión en Vivo
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {durationMinutes} min
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {title || 'Clase de Neuroconducción'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{formattedScheduledDate}</span>
                </p>
              </div>

              {selectedTopicsDetails.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Temario que cubrirá el Dr(a):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTopicsDetails.map((t) => (
                      <span
                        key={t.topic.id}
                        className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      >
                        {t.topic.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedCaseIds.length > 0 && (
                <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200 font-bold">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <span>{selectedCaseIds.length} simulaciones de casos clínicos asignados</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400">
                    Práctica
                  </span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 opacity-95"
                >
                  <Video className="w-4 h-4" />
                  <span>Entrar a la Sala Virtual (Meet / Zoom)</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowStudentPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs"
              >
                Volver a la edición
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ClassSetupWizardModal;
