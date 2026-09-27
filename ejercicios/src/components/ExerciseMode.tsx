// ExerciseMode.tsx — Componente principal del modo ejercicio interactivo
// v3: Trazados interactivos, Auscultador EMG, Mapeo de Miotomas, Asignación Docente
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Activity, Zap, CheckCircle, XCircle, ChevronRight, ChevronLeft,
  Trophy, Target, Clock, Lightbulb, BookOpen, User, Stethoscope,
  Award, TrendingUp, AlertTriangle, Eye, Filter, HelpCircle, ChevronDown,
  Volume2, VolumeX, CheckCircle2, Layers, Lock } from 'lucide-react';
import { ClinicalCaseEngine } from '../services/ClinicalCaseEngine';
import { useExerciseStore } from '../store/exerciseStore';
import type { ClinicalCase, Difficulty, DiagnosisOption, EvaluationResult, ExerciseAttempt } from '../types/ClinicalCase';
import { ALL_CASE_TEMPLATES, type CaseTemplate } from '../data/CaseTemplates';
import { NcsTraceOscilloscope } from './tools/NcsTraceOscilloscope';
import { emgAudio } from './tools/EmgAudioSimulator';
import { MyotomeBodyMap } from './tools/MyotomeBodyMap';
import { useAuth } from '../../../src/contexts/AuthProvider';
import {
  loadAllCaseTemplates,
  loadPublicExerciseIds,
  submitClinicalCaseAssignment,
  startClinicalCaseAssignment,
  loadClinicalAssignmentLaunch,
  loadClinicalCaseLock,
  saveClinicalCaseLock,
  type ClinicalAssignmentLaunchState,
  type ClinicalCaseSessionLock,
} from '../../../src/services/emgExerciseService';
import type { ClinicalCaseAttemptRecord, ClinicalCaseSnapshot } from '../../../src/types/studentPlan';
import { scoreClinicalDiagnosis } from '../../../src/utils/clinicalCaseScoring';
import { PublicSimulatorAuthBar } from '../../../src/components/exercise/PublicSimulatorAuthBar';

type ExerciseStep = 'config' | 'case' | 'ncs' | 'emg' | 'diagnosis' | 'feedback';

const STEPS: ExerciseStep[] = ['config', 'case', 'ncs', 'emg', 'diagnosis', 'feedback'];

// Categories for filter
const CATEGORY_LABELS: Record<string, string> = {
  all: 'Todos',
  normal: 'Normal',
  axonal: 'Axonal',
  demyelinating: 'Desmielinizante',
  myopathic: 'Miopática',
  entrapment: 'Atrapamiento',
  radiculopathy: 'Radiculopatía',
  plexopathy: 'Plexopatía',
  motor_neuron_disease: 'Enf. Motoneurona',
  neuromuscular_junction: 'Unión NM',
  pitfall: '⚠️ Trampa',
};

// Hints per pattern
const PATTERN_HINTS: Record<string, string[]> = {
  normal: [
    'Revisa si todas las velocidades de conducción están dentro de rangos normales.',
    'Observa la actividad espontánea en EMG — ¿hay fibrilaciones u ondas positivas?',
    'En un estudio normal, tanto NCS como EMG deben estar dentro de parámetros fisiológicos.',
  ],
  acute_axonal_neuropathy: [
    'Busca amplitudes CMAP/SNAP reducidas con velocidades relativamente preservadas.',
    'La presencia de fibrilaciones y ondas positivas indica denervación ACTIVA.',
    'Las velocidades ligeramente reducidas son secundarias a pérdida de fibras rápidas, no desmielinización primaria.',
  ],
  chronic_axonal_neuropathy: [
    'Busca PUM de larga duración y alta amplitud (reinervación colateral).',
    'La actividad espontánea debería ser escasa o ausente — la denervación ya cesó.',
    'El patrón es longitud-dependiente: peor distalmente.',
  ],
  demyelinating_neuropathy: [
    'Las velocidades de conducción deberían estar marcadamente reducidas (<70% del límite inferior).',
    'Las latencias distales estarán prolongadas, pero las amplitudes relativamente preservadas.',
    'La EMG puede ser relativamente normal — la desmielinización no causa denervación directa.',
  ],
  myopathy: [
    'Busca PUM de CORTA duración y BAJA amplitud en músculos proximales.',
    'El reclutamiento debería ser PRECOZ (muchas unidades con poco esfuerzo).',
    'Las conducciones nerviosas deberían ser normales — el problema es muscular.',
  ],
  carpal_tunnel_syndrome_moderate: [
    'Compara las latencias del mediano vs. cubital — ¿hay diferencia significativa?',
    'La latencia sensitiva del mediano debería estar más prolongada que la motora.',
    'Los nervios que NO son mediano deberían estar normales — la lesión es focal.',
  ],
  c5_c6_radiculopathy: [
    'Busca denervación en músculos del miotoma C5-C6 (bíceps, deltoides, braquiorradial).',
    'Los paraespinales cervicales afectados confirman el nivel radicular (vs. plexopatía).',
    'Las conducciones sensitivas deberían ser normales — la lesión es PROXIMAL al ganglio dorsal.',
  ],
  als: [
    'Busca denervación en múltiples regiones corporales (cervical, torácica, lumbar).',
    'Las conducciones SENSITIVAS deben estar normales — MND no afecta neuronas sensitivas.',
    'Las fasciculaciones difusas + PUM gigantes + fibrilaciones = enfermedad de motoneurona.',
  ],
  upper_brachial_plexopathy: [
    'Compara SNAP vs distribución motora — en plexopatía los SNAP están anormales (post-ganglionar).',
    'Los paraespinales cervicales NORMALES excluyen radiculopatía.',
    'Busca un patrón de tronco superior (C5-C6): deltoides, bíceps, infraespinoso.',
  ],
  lower_brachial_plexopathy: [
    'El SNAP del cutáneo antebraquial medial anormal distingue plexopatía de neuropatía cubital.',
    'Busca compromiso C8-T1 que cruce múltiples nervios periféricos.',
    'Síndrome de Horner (ptosis, miosis) sugiere afección simpática T1.',
  ],
  myasthenia_gravis: [
    'Las NCS de rutina deberían ser NORMALES — la clave está en la ENR.',
    'Busca decremento >10% a 3Hz en musculatura proximal o facial.',
    'La EMG de rutina debería ser normal — MG no causa denervación.',
  ],
  lems: [
    'Los CMAPs basales deberían estar DIFUSAMENTE reducidos.',
    'La PISTA clave: facilitación post-ejercicio >100% (CMAPs duplican o triplican).',
    'Sensitivos normales + síntomas autonómicos + debilidad proximal MMII.',
  ],
  gbs_classic: [
    'Busca desmielinización AGUDA DIFUSA con bloqueos de conducción.',
    'Las ondas F son el hallazgo más precoz: ausentes o muy prolongadas.',
    'Antecedente infeccioso 1-3 semanas antes es típico.',
  ],
  cidp: [
    'Similar a GBS pero CRÓNICO (>8 semanas).',
    'Bloqueos de conducción + dispersión temporal + F prolongadas en múltiples nervios.',
    'Debilidad tanto proximal como distal (a diferencia de neuropatía axonal).',
  ],
  ulnar_neuropathy_elbow: [
    'Compara velocidad DISTAL vs A TRAVÉS DEL CODO — la caída focal es diagnóstica.',
    'El nervio mediano debe ser completamente normal.',
    'FCU puede estar normal (se ramifica justo distal al codo).',
  ],
  peroneal_neuropathy: [
    'Busca bloqueo de conducción al cruzar la cabeza del peroné.',
    'CLAVE: tibial posterior NORMAL distingue de radiculopatía L5.',
    'Nervio tibial y sural deben estar normales.',
  ],
  cts_severe: [
    'SNAP mediano puede estar AUSENTE en casos severos.',
    'Busca denervación activa en APB (fibrilaciones) — indica severidad.',
    'El cubital DEBE ser normal — la lesión es focal en el carpo.',
  ],
  l5_radiculopathy: [
    'CLAVE: tibial posterior afectado (nervio tibial) → no puede ser neuropatía peroneal.',
    'NCS sensitivas NORMALES = lesión proximal al ganglio.',
    'H-reflex normal distingue de S1.',
  ],
  s1_radiculopathy: [
    'H-reflex prolongado o ausente UNILATERAL = hallazgo más sensible para S1.',
    'Busca denervación en gastrocnemio y cabeza corta bíceps femoral.',
    'Tibial anterior (L5) debería estar NORMAL.',
  ],
  mmn: [
    'Bloqueo de conducción MOTOR con sensitivos NORMALES = MMN.',
    'Disociación debilidad/atrofia: mucha debilidad, poca atrofia.',
    'Sin signos de motoneurona superior (descarta ELA).',
  ],
  martin_gruber: [
    '⚠️ CMAP mediano PROXIMAL mayor que DISTAL. ¿Eso es posible normalmente?',
    'El CMAP cubital "cae" al cruzar el codo. ¿Es bloqueo real o variante anatómica?',
    'EMG completamente normal. ¿Realmente hay patología?',
  ],
  benign_fasciculations: [
    '⚠️ Fasciculaciones SIN fibrilaciones ni PSW. ¿Qué significa?',
    'MUPs de morfología NORMAL. ¿Es esto compatible con ELA?',
    'Reclutamiento NORMAL con fasciculaciones aisladas. ¿Cuál es el diagnóstico?',
  ],
  hypothermia_artifact: [
    '⚠️ Latencias prolongadas PERO amplitudes AUMENTADAS. ¿Eso es desmielinización?',
    'Revisa la nota técnica sobre temperatura. ¿Qué efecto tiene la hipotermia?',
    'Solo afecta manos (frías), los MMII están normales. ¿Por qué?',
  ],
  diabetic_polyneuropathy: [
    'Patrón LONGITUD-DEPENDIENTE: ¿cuáles son los nervios más distales afectados?',
    'Las velocidades están solo levemente reducidas, no <70% LIN. ¿Es desmielinización o pérdida axonal secundaria?',
    'H-reflex abolido es uno de los hallazgos más TEMPRANOS en neuropatía diabética.',
  ],
  radial_neuropathy_spiral_groove: [
    'CLAVE: ¿Está el tríceps afectado? → Si NO, la lesión es DISTAL a su rama (canal de torsión).',
    'El braquiorradial puede estar normal o afectado — se ramifica justo a nivel del canal.',
    'SNAP radial puede caer. ¿Es compatible con radiculopatía?',
  ],
  myotonic_dystrophy: [
    '🔊 Busca descargas miotónicas (sonido de "bombardero en picada").',
    'Debilidad DISTAL en una miopatía. ¿Cuál es la excepción a la regla de "miopatía = proximal"?',
    'Atrofia temporal + cataratas + calvicie → enfermedad MULTISISTÉMICA.',
  ],
  inflammatory_myopathy: [
    'NCS completamente NORMALES, pero EMG con fibrilaciones abundantes. ¿Cómo?',
    'MUPs CORTOS + fibrilaciones = miopatía IRRITABLE (necrosis muscular activa).',
    'Distribución PROXIMAL simétrica — deltoides, bíceps, iliopsoas, cuádriceps.',
  ],
  gbs_axonal_aman: [
    'CMAPs muy BAJOS pero velocidades PRESERVADAS. ¿Es axonal o desmielinizante?',
    'SNAPs completamente NORMALES = solo afecta axones MOTORES.',
    'Las F-waves pueden estar normales (vs muy anormales en AIDP).',
  ],
  critical_illness_polyneuromyopathy: [
    'Patrón MIXTO: CMAPs Y SNAPs bajos (CIP) + MUPs cortos (CIM).',
    '¿Se afecta el DIAFRAGMA? → El nervio frénico es CLAVE para el destete ventilatorio.',
    'Contexto de UCI + sepsis + esteroides + bloqueadores NM.',
  ],
  inclusion_body_myositis: [
    '⚠️ MUPs LARGOS junto con CORTOS en el mismo músculo. ¿Miopático o neurogénico?',
    'Debilidad selectiva: cuádriceps + flexores profundos de dedos. ¿Qué enfermedad tiene este patrón?',
    'No respondió a esteroides. ¿Puede ser polimiositis?',
  ],
  tarsal_tunnel_syndrome: [
    'Latencias terminales PLANTARES prolongadas con tibial proximal NORMAL = lesión focal en tobillo.',
    'El SURAL es NORMAL (se separa proximal al túnel del tarso).',
    'Gastrocnemio NORMAL distingue de radiculopatía S1.',
  ],
  c7_radiculopathy: [
    'Músculos afectados cruzan MÚLTIPLES nervios periféricos: tríceps (radial) + pronador (mediano).',
    'NCS sensitivas NORMALES → lesión proximal al ganglio.',
    'Paraespinales cervicales con denervación CONFIRMAN radiculopatía (excluyen plexopatía).',
  ],
  accessory_peroneal_nerve: [
    '⚠️ CMAP proximal MAYOR que distal en peroneo. ¿Cómo es posible?',
    'EMG completamente NORMAL. ¿Hay realmente patología?',
    'Estimula detrás del maléolo lateral. ¿Aparece un CMAP adicional?',
  ],
};

// Format seconds as mm:ss
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const ExerciseMode: React.FC<{ publicMode?: boolean }> = ({ publicMode = false }) => {
  const store = useExerciseStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ExerciseStep>('config');
  const [clinicalCase, setClinicalCase] = useState<ClinicalCase | null>(null);
  const [options, setOptions] = useState<DiagnosisOption[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(store.preferredDifficulty);
  const [isAnimating, setIsAnimating] = useState(false);

  // ───── Router & Assignment Params ─────
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navState = (location.state || {}) as Partial<ClinicalAssignmentLaunchState> & {
    assignmentId?: string;
    title?: string;
    studentId?: string;
  };
  const assignmentId = publicMode ? undefined : (searchParams.get('assignmentId') || navState.assignmentId);
  const previewPatternId = publicMode
    ? undefined
    : (searchParams.get('patternId') || (!assignmentId ? navState.patternId : undefined));
  const returnTo = (() => {
    if (publicMode) return null;
    const raw = searchParams.get('from');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://') || raw.includes('\\')) {
      return null;
    }
    return raw;
  })();
  const [publicIds, setPublicIds] = useState<Set<string> | null>(publicMode ? null : new Set());
  const [assignmentLaunch, setAssignmentLaunch] = useState<ClinicalAssignmentLaunchState | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(Boolean(assignmentId));
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const assignedStartRef = useRef(false);
  const [assignmentStartNonce, setAssignmentStartNonce] = useState(0);
  const submitLockRef = useRef(false);
  const selectedAnswerRef = useRef<string | null>(null);
  const clinicalCaseRef = useRef<ClinicalCase | null>(null);
  const startTimeRef = useRef(0);
  const hintsUsedRef = useRef(0);

  // ───── Dynamic Templates Catalog (33 base + Supabase custom) ─────
  const [allTemplates, setAllTemplates] = useState<CaseTemplate[]>(ALL_CASE_TEMPLATES);

  // ───── Didactic Tools State ─────
  const [ncsViewMode, setNcsViewMode] = useState<'table' | 'oscilloscope'>('table');
  const [selectedOscNerveIndex, setSelectedOscNerveIndex] = useState(0);
  const [emgViewMode, setEmgViewMode] = useState<'table' | 'myotome'>('table');
  const [playingAudioMuscle, setPlayingAudioMuscle] = useState<string | null>(null);

  // Cargar catálogo dinámico de plantillas al montar
  useEffect(() => {
    loadAllCaseTemplates().then((res: { templates: CaseTemplate[] }) => {
      if (res.templates && res.templates.length > 0) {
        setAllTemplates(res.templates);
      }
    }).catch((e: unknown) => console.error(e));
  }, []);

  useEffect(() => {
    if (!publicMode) return;
    let cancelled = false;
    loadPublicExerciseIds().then((ids) => {
      if (!cancelled) setPublicIds(new Set(ids));
    }).catch(() => {
      if (!cancelled) setPublicIds(new Set());
    });
    return () => { cancelled = true; };
  }, [publicMode]);

  // Detener audio al cambiar de paso o desmontar
  useEffect(() => {
    return () => {
      emgAudio.stop();
      setPlayingAudioMuscle(null);
    };
  }, [currentStep]);

  // ───── New UI/UX state ──────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({ explanation: true, findings: false, differential: false });
  const [animatedScore, setAnimatedScore] = useState(0);

  const canGradeAssignment = Boolean(
    assignmentId &&
    assignmentLaunch &&
    (assignmentLaunch.status === 'pending' || assignmentLaunch.retakeStatus === 'approved') &&
    !assignmentSubmitted
  );
  const isAssignedPending = canGradeAssignment;
  const isAssignedExam = isAssignedPending && assignmentLaunch?.clinicalMode === 'exam';
  const assignmentTitle = assignmentLaunch?.assignmentTitle || 'Caso Clínico Asignado';
  const hintsAllowed = assignmentId
    ? assignmentLaunch?.clinicalMode === 'study' && canGradeAssignment
    : !isStudyMode;

  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
  useEffect(() => { clinicalCaseRef.current = clinicalCase; }, [clinicalCase]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { hintsUsedRef.current = hintsUsed; }, [hintsUsed]);

  // Cargar la asignación (sin exponer patternId en la URL)
  useEffect(() => {
    if (!assignmentId) {
      setAssignmentLaunch(null);
      setAssignmentLoading(false);
      setAssignmentError(null);
      return;
    }

    let cancelled = false;
    setAssignmentLoading(true);
    setAssignmentError(null);

    loadClinicalAssignmentLaunch(assignmentId, user?.id || navState.studentId, {
      assignmentId,
      patternId: navState.patternId,
      category: navState.category,
      clinicalMode: navState.clinicalMode,
      timeLimitMinutes: navState.timeLimitMinutes,
      difficulty: navState.difficulty,
      assignmentTitle: navState.assignmentTitle || navState.title,
      studentId: navState.studentId,
      status: navState.status,
    }).then((launch) => {
      if (cancelled) return;
      if (!launch) {
        setAssignmentError('No se encontró la asignación de caso clínico.');
        setAssignmentLoading(false);
        return;
      }
      setAssignmentLaunch(launch);
      if (launch.difficulty) setDifficulty(launch.difficulty);
      setAssignmentLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setAssignmentError('No se pudo cargar la asignación de caso clínico.');
      setAssignmentLoading(false);
    });

    return () => { cancelled = true; };
  }, [assignmentId, user?.id]);

  // Animate score counter on evaluation change
  useEffect(() => {
    if (!evaluation) return;
    let frame = 0;
    const target = evaluation.score;
    const duration = 30;
    const step = target / duration;
    const timer = setInterval(() => {
      frame++;
      setAnimatedScore(Math.min(Math.round(step * frame), target));
      if (frame >= duration) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [evaluation]);

  // ───── Keyboard navigation ──────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (currentStep === 'config' || currentStep === 'feedback') return;
      if (e.key === 'ArrowRight' && canGoNext) goNext();
      if (e.key === 'ArrowLeft' && canGoPrev) goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ───── Timer logic ──────
  useEffect(() => {
    if (currentStep !== 'config' && currentStep !== 'feedback' && startTime > 0) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        if (expiresAt) {
          const rem = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
          setRemainingSeconds(rem);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStep, startTime, expiresAt]);

  // Stop timer on feedback
  useEffect(() => {
    if (currentStep === 'feedback' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [currentStep]);

  // Active pool of templates: in free practice mode, exclude 'exam_only' cases so students cannot spoil exam questions!
  // Only include them if explicitly assigned by teacher via assignmentId / previewPatternId
  const activePool = useMemo(() => {
    if (publicMode) {
      if (!publicIds) return [];
      return allTemplates.filter(t => publicIds.has(t.patternId) && t.usageMode !== 'exam_only');
    }
    if (previewPatternId || assignmentId) {
      return allTemplates;
    }
    return allTemplates.filter(t => t.usageMode !== 'exam_only');
  }, [allTemplates, previewPatternId, assignmentId, publicMode, publicIds]);

  // Available categories for filter
  const availableCategories = ['all', ...Array.from(new Set(activePool.map(t => t.category)))];

  const persistAssignedLock = useCallback((
    patch: Partial<ClinicalCaseSessionLock> & { clinicalCase: ClinicalCase; options: DiagnosisOption[] }
  ) => {
    if (!assignmentId || !assignmentLaunch || !canGradeAssignment) return;
    const existing = loadClinicalCaseLock(assignmentId);
    const next: ClinicalCaseSessionLock = {
      assignmentId,
      patternId: patch.patternId || existing?.patternId || assignmentLaunch.patternId || patch.clinicalCase.correctDiagnosis.patternId,
      startedAt: patch.startedAt || existing?.startedAt || new Date().toISOString(),
      expiresAt: patch.expiresAt !== undefined ? patch.expiresAt : (existing?.expiresAt ?? expiresAt),
      clinicalMode: assignmentLaunch.clinicalMode,
      timeLimitMinutes: assignmentLaunch.timeLimitMinutes,
      difficulty: patch.difficulty || existing?.difficulty || difficulty,
      clinicalCase: patch.clinicalCase,
      options: patch.options,
      currentStep: patch.currentStep || existing?.currentStep || 'case',
      selectedAnswer: patch.selectedAnswer !== undefined ? patch.selectedAnswer : (existing?.selectedAnswer ?? null),
      hintsUsed: patch.hintsUsed ?? existing?.hintsUsed ?? 0,
      submitted: patch.submitted ?? existing?.submitted ?? false,
      timedOut: patch.timedOut ?? existing?.timedOut,
      evaluation: patch.evaluation !== undefined ? patch.evaluation : existing?.evaluation,
    };
    saveClinicalCaseLock(next);
  }, [assignmentId, assignmentLaunch, canGradeAssignment, difficulty, expiresAt]);

  const generateNewCase = useCallback(() => {
    if (isAssignedPending) return;
    if (activePool.length === 0) return;

    const pool = categoryFilter !== 'all'
      ? activePool.filter(t => t.category === categoryFilter)
      : activePool;

    const filteredPatternId = categoryFilter !== 'all'
      ? pool.map(t => t.patternId)[Math.floor(Math.random() * pool.length)]
      : undefined;

    const newCase = filteredPatternId
      ? ClinicalCaseEngine.generateCaseFromTemplate(
          activePool.find(t => t.patternId === filteredPatternId) || activePool[0],
          difficulty
        )
      : ClinicalCaseEngine.generateRandomCase(difficulty, undefined, activePool);

    const opts = ClinicalCaseEngine.getOptionsForCase(newCase.correctDiagnosis.patternId, difficulty, activePool);
    setClinicalCase(newCase);
    setOptions(opts);
    setSelectedAnswer(null);
    setEvaluation(null);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setHintsUsed(0);
    setShowHint(false);
    setCurrentStep('case');
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [difficulty, categoryFilter, activePool, isAssignedPending]);

  const startFromTemplate = useCallback((
    template: CaseTemplate,
    launch: ClinicalAssignmentLaunchState | null,
    lockExpiresAt: string | null,
    startedAtMs: number
  ) => {
    const caseDifficulty = launch?.difficulty || difficulty;
    const newCase = ClinicalCaseEngine.generateCaseFromTemplate(template, caseDifficulty);
    const opts = ClinicalCaseEngine.getOptionsForCase(newCase.correctDiagnosis.patternId, caseDifficulty, allTemplates);
    setClinicalCase(newCase);
    setOptions(opts);
    setSelectedAnswer(null);
    setEvaluation(null);
    setStartTime(startedAtMs);
    setElapsedSeconds(Math.floor((Date.now() - startedAtMs) / 1000));
    setHintsUsed(0);
    setShowHint(false);
    setCurrentStep('case');
    setExpiresAt(lockExpiresAt);
    if (lockExpiresAt) {
      setRemainingSeconds(Math.max(0, Math.floor((new Date(lockExpiresAt).getTime() - Date.now()) / 1000)));
    }
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);

    if (launch?.status === 'pending' && assignmentId) {
      persistAssignedLock({
        patternId: template.patternId,
        startedAt: new Date(startedAtMs).toISOString(),
        expiresAt: lockExpiresAt,
        difficulty: caseDifficulty,
        clinicalCase: newCase,
        options: opts,
        currentStep: 'case',
        selectedAnswer: null,
        hintsUsed: 0,
        submitted: false,
      });
    }
  }, [allTemplates, assignmentId, difficulty, persistAssignedLock]);

  const restoreFromLock = useCallback((lock: ClinicalCaseSessionLock) => {
    setClinicalCase(lock.clinicalCase);
    setOptions(lock.options);
    setSelectedAnswer(lock.selectedAnswer);
    setDifficulty(lock.difficulty);
    setStartTime(new Date(lock.startedAt).getTime());
    setElapsedSeconds(Math.floor((Date.now() - new Date(lock.startedAt).getTime()) / 1000));
    setHintsUsed(lock.hintsUsed);
    setShowHint(lock.hintsUsed > 0);
    setExpiresAt(lock.expiresAt);
    if (lock.expiresAt) {
      setRemainingSeconds(Math.max(0, Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000)));
    }
    if (lock.evaluation) {
      setEvaluation(lock.evaluation);
      setCurrentStep('feedback');
      setAssignmentSubmitted(lock.submitted);
      setTimedOut(!!lock.timedOut);
    } else {
      setCurrentStep((lock.currentStep as ExerciseStep) || 'case');
    }
  }, []);

  const restoreFromSnapshot = useCallback((
    snapshot: ClinicalCaseSnapshot,
    lastAttempt?: ClinicalCaseAttemptRecord | null
  ) => {
    const caseData = snapshot.clinicalCase as unknown as ClinicalCase;
    const caseWithHints: ClinicalCase = {
      ...caseData,
      hints: snapshot.hints?.length ? snapshot.hints : caseData.hints,
    };
    const opts = (snapshot.options || []) as DiagnosisOption[];
    const startedAt = snapshot.startedAt || new Date().toISOString();
    setClinicalCase(caseWithHints);
    setOptions(opts);
    setDifficulty((snapshot.difficulty as Difficulty) || difficulty);
    setStartTime(new Date(startedAt).getTime());
    setElapsedSeconds(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    setExpiresAt(snapshot.expiresAt || null);
    if (snapshot.expiresAt) {
      setRemainingSeconds(Math.max(0, Math.floor((new Date(snapshot.expiresAt).getTime() - Date.now()) / 1000)));
    } else {
      setRemainingSeconds(null);
    }
    if (lastAttempt) {
      const evalResult = ClinicalCaseEngine.evaluateAnswer(
        lastAttempt.selectedPatternId || '__sin_respuesta__',
        caseWithHints,
        lastAttempt.timeSpentSeconds,
        opts
      );
      evalResult.score = lastAttempt.score;
      evalResult.isCorrect = lastAttempt.isCorrect;
      setSelectedAnswer(lastAttempt.selectedPatternId || null);
      setHintsUsed(lastAttempt.hintsUsed || 0);
      setEvaluation(evalResult);
      setCurrentStep('feedback');
      setAssignmentSubmitted(true);
      return;
    }
    setSelectedAnswer(null);
    setHintsUsed(0);
    setShowHint(false);
    setEvaluation(null);
    setCurrentStep('case');
  }, [difficulty]);

  // Cargar caso automáticamente si viene asignado por el docente (o vista previa admin)
  useEffect(() => {
    if (allTemplates.length === 0) return;

    if (assignmentId) {
      if (assignmentLoading || !assignmentLaunch || assignedStartRef.current) return;
      assignedStartRef.current = true;

      const canGrade =
        assignmentLaunch.status === 'pending' || assignmentLaunch.retakeStatus === 'approved';
      const existingSnap = assignmentLaunch.snapshot;
      const lock = loadClinicalCaseLock(assignmentId);

      if (!canGrade && existingSnap?.clinicalCase) {
        restoreFromSnapshot(existingSnap, assignmentLaunch.lastAttempt);
        return;
      }

      if (canGrade && existingSnap?.clinicalCase && assignmentLaunch.retakeStatus !== 'approved') {
        const snapCaseId = (existingSnap.clinicalCase as { id?: string }).id;
        if (lock && lock.clinicalCase?.id === snapCaseId) {
          restoreFromLock({
            ...lock,
            expiresAt: existingSnap.expiresAt ?? lock.expiresAt,
            startedAt: existingSnap.startedAt || lock.startedAt,
          });
          return;
        }
        restoreFromSnapshot(existingSnap);
        return;
      }

      const patternId = assignmentLaunch.patternId;
      const category = assignmentLaunch.category;
      let template = patternId ? allTemplates.find(t => t.patternId === patternId) : undefined;
      if (!template && category && category !== 'all') {
        const pool = allTemplates.filter(t => t.category === category);
        template = pool[Math.floor(Math.random() * Math.max(pool.length, 1))] || allTemplates[0];
      }
      if (!template) template = allTemplates[0];

      const now = Date.now();
      const caseDifficulty = assignmentLaunch.difficulty || difficulty;
      const newCase = ClinicalCaseEngine.generateCaseFromTemplate(template, caseDifficulty);
      const opts = ClinicalCaseEngine.getOptionsForCase(newCase.correctDiagnosis.patternId, caseDifficulty, allTemplates);
      const hints = newCase.hints?.length
        ? newCase.hints
        : (PATTERN_HINTS[template.patternId] || []);
      const shouldTime = canGrade && assignmentLaunch.clinicalMode === 'exam' && !!assignmentLaunch.timeLimitMinutes;
      const lockExpires = shouldTime
        ? new Date(now + (assignmentLaunch.timeLimitMinutes as number) * 60 * 1000).toISOString()
        : null;
      const snapshot: ClinicalCaseSnapshot = {
        clinicalCase: newCase as unknown as Record<string, unknown>,
        options: opts,
        hints,
        startedAt: new Date(now).toISOString(),
        expiresAt: lockExpires,
        clinicalMode: assignmentLaunch.clinicalMode,
        patternId: template.patternId,
        difficulty: caseDifficulty,
        timeLimitMinutes: assignmentLaunch.timeLimitMinutes,
      };

      startClinicalCaseAssignment(assignmentId, snapshot).then((started) => {
        if (!started.success) {
          assignedStartRef.current = false;
          setAssignmentError(started.error || 'No se pudo iniciar el caso clínico en el servidor.');
          return;
        }
        const snap = started.snapshot || snapshot;
        restoreFromSnapshot(snap);
        persistAssignedLock({
          patternId: template.patternId,
          startedAt: snap.startedAt,
          expiresAt: snap.expiresAt ?? null,
          difficulty: caseDifficulty,
          clinicalCase: (snap.clinicalCase as unknown as ClinicalCase) || newCase,
          options: (snap.options as DiagnosisOption[]) || opts,
          currentStep: 'case',
          selectedAnswer: null,
          hintsUsed: 0,
          submitted: false,
        });
      });
      return;
    }

    if (previewPatternId && currentStep === 'config') {
      const template = allTemplates.find(t => t.patternId === previewPatternId) || allTemplates[0];
      startFromTemplate(template, null, null, Date.now());
    }
  }, [
    assignmentId,
    assignmentLoading,
    assignmentLaunch,
    allTemplates,
    currentStep,
    previewPatternId,
    difficulty,
    restoreFromLock,
    restoreFromSnapshot,
    persistAssignedLock,
    startFromTemplate,
    assignmentStartNonce,
  ]);

  const handleSubmitDiagnosis = (opts?: { timedOut?: boolean }) => {
    const caseData = clinicalCaseRef.current || clinicalCase;
    if (submitLockRef.current || !caseData) return;
    const answer = selectedAnswerRef.current || selectedAnswer;
    if (!opts?.timedOut && !answer) return;

    submitLockRef.current = true;
    const usedHints = hintsUsedRef.current;
    const timeSpent = Math.round((Date.now() - (startTimeRef.current || startTime || Date.now())) / 1000);
    let result = ClinicalCaseEngine.evaluateAnswer(answer || '__sin_respuesta__', caseData, timeSpent, options);

    const applyHintPenalty = Boolean(assignmentId && assignmentLaunch?.clinicalMode === 'study');
    if (applyHintPenalty) {
      const scored = scoreClinicalDiagnosis({
        selectedPatternId: answer,
        correctPatternId: caseData.correctDiagnosis.patternId,
        correctCategory: caseData.correctDiagnosis.category,
        selectedCategory: options.find((o) => o.patternId === answer)?.category,
        hintsUsed: usedHints,
        maxHints: (caseData.hints?.length ? caseData.hints : PATTERN_HINTS[caseData.correctDiagnosis.patternId] || []).length,
        applyHintPenalty: true,
      });
      result.score = scored.score;
    }

    if (opts?.timedOut && !answer) {
      result = {
        ...result,
        isCorrect: false,
        score: 0,
        selectedAnswer: 'Sin respuesta',
        differentialExplanations: [
          {
            patternName: 'Sin respuesta',
            whyNot: 'El tiempo límite se agotó antes de emitir un diagnóstico.',
          },
          ...result.differentialExplanations.filter((d) => d.patternName !== '__sin_respuesta__'),
        ],
      };
    }

    setTimedOut(!!opts?.timedOut);
    setEvaluation(result);

    const attempt: ExerciseAttempt = {
      id: `att_${Date.now()}`,
      caseId: caseData.id,
      patternId: caseData.correctDiagnosis.patternId,
      patternName: caseData.correctDiagnosis.patternName,
      difficulty,
      selectedAnswer: answer || 'Sin respuesta',
      isCorrect: result.isCorrect,
      score: result.score,
      timeSpent,
      timestamp: new Date().toISOString(),
    };
    store.recordAttempt(attempt);

    const canGrade = canGradeAssignment && Boolean(assignmentId);
    if (canGrade && assignmentId) {
      const studentId = assignmentLaunch?.studentId || user?.id || '';
      submitClinicalCaseAssignment(assignmentId, studentId, {
        selectedAnswer: answer || 'Sin respuesta (tiempo agotado)',
        hintsUsed: usedHints,
      }).then((saved) => {
        if (saved.success) {
          setAssignmentSubmitted(true);
          setAssignmentError(null);
          const serverScore = saved.assignment?.grade;
          if (typeof serverScore === 'number') {
            setEvaluation((prev) => (prev ? { ...prev, score: serverScore } : prev));
          }
          return;
        }
        submitLockRef.current = false;
        setAssignmentError(saved.error || 'No se pudo asentar la calificación.');
      });
    }

    persistAssignedLock({
      clinicalCase: caseData,
      options,
      currentStep: 'feedback',
      selectedAnswer: answer,
      hintsUsed: usedHints,
      submitted: false,
      timedOut: opts?.timedOut,
      evaluation: result,
    });

    setCurrentStep('feedback');
  };

  // Auto-enviar al agotar el tiempo del examen asignado
  useEffect(() => {
    if (!isAssignedExam || remainingSeconds === null || remainingSeconds > 0) return;
    if (currentStep === 'config' || currentStep === 'feedback' || evaluation) return;
    handleSubmitDiagnosis({ timedOut: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, isAssignedExam, currentStep, evaluation]);

  // Persistir progreso de la sesión asignada (caso, paso y respuesta)
  useEffect(() => {
    if (!assignmentId || !isAssignedPending || !clinicalCase || currentStep === 'config') return;
    persistAssignedLock({
      clinicalCase,
      options,
      currentStep,
      selectedAnswer,
      hintsUsed,
      submitted: assignmentSubmitted,
      timedOut,
      evaluation,
    });
  }, [
    assignmentId,
    isAssignedPending,
    clinicalCase,
    options,
    currentStep,
    selectedAnswer,
    hintsUsed,
    assignmentSubmitted,
    timedOut,
    evaluation,
    persistAssignedLock,
  ]);

  const stepIndex = STEPS.indexOf(currentStep);

  // ─── Free navigation: allow clicking any visited step ───
  const handleStepClick = (step: ExerciseStep) => {
    if (step === 'config') return;
    if (step === 'feedback' && !evaluation) return;
    if (!clinicalCase) return;
    // Can navigate freely between case, ncs, emg, diagnosis
    const targetIdx = STEPS.indexOf(step);
    // Don't allow jumping to diagnosis from config or feedback
    if (currentStep === 'config' || currentStep === 'feedback') return;
    // Allow any step that's not past diagnosis (unless feedback is done)
    if (targetIdx >= 1 && targetIdx <= 4) {
      setCurrentStep(step);
    }
    if (step === 'feedback' && evaluation) {
      setCurrentStep('feedback');
    }
  };

  const canGoNext = currentStep !== 'config' && currentStep !== 'feedback'
    && currentStep !== 'diagnosis';
  const canGoPrev = stepIndex > 1 && currentStep !== 'feedback';

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };
  const goPrev = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 1) setCurrentStep(STEPS[idx - 1]);
  };

  // ─── Hints ──────
  const currentHints = clinicalCase
    ? (clinicalCase.hints?.length
        ? clinicalCase.hints
        : (PATTERN_HINTS[clinicalCase.correctDiagnosis.patternId] || []))
    : [];
  const maxHints = currentHints.length;

  const requestHint = () => {
    if (!hintsAllowed) return;
    if (hintsUsed < maxHints) {
      setHintsUsed(prev => prev + 1);
      setShowHint(true);
    }
  };

  const leaveAssignedSession = () => {
    if (isAssignedExam && currentStep !== 'feedback' && !evaluation) {
      const confirmed = window.confirm(
        'El cronómetro del caso asignado sigue corriendo. ¿Salir al dashboard?'
      );
      if (!confirmed) return;
    }
    navigate('/dashboard?tab=assignments');
  };

  const handleTopBack = () => {
    if (assignmentId) {
      leaveAssignedSession();
      return;
    }
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    setCurrentStep('config');
  };

  // ─── Status Cell Color ──────
  const cellColor = (status: string) => {
    if (status === 'abnormal') return 'bg-red-900/30 text-red-300 border-red-700/50';
    if (status === 'borderline') return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
    return 'bg-green-900/20 text-green-300 border-green-700/30';
  };

  const valColor = (val: number, min: number, max: number, lowIsAbnormal = true) => {
    if (lowIsAbnormal) {
      if (val < min) return 'text-red-400 font-bold';
      if (val > max) return 'text-red-400 font-bold';
    } else {
      if (val > max) return 'text-red-400 font-bold';
      if (val < min) return 'text-red-400 font-bold';
    }
    return 'text-green-400';
  };

  // ─── RENDER: Config ─────────
  const renderConfig = () => {
    if (assignmentId && !assignmentError && (assignmentLoading || !assignmentLaunch || currentStep === 'config')) {
      return (
        <div className="max-w-xl mx-auto py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Cargando el caso clínico asignado por tu profesor...</p>
        </div>
      );
    }

    if (assignmentId && assignmentError) {
      return (
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">No se pudo abrir el caso asignado</h2>
          <p className="text-sm text-gray-400">{assignmentError}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                assignedStartRef.current = false;
                setAssignmentError(null);
                setAssignmentStartNonce((n) => n + 1);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=assignments')}
              className="px-4 py-2 rounded-xl border border-gray-600 text-gray-200 text-sm font-bold"
            >
              Volver a Tareas
            </button>
          </div>
        </div>
      );
    }

    if (publicMode) {
      const lockedCount = allTemplates.filter(
        (t) => t.usageMode !== 'exam_only' && !(publicIds?.has(t.patternId))
      ).length;
      return (
        <div className="w-full space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-red-600/10 border border-amber-500/20 p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-3xl">
              <div className="inline-flex bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-2xl shadow-lg shadow-amber-500/30 mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-amber-200 mb-2">
                Simulador público
              </h1>
              <p className="text-gray-300 text-sm sm:text-base mb-0 max-w-2xl">
                Prueba el caso abierto. Recorre la historia, la neuroconducción y la EMG, y elige un diagnóstico. El resto del simulador se desbloquea con tu cuenta.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['1', 'Caso'],
              ['2', 'Neuroconducción'],
              ['3', 'EMG'],
              ['4', 'Diagnóstico'],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl border border-gray-700/60 bg-gray-800/40 px-3 py-3">
                <div className="text-[10px] font-bold text-amber-400">Paso {n}</div>
                <div className="text-sm font-semibold text-white">{label}</div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Ejercicios abiertos</h2>
            {publicIds === null ? (
              <p className="text-sm text-gray-400 mb-0">Cargando ejercicios públicos...</p>
            ) : activePool.length === 0 ? (
              <p className="text-sm text-gray-400 mb-0">Todavía no hay un ejercicio visible en modo público.</p>
            ) : (
              <div className="grid gap-3">
                {(categoryFilter === 'all' ? activePool : activePool.filter((t) => t.category === categoryFilter)).map((template) => (
                  <article
                    key={template.patternId}
                    className="rounded-2xl border border-gray-700/60 bg-gray-800/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1 mb-1">{template.patternName}</h3>
                      <p className="text-sm text-gray-400 mb-0">
                        {template.patient.complaints[0]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startFromTemplate(template, null, null, Date.now())}
                      className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold min-h-[44px]"
                    >
                      Empezar caso
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Dificultad</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {([{ d: 'easy' as Difficulty, emoji: '🟢', label: 'Fácil', desc: '3 opciones, valores claros', border: 'border-green-500/40', bg: 'bg-green-950/20' },
                  { d: 'medium' as Difficulty, emoji: '🟡', label: 'Medio', desc: '5 opciones, borderline', border: 'border-amber-500/40', bg: 'bg-amber-950/20' },
                  { d: 'hard' as Difficulty, emoji: '🔴', label: 'Difícil', desc: '7 opciones, sutiles', border: 'border-red-500/40', bg: 'bg-red-950/20' },
                ]).map(({ d, emoji, label, desc, border, bg }) => (
                  <button key={d} type="button" onClick={() => { setDifficulty(d); store.setDifficulty(d); }}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-center ${
                      difficulty === d
                        ? `${bg} ${border} ring-1 ring-offset-1 ring-offset-gray-900 ring-current shadow-lg`
                        : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'
                    }`}>
                    <div className="text-xl sm:text-2xl mb-1">{emoji}</div>
                    <div className={`text-sm font-bold ${difficulty === d ? 'text-white' : 'text-gray-300'}`}>{label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="p-4">
                <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-purple-400" /> Categoría
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {availableCategories.map(cat => {
                    const count = cat === 'all' ? activePool.length : activePool.filter(t => t.category === cat).length;
                    return (
                      <button key={cat} type="button" onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap border ${
                          categoryFilter === cat
                            ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                            : 'bg-gray-800/60 text-gray-400 border-gray-700/60 hover:bg-gray-700/60 hover:text-gray-200 hover:border-gray-600'
                        }`}>
                        {CATEGORY_LABELS[cat] || cat}
                        <span className="ml-1 opacity-50">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-gray-700/40 mx-4" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isStudyMode ? 'bg-purple-600/20' : 'bg-gray-700/40'}`}>
                      {isStudyMode ? <BookOpen className="w-4 h-4 text-purple-400" /> : <Award className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isStudyMode ? 'text-purple-300' : 'text-gray-300'}`}>
                        {isStudyMode ? 'Modo Estudio' : 'Modo Examen'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {isStudyMode ? 'La respuesta queda visible para aprender' : 'Evalúa tu conocimiento'}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsStudyMode(!isStudyMode)}
                    aria-pressed={isStudyMode}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isStudyMode ? 'bg-purple-600' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isStudyMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {lockedCount > 0 && (
            <div className="rounded-2xl border border-gray-700/60 bg-gray-800/30 p-4 sm:p-5 flex items-start gap-3">
              <Lock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-white mb-1">El resto del catálogo está cerrado</h2>
                <p className="text-sm text-gray-400 mb-0">
                  Hay {lockedCount} {lockedCount === 1 ? 'caso más' : 'casos más'} de práctica. Regístrate o inicia sesión para desbloquearlos.
                </p>
              </div>
            </div>
          )}

          <PublicSimulatorAuthBar />
        </div>
      );
    }

    return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-red-600/10 border border-amber-500/20 p-6 sm:p-8 text-center">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="inline-flex bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg shadow-amber-500/30 mb-4">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-300">
            Modo Ejercicio EMG
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Practica diagnosticando casos clínicos de electromiografía
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-gradient-to-b from-amber-950/30 to-gray-900/40 rounded-xl p-3 sm:p-4 border border-amber-800/20 text-center">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto mb-1.5" />
          <div className="text-xl sm:text-2xl font-bold text-white">{store.totalExercises}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Ejercicios</div>
        </div>
        <div className="bg-gradient-to-b from-green-950/30 to-gray-900/40 rounded-xl p-3 sm:p-4 border border-green-800/20 text-center">
          <Target className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1.5" />
          <div className="text-xl sm:text-2xl font-bold text-white">
            {store.totalExercises > 0 ? Math.round(store.correctAnswers / store.totalExercises * 100) : 0}%
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Precisión</div>
        </div>
        <div className="bg-gradient-to-b from-orange-950/30 to-gray-900/40 rounded-xl p-3 sm:p-4 border border-orange-800/20 text-center">
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 mx-auto mb-1.5" />
          <div className="text-xl sm:text-2xl font-bold text-white">{store.currentStreak}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Racha</div>
        </div>
      </div>

      {/* Difficulty — Visual Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Dificultad</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {([{ d: 'easy' as Difficulty, emoji: '🟢', label: 'Fácil', desc: '3 opciones, valores claros', border: 'border-green-500/40', bg: 'bg-green-950/20' },
            { d: 'medium' as Difficulty, emoji: '🟡', label: 'Medio', desc: '5 opciones, borderline', border: 'border-amber-500/40', bg: 'bg-amber-950/20' },
            { d: 'hard' as Difficulty, emoji: '🔴', label: 'Difícil', desc: '7 opciones, sutiles', border: 'border-red-500/40', bg: 'bg-red-950/20' },
          ]).map(({ d, emoji, label, desc, border, bg }) => (
            <button key={d} onClick={() => { setDifficulty(d); store.setDifficulty(d); }}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-center ${
                difficulty === d
                  ? `${bg} ${border} ring-1 ring-offset-1 ring-offset-gray-900 ring-current shadow-lg`
                  : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'
              }`}>
              <div className="text-xl sm:text-2xl mb-1">{emoji}</div>
              <div className={`text-sm font-bold ${difficulty === d ? 'text-white' : 'text-gray-300'}`}>{label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 hidden sm:block">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Category + Mode — Unified Card */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
        {/* Category */}
        <div className="p-4">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-purple-400" /> Categoría
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {availableCategories.map(cat => {
              const count = cat === 'all' ? activePool.length : activePool.filter(t => t.category === cat).length;
              return (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap border ${
                    categoryFilter === cat
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                      : 'bg-gray-800/60 text-gray-400 border-gray-700/60 hover:bg-gray-700/60 hover:text-gray-200 hover:border-gray-600'
                  }`}>
                  {CATEGORY_LABELS[cat] || cat}
                  <span className="ml-1 opacity-50">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700/40 mx-4" />

        {/* Study Mode */}
        <div className="p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isStudyMode ? 'bg-purple-600/20' : 'bg-gray-700/40'}`}>
                {isStudyMode ? <BookOpen className="w-4 h-4 text-purple-400" /> : <Award className="w-4 h-4 text-gray-400" />}
              </div>
              <div>
                <div className={`text-sm font-semibold ${isStudyMode ? 'text-purple-300' : 'text-gray-300'}`}>
                  {isStudyMode ? 'Modo Estudio' : 'Modo Examen'}
                </div>
                <div className="text-[10px] text-gray-500">
                  {isStudyMode ? 'Respuestas visibles — para aprender' : 'Evalúa tu conocimiento'}
                </div>
              </div>
            </div>
            <button onClick={() => setIsStudyMode(!isStudyMode)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isStudyMode ? 'bg-purple-600' : 'bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isStudyMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>
      </div>

      <button onClick={generateNewCase}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2">
        <Zap className="w-5 h-5" /> Generar Caso Clínico
      </button>
    </div>
    );
  };

  // ─── RENDER: Case Presentation ──
  const renderCase = () => {
    if (!clinicalCase) return null;
    const p = clinicalCase.patient;
    return (
      <div className={`space-y-4 sm:space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600/20 p-3 rounded-xl"><User className="w-6 h-6 text-blue-400" /></div>
          <div>
            <h2 className="text-xl font-bold text-white">Caso Clínico</h2>
            <p className="text-sm text-gray-400">Revisa la información del paciente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gray-800/60 rounded-xl p-4 border-l-4 border-blue-500 border-t border-r border-b border-t-gray-700/50 border-r-gray-700/50 border-b-gray-700/50">
            <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Paciente</div>
            <div className="text-white font-semibold">
              {p.sex === 'male' ? '♂' : '♀'} {p.age} años — {p.occupation}
            </div>
          </div>
          <div className="md:col-span-2 bg-gray-800/60 rounded-xl p-4 border-l-4 border-amber-500 border-t border-r border-b border-t-gray-700/50 border-r-gray-700/50 border-b-gray-700/50">
            <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Motivo de Consulta</div>
            <div className="text-white">{p.chiefComplaint}</div>
          </div>
        </div>

        <div className="bg-gray-800/40 rounded-xl p-4 sm:p-5 border-l-4 border-teal-500 border-t border-r border-b border-t-gray-700/30 border-r-gray-700/30 border-b-gray-700/30">
          <div className="text-[10px] text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5" /> Historia Clínica
          </div>
          <div className="text-gray-200 leading-relaxed text-sm sm:text-base">{p.clinicalHistory}</div>
        </div>

        <div className="bg-gray-800/40 rounded-xl p-4 sm:p-5 border-l-4 border-orange-500 border-t border-r border-b border-t-gray-700/30 border-r-gray-700/30 border-b-gray-700/30">
          <div className="text-[10px] text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Exploración Física
          </div>
          <div className="text-gray-200 leading-relaxed text-sm sm:text-base">{p.physicalExam}</div>
        </div>

        {isAssignedPending && (
          <div className={`rounded-xl p-4 border flex items-start gap-3 ${
            isAssignedExam
              ? 'bg-purple-950/30 border-purple-700/40'
              : 'bg-emerald-950/30 border-emerald-700/40'
          }`}>
            <Award className={`w-5 h-5 flex-shrink-0 ${isAssignedExam ? 'text-purple-300' : 'text-emerald-300'}`} />
            <div className="text-sm">
              <div className={`font-semibold ${isAssignedExam ? 'text-purple-200' : 'text-emerald-200'}`}>
                {isAssignedExam ? 'Caso de examen asignado' : 'Caso formativo asignado'}
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                {isAssignedExam
                  ? 'Sin pistas. El tiempo restante aparece arriba; al agotarse se envía automáticamente.'
                  : 'Puedes usar pistas progresivas. El diagnóstico no se revela hasta que confirmes tu respuesta.'}
              </p>
            </div>
          </div>
        )}

        {isStudyMode && !assignmentId && (
          <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700/40 flex items-center gap-3">
            <Eye className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <div className="text-purple-300 font-semibold text-xs uppercase tracking-wider">Modo Estudio — Respuesta:</div>
              <div className="text-white font-bold">{clinicalCase.correctDiagnosis.patternName}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER: NCS ──────
  const renderNCS = () => {
    if (!clinicalCase) return null;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/20 p-3 rounded-xl"><Activity className="w-6 h-6 text-purple-400" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Neuroconducción (NCS)</h2>
              <p className="text-sm text-gray-400">Analiza los valores — ¿cuáles son anormales?</p>
            </div>
          </div>

          {/* Selector de Herramientas de Neuroconducción */}
          <div className="flex items-center gap-1 bg-gray-800/80 p-1.5 rounded-xl border border-gray-700/60">
            <button
              type="button"
              onClick={() => setNcsViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                ncsViewMode === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tabla Numérica
            </button>
            <button
              type="button"
              onClick={() => setNcsViewMode('oscilloscope')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                ncsViewMode === 'oscilloscope' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-400 hover:text-emerald-400'
              }`}
            >
              <span>⚡ Osciloscopio con Trazados</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-400/20 text-emerald-300 font-extrabold uppercase">Pro</span>
            </button>
          </div>
        </div>

        {ncsViewMode === 'oscilloscope' ? (
          <NcsTraceOscilloscope
            ncsResult={clinicalCase.ncsResults[selectedOscNerveIndex] || clinicalCase.ncsResults[0]}
            allResults={clinicalCase.ncsResults}
            onSelectNerve={(nerveName) => {
              const idx = clinicalCase.ncsResults.findIndex(r => r.nerve === nerveName);
              if (idx !== -1) setSelectedOscNerveIndex(idx);
            }}
          />
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {clinicalCase.ncsResults.map((r, i) => (
                <div key={i} className={`rounded-xl p-4 border ${r.status === 'abnormal' ? 'bg-red-950/20 border-red-800/40' : r.status === 'borderline' ? 'bg-yellow-950/20 border-yellow-800/40' : 'bg-gray-800/50 border-gray-700/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{r.nerve}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${r.type === 'motor' ? 'bg-blue-900/50 text-blue-300' : 'bg-pink-900/50 text-pink-300'}`}>
                        {r.type === 'motor' ? 'M' : 'S'}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${cellColor(r.status)}`}>
                      {r.status === 'normal' ? '✓ Normal' : r.status === 'borderline' ? '⚠ Border' : '✗ Anormal'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-900/40 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Latencia</div>
                      <div className={`text-sm font-mono font-bold ${valColor(r.latency, r.normalRanges.latency.min, r.normalRanges.latency.max, false)}`}>{r.latency} ms</div>
                      <div className="text-[10px] text-gray-600">{r.normalRanges.latency.min}-{r.normalRanges.latency.max}</div>
                    </div>
                    <div className="bg-gray-900/40 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Amplitud</div>
                      <div className={`text-sm font-mono font-bold ${valColor(r.amplitude, r.normalRanges.amplitude.min, r.normalRanges.amplitude.max)}`}>{r.amplitude} {r.type === 'motor' ? 'mV' : 'μV'}</div>
                      <div className="text-[10px] text-gray-600">{r.normalRanges.amplitude.min}-{r.normalRanges.amplitude.max}</div>
                    </div>
                    <div className="bg-gray-900/40 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Velocidad</div>
                      <div className={`text-sm font-mono font-bold ${valColor(r.velocity, r.normalRanges.velocity.min, r.normalRanges.velocity.max)}`}>{r.velocity} m/s</div>
                      <div className="text-[10px] text-gray-600">{r.normalRanges.velocity.min}-{r.normalRanges.velocity.max}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-gray-400">Nervio</th><th className="text-center p-3 text-gray-400">Tipo</th><th className="text-center p-3 text-gray-400">Lado</th>
                  <th className="text-center p-3 text-gray-400">Lat (ms)</th><th className="text-center p-3 text-gray-400">Amplitud</th><th className="text-center p-3 text-gray-400">Vel (m/s)</th><th className="text-center p-3 text-gray-400">Estado</th>
                  <th className="text-center p-3 text-gray-400">Trazado</th>
                </tr></thead>
                <tbody>
                  {clinicalCase.ncsResults.map((r, i) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
                      <td className="p-3 text-white font-medium">{r.nerve}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${r.type === 'motor' ? 'bg-blue-900/40 text-blue-300' : 'bg-pink-900/40 text-pink-300'}`}>{r.type === 'motor' ? 'Motor' : 'Sensitivo'}</span></td>
                      <td className="p-3 text-center text-gray-300">{r.side === 'left' ? 'Izq' : r.side === 'bilateral' ? 'Bil' : 'Der'}</td>
                      <td className={`p-3 text-center ${valColor(r.latency, r.normalRanges.latency.min, r.normalRanges.latency.max, false)}`}>{r.latency}<div className="text-xs text-gray-500">({r.normalRanges.latency.min}-{r.normalRanges.latency.max})</div></td>
                      <td className={`p-3 text-center ${valColor(r.amplitude, r.normalRanges.amplitude.min, r.normalRanges.amplitude.max)}`}>{r.amplitude} {r.type === 'motor' ? 'mV' : 'μV'}<div className="text-xs text-gray-500">({r.normalRanges.amplitude.min}-{r.normalRanges.amplitude.max})</div></td>
                      <td className={`p-3 text-center ${valColor(r.velocity, r.normalRanges.velocity.min, r.normalRanges.velocity.max)}`}>{r.velocity}<div className="text-xs text-gray-500">({r.normalRanges.velocity.min}-{r.normalRanges.velocity.max})</div></td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${cellColor(r.status)}`}>{r.status === 'normal' ? '✓ Normal' : r.status === 'borderline' ? '⚠ Borderline' : '✗ Anormal'}</span></td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOscNerveIndex(i);
                            setNcsViewMode('oscilloscope');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Ver Trazo</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Conduction Block indicators */}
        {clinicalCase.ncsResults.some((r: any) => r.conductionBlock) && (
          <div className="bg-red-950/30 border border-red-700/40 rounded-xl p-4 mt-3">
            <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Bloqueos de Conducción Detectados
            </div>
            <div className="space-y-1">
              {clinicalCase.ncsResults.filter((r: any) => r.conductionBlock).map((r, i) => (
                <div key={i} className="text-sm text-red-300">
                  🔴 <strong>{r.nerve}</strong>: Bloqueo de conducción
                  {(r as any).temporalDispersion ? ' + Dispersión temporal' : ''}
                  {(r as any).proximalAmplitude != null && (
                    <span className="text-red-400/70"> — Amp. proximal: {(r as any).proximalAmplitude} mV</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Late Responses (F-wave, H-reflex) */}
        {clinicalCase.lateResponses && clinicalCase.lateResponses.length > 0 && (
          <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-xl p-4 mt-3">
            <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Respuestas Tardías
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-indigo-300/80 text-xs uppercase">
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Nervio</th>
                  <th className="p-2 text-center">Latencia/Latencia mín</th>
                  <th className="p-2 text-center">Normal</th>
                  <th className="p-2 text-center">Persistencia</th>
                  <th className="p-2 text-center">Estado</th>
                </tr></thead>
                <tbody>
                  {clinicalCase.lateResponses.map((lr, i) => (
                    <tr key={i} className="border-t border-indigo-800/30">
                      <td className="p-2 text-indigo-200 font-medium">{lr.type === 'f_wave' ? 'Onda F' : 'H-Reflex'}</td>
                      <td className="p-2 text-gray-300">{lr.nerve} {lr.side ? `(${lr.side === 'left' ? 'Izq' : 'Der'})` : ''}</td>
                      <td className={`p-2 text-center ${lr.status === 'absent' ? 'text-red-400' : lr.status === 'abnormal' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {lr.status === 'absent' ? 'AUSENTE' : `${lr.minLatency || lr.latency || '—'} ms`}
                      </td>
                      <td className="p-2 text-center text-gray-400">{lr.normalRange.min}–{lr.normalRange.max} ms</td>
                      <td className="p-2 text-center text-gray-300">{lr.persistence != null ? `${lr.persistence}%` : '—'}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          lr.status === 'normal' ? 'bg-green-900/40 text-green-400' :
                          lr.status === 'absent' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'
                        }`}>
                          {lr.status === 'normal' ? '✓ Normal' : lr.status === 'absent' ? '✗ Ausente' : '⚠ Prolongada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RNS (Estimulación Nerviosa Repetitiva) */}
        {clinicalCase.rnsResults && clinicalCase.rnsResults.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 mt-3">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> ENR — Estimulación Nerviosa Repetitiva
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-amber-300/80 text-xs uppercase">
                  <th className="p-2 text-left">Nervio/Músculo</th>
                  <th className="p-2 text-center">Frecuencia</th>
                  <th className="p-2 text-center">CMAP Basal</th>
                  <th className="p-2 text-center">Decremento</th>
                  <th className="p-2 text-center">Facilitación Post-Ej</th>
                  <th className="p-2 text-center">Estado</th>
                </tr></thead>
                <tbody>
                  {clinicalCase.rnsResults.map((rns, i) => (
                    <tr key={i} className="border-t border-amber-800/30">
                      <td className="p-2 text-amber-200 font-medium">{rns.nerve} → {rns.muscle}</td>
                      <td className="p-2 text-center text-gray-300">{rns.frequency}</td>
                      <td className="p-2 text-center text-gray-300">{rns.baselineCMAP} mV</td>
                      <td className={`p-2 text-center font-bold ${rns.decrementPercent <= -10 ? 'text-red-400' : 'text-green-400'}`}>
                        {rns.decrementPercent}%
                        {rns.decrementPercent <= -10 && <span className="text-xs text-red-400/70 block">(&gt;10% anormal)</span>}
                      </td>
                      <td className={`p-2 text-center font-bold ${rns.postExerciseFacilitation && rns.postExerciseFacilitation > 100 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {rns.postExerciseFacilitation ? `+${rns.postExerciseFacilitation}%` : '—'}
                        {rns.postExerciseFacilitation && rns.postExerciseFacilitation > 100 && <span className="text-xs text-yellow-400/70 block">(facilitación patológica)</span>}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          rns.status === 'normal' ? 'bg-green-900/40 text-green-400' :
                          rns.status === 'decremental' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'
                        }`}>
                          {rns.status === 'normal' ? '✓ Normal' : rns.status === 'decremental' ? '↓ Decremental' : '↑ Incremental'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Temperature warning */}
        {clinicalCase.skinTemperature && clinicalCase.skinTemperature < 32 && (
          <div className="bg-blue-950/30 border border-blue-600/40 rounded-xl p-3 mt-3 flex items-center gap-3">
            <span className="text-2xl">🌡️</span>
            <div>
              <div className="text-blue-300 font-bold text-sm">Nota Técnica: Temperatura Cutánea</div>
              <div className="text-blue-200/80 text-sm">
                Temperatura registrada: <span className="font-bold text-blue-300">{clinicalCase.skinTemperature.toFixed(1)}°C</span>
                {clinicalCase.skinTemperature < 32 && <span className="text-yellow-400 ml-2">(Normal &gt;32°C — ⚠️ BAJA)</span>}
              </div>
              {clinicalCase.technicalNotes && <div className="text-blue-300/60 text-xs mt-1">{clinicalCase.technicalNotes}</div>}
            </div>
          </div>
        )}
      </div>
    );
  };


  // ─── RENDER: EMG ──────
  const renderEMG = () => {
    if (!clinicalCase) return null;

    const handleToggleAudio = (muscleName: string, e: any) => {
      if (playingAudioMuscle === muscleName) {
        emgAudio.stop();
        setPlayingAudioMuscle(null);
      } else {
        let pattern: 'fibrillations' | 'positive_waves' | 'myotonia' | 'fasciculations' | 'normal_mup' = 'normal_mup';
        if (e.myotonicDischarges && e.myotonicDischarges[0] !== 'absent') {
          pattern = 'myotonia';
        } else if (e.spontaneousActivity.fibrillations !== 'absent') {
          pattern = 'fibrillations';
        } else if (e.spontaneousActivity.positiveWaves !== 'absent') {
          pattern = 'positive_waves';
        } else if (e.spontaneousActivity.fasciculations !== 'absent') {
          pattern = 'fasciculations';
        }
        emgAudio.playPattern(pattern);
        setPlayingAudioMuscle(muscleName);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-green-600/20 p-3 rounded-xl"><Zap className="w-6 h-6 text-green-400" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Electromiografía (EMG)</h2>
              <p className="text-sm text-gray-400">Interpreta los hallazgos y ausculta cada músculo</p>
            </div>
          </div>

          {/* Selector de Herramientas EMG */}
          <div className="flex items-center gap-1 bg-gray-800/80 p-1.5 rounded-xl border border-gray-700/60">
            <button
              type="button"
              onClick={() => setEmgViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                emgViewMode === 'table' ? 'bg-green-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tabla EMG
            </button>
            <button
              type="button"
              onClick={() => setEmgViewMode('myotome')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                emgViewMode === 'myotome' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-400 hover:text-indigo-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🗺️ Mapeo Anatómico</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-400/20 text-indigo-300 font-extrabold uppercase">Pro</span>
            </button>
          </div>
        </div>

        {emgViewMode === 'myotome' ? (
          <MyotomeBodyMap emgResults={clinicalCase.emgResults} />
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {clinicalCase.emgResults.map((e, i) => {
                const fibAbn = e.spontaneousActivity.fibrillations !== 'absent';
                const pwAbn = e.spontaneousActivity.positiveWaves !== 'absent';
                const fascAbn = e.spontaneousActivity.fasciculations !== 'absent';
                const durAbn = e.motorUnitPotentials.duration > 15 || e.motorUnitPotentials.duration < 6;
                const ampAbn = e.motorUnitPotentials.amplitude > 5000 || e.motorUnitPotentials.amplitude < 200;
                const recAbn = e.recruitmentPattern !== 'normal';
                const hasAbnormal = fibAbn || pwAbn || fascAbn || durAbn || ampAbn || recAbn;
                const isAudioPlaying = playingAudioMuscle === e.muscle;
                return (
                  <div key={i} className={`rounded-xl p-4 border ${hasAbnormal ? 'bg-red-950/15 border-red-800/40' : 'bg-gray-800/50 border-gray-700/50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-white font-semibold text-sm">{e.muscle}</span>
                        <span className="text-gray-500 text-xs ml-2">{e.nerve} · {e.root}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(e.muscle, e)}
                          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                            isAudioPlaying
                              ? 'bg-red-500/20 text-red-300 border border-red-500 animate-pulse'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                          title="Auscultar audio EMG"
                        >
                          {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${recAbn ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                          {e.recruitmentPattern === 'normal' ? 'Nl' : e.recruitmentPattern === 'reduced' ? '↓Reduc' : '↑Precoz'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Spontaneous */}
                      <div className="bg-gray-900/40 rounded-lg p-2">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Espontánea</div>
                        <div className="space-y-0.5">
                          <div className={fibAbn ? 'text-red-400 font-bold' : 'text-green-400'}>Fibs: {e.spontaneousActivity.fibrillations === 'absent' ? '−' : e.spontaneousActivity.fibrillations}</div>
                          <div className={pwAbn ? 'text-red-400 font-bold' : 'text-green-400'}>OAP: {e.spontaneousActivity.positiveWaves === 'absent' ? '−' : e.spontaneousActivity.positiveWaves}</div>
                          <div className={fascAbn ? 'text-red-400 font-bold' : 'text-green-400'}>Fasc: {e.spontaneousActivity.fasciculations === 'absent' ? '−' : e.spontaneousActivity.fasciculations}</div>
                        </div>
                      </div>
                      {/* MUPs */}
                      <div className="bg-gray-900/40 rounded-lg p-2">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">PUM</div>
                        <div className="space-y-0.5">
                          <div className={durAbn ? 'text-red-400 font-bold' : 'text-green-400'}>Dur: {e.motorUnitPotentials.duration} ms</div>
                          <div className={ampAbn ? 'text-red-400 font-bold' : 'text-green-400'}>Amp: {e.motorUnitPotentials.amplitude} μV</div>
                          <div className={e.motorUnitPotentials.polyphasia > 25 ? 'text-yellow-400' : 'text-gray-300'}>Polif: {e.motorUnitPotentials.polyphasia}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-700">
                  <th className="text-left p-2 text-gray-400">Músculo</th><th className="text-center p-2 text-gray-400">Raíz</th>
                  <th className="text-center p-2 text-gray-400">Audio</th>
                  <th className="text-center p-2 text-gray-400">Ins</th><th className="text-center p-2 text-gray-400">Fibs</th>
                  <th className="text-center p-2 text-gray-400">OAP</th><th className="text-center p-2 text-gray-400">Fasc</th>
                  <th className="text-center p-2 text-gray-400">Dur</th><th className="text-center p-2 text-gray-400">Amp</th>
                  <th className="text-center p-2 text-gray-400">Polif</th><th className="text-center p-2 text-gray-400">Reclut</th>
                </tr></thead>
                <tbody>
                  {clinicalCase.emgResults.map((e, i) => {
                    const fibAbn = e.spontaneousActivity.fibrillations !== 'absent';
                    const pwAbn = e.spontaneousActivity.positiveWaves !== 'absent';
                    const fascAbn = e.spontaneousActivity.fasciculations !== 'absent';
                    const durAbn = e.motorUnitPotentials.duration > 15 || e.motorUnitPotentials.duration < 6;
                    const ampAbn = e.motorUnitPotentials.amplitude > 5000 || e.motorUnitPotentials.amplitude < 200;
                    const recAbn = e.recruitmentPattern !== 'normal';
                    const isAudioPlaying = playingAudioMuscle === e.muscle;
                    return (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
                        <td className="p-2"><div className="text-white font-medium text-xs">{e.muscle}</div><div className="text-gray-500 text-xs">{e.nerve}</div></td>
                        <td className="p-2 text-center text-gray-300 text-xs">{e.root}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAudio(e.muscle, e)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                              isAudioPlaying
                                ? 'bg-red-500/20 text-red-300 border border-red-500 animate-pulse'
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                            }`}
                            title="Auscultar sonido EMG"
                          >
                            {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span className="hidden lg:inline">{isAudioPlaying ? 'Parar' : 'Oír'}</span>
                          </button>
                        </td>
                        <td className={`p-2 text-center text-xs ${e.insertionalActivity !== 'normal' ? 'text-yellow-400' : 'text-gray-300'}`}>{e.insertionalActivity === 'normal' ? 'Nl' : e.insertionalActivity === 'increased' ? '↑' : '↓'}</td>
                        <td className={`p-2 text-center text-xs ${fibAbn ? 'text-red-400 font-bold' : 'text-green-400'}`}>{e.spontaneousActivity.fibrillations === 'absent' ? '-' : e.spontaneousActivity.fibrillations}</td>
                        <td className={`p-2 text-center text-xs ${pwAbn ? 'text-red-400 font-bold' : 'text-green-400'}`}>{e.spontaneousActivity.positiveWaves === 'absent' ? '-' : e.spontaneousActivity.positiveWaves}</td>
                        <td className={`p-2 text-center text-xs ${fascAbn ? 'text-red-400 font-bold' : 'text-green-400'}`}>{e.spontaneousActivity.fasciculations === 'absent' ? '-' : e.spontaneousActivity.fasciculations}</td>
                        <td className={`p-2 text-center text-xs ${durAbn ? 'text-red-400 font-bold' : 'text-green-400'}`}>{e.motorUnitPotentials.duration}</td>
                        <td className={`p-2 text-center text-xs ${ampAbn ? 'text-red-400 font-bold' : 'text-green-400'}`}>{e.motorUnitPotentials.amplitude}</td>
                        <td className={`p-2 text-center text-xs ${e.motorUnitPotentials.polyphasia > 25 ? 'text-yellow-400' : 'text-gray-300'}`}>{e.motorUnitPotentials.polyphasia}%</td>
                        <td className={`p-2 text-center text-xs ${recAbn ? 'text-red-400 font-bold' : 'text-green-400'}`}>{e.recruitmentPattern === 'normal' ? 'Nl' : e.recruitmentPattern === 'reduced' ? '↓' : e.recruitmentPattern === 'early' ? '↑Precoz' : e.recruitmentPattern}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── RENDER: Diagnosis Selector ──
  const renderDiagnosis = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-amber-600/20 p-3 rounded-xl"><Brain className="w-6 h-6 text-amber-400" /></div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {isStudyMode && !assignmentId ? '📖 Modo Estudio — Diagnóstico' : '¿Cuál es tu diagnóstico?'}
          </h2>
          <p className="text-sm text-gray-400">
            {isStudyMode && !assignmentId
              ? 'Revisa la respuesta correcta y la explicación'
              : 'Selecciona el patrón que mejor explica los hallazgos'}
          </p>
        </div>
      </div>

      {/* Study mode: reveal answer directly */}
      {isStudyMode && !assignmentId && clinicalCase && (
        <div className="bg-purple-900/30 rounded-xl p-5 border border-purple-700/50 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 font-semibold">Respuesta Correcta:</span>
          </div>
          <div className="text-white text-xl font-bold">{clinicalCase.correctDiagnosis.patternName}</div>
          <p className="text-gray-300 text-sm leading-relaxed">{clinicalCase.correctDiagnosis.explanation}</p>
          <div className="pt-2 border-t border-purple-700/30">
            <div className="text-sm text-purple-300 font-medium mb-2">Hallazgos Clave:</div>
            <ul className="space-y-1">
              {clinicalCase.correctDiagnosis.keyFindings.map((f, i) => (
                <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span><strong>{f.parameter}</strong>: {f.significance}</span>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={generateNewCase}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold">
            Siguiente Caso <ChevronRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      )}

      {/* Normal exam mode — Premium selection cards */}
      {(!isStudyMode || !!assignmentId) && (
        <>
          <div className="grid gap-3">
            {options.map((opt, idx) => (
              <button key={opt.patternId} onClick={() => setSelectedAnswer(opt.patternId)}
                className={`text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group ${
                  selectedAnswer === opt.patternId
                    ? 'bg-amber-600/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-500/60 hover:bg-gray-800/50'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    selectedAnswer === opt.patternId
                      ? 'border-amber-400 bg-amber-500 text-white scale-100'
                      : 'border-gray-600 text-transparent group-hover:border-gray-500'
                  }`}>
                    {selectedAnswer === opt.patternId ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs text-gray-500">{String.fromCharCode(65 + idx)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm sm:text-base ${selectedAnswer === opt.patternId ? 'text-amber-200' : 'text-white'}`}>{opt.patternName}</div>
                    <div className="text-xs sm:text-sm text-gray-400 mt-0.5 line-clamp-2">{opt.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => handleSubmitDiagnosis()} disabled={!selectedAnswer}
            className="w-full py-4 rounded-2xl font-bold text-base sm:text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-xl shadow-amber-600/20 active:scale-[0.98]">
            Confirmar Diagnóstico
          </button>
        </>
      )}
    </div>
  );

  // ─── RENDER: Feedback ──────
  const renderFeedback = () => {
    if (!evaluation || !clinicalCase) return null;

    const toggleSection = (key: string) => {
      setExpandedFeedback(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Result Banner */}
        <div className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 text-center ${evaluation.isCorrect ? 'bg-gradient-to-br from-green-900/40 to-emerald-950/30 border border-green-700/40' : 'bg-gradient-to-br from-red-900/40 to-rose-950/30 border border-red-700/40'}`}>
          <div className={`absolute inset-0 ${evaluation.isCorrect ? 'bg-green-500/5' : 'bg-red-500/5'}`} />
          <div className="relative">
            <div className="flex justify-center mb-3">
              {evaluation.isCorrect
                ? <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-400" />
                : <XCircle className="w-14 h-14 sm:w-16 sm:h-16 text-red-400" />}
            </div>
            <h2 className={`text-2xl sm:text-3xl font-bold ${evaluation.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
              {evaluation.isCorrect ? '¡Correcto!' : 'Incorrecto'}
            </h2>
            <div className="text-gray-300 text-sm sm:text-base mt-1">
              Diagnóstico: <strong className="text-white">{evaluation.correctPatternName}</strong>
            </div>

            {/* Score + Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
              <div className="bg-black/20 rounded-xl p-3">
                <Award className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">{animatedScore}</div>
                <div className="text-[10px] text-gray-500 uppercase">Puntos</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3">
                <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">{formatTime(evaluation.timeSpent ?? 0)}</div>
                <div className="text-[10px] text-gray-500 uppercase">Tiempo</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3">
                <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">{store.currentStreak}</div>
                <div className="text-[10px] text-gray-500 uppercase">Racha</div>
              </div>
              {hintsUsed > 0 && (
                <div className="bg-black/20 rounded-xl p-3">
                  <HelpCircle className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-xl sm:text-2xl font-bold font-mono text-white">-{hintsUsed * 5}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Pistas</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Banner de Sincronización Docente */}
        {timedOut && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex items-center gap-3 text-amber-200">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block text-amber-100 text-sm">Tiempo agotado</span>
              El caso se envió automáticamente con {evaluation.selectedAnswer === 'Sin respuesta' ? 'sin diagnóstico seleccionado' : 'la opción que tenías marcada'}.
            </div>
          </div>
        )}
        {assignmentSubmitted && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 flex items-center gap-3 text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block text-emerald-200 text-sm">
                ¡Resolución Asentada en tu Expediente!
              </span>
              Tu calificación ({evaluation.score}/100) y tiempo empleado han sido enviados automáticamente a tu profesor.
            </div>
          </div>
        )}
        {assignmentId && assignmentError && !assignmentSubmitted && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-red-200">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-red-100 text-sm">No se asentó la calificación</span>
                {assignmentError}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSubmitDiagnosis(timedOut ? { timedOut: true } : undefined)}
              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
            >
              Reintentar envío
            </button>
          </div>
        )}

        {/* Severity Badge */}
        {clinicalCase.correctDiagnosis.severityGrade && (
          <div className={`rounded-xl p-3 flex items-center gap-3 border ${
            clinicalCase.correctDiagnosis.severityGrade === 'very_severe' ? 'bg-red-950/40 border-red-600/50' :
            clinicalCase.correctDiagnosis.severityGrade === 'severe' ? 'bg-red-950/30 border-red-700/40' :
            clinicalCase.correctDiagnosis.severityGrade === 'moderate' ? 'bg-yellow-950/30 border-yellow-700/40' :
            'bg-green-950/30 border-green-700/40'
          }`}>
            <span className="text-xl">{
              clinicalCase.correctDiagnosis.severityGrade === 'very_severe' ? '🔴' :
              clinicalCase.correctDiagnosis.severityGrade === 'severe' ? '🟠' :
              clinicalCase.correctDiagnosis.severityGrade === 'moderate' ? '🟡' : '🟢'
            }</span>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Severidad</div>
              <div className="text-sm font-bold text-white">
                {clinicalCase.correctDiagnosis.severityGrade === 'very_severe' ? 'Muy Severo' :
                 clinicalCase.correctDiagnosis.severityGrade === 'severe' ? 'Severo' :
                 clinicalCase.correctDiagnosis.severityGrade === 'moderate' ? 'Moderado' : 'Leve'}
              </div>
              {clinicalCase.correctDiagnosis.severityExplanation && (
                <div className="text-xs text-gray-400 mt-0.5">{clinicalCase.correctDiagnosis.severityExplanation}</div>
              )}
            </div>
          </div>
        )}

        {/* Pitfall Banner */}
        {clinicalCase.isPitfall && clinicalCase.pitfallExplanation && (
          <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
              <AlertTriangle className="w-5 h-5" /> CASO TRAMPA — Explicación
            </div>
            <div className="text-amber-200/90 text-sm leading-relaxed whitespace-pre-line">
              {clinicalCase.pitfallExplanation}
            </div>
          </div>
        )}

        {/* Collapsible: Explanation */}
        <div className="rounded-xl border border-gray-700/50 overflow-hidden">
          <button onClick={() => toggleSection('explanation')} className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Lightbulb className="w-4 h-4 text-amber-400" /> Explicación
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFeedback.explanation ? 'rotate-180' : ''}`} />
          </button>
          {expandedFeedback.explanation && (
            <div className="p-4 bg-gray-900/30 border-t border-gray-700/30">
              <p className="text-gray-200 leading-relaxed text-sm sm:text-base">{evaluation.explanation}</p>
            </div>
          )}
        </div>

        {/* Collapsible: Key Findings */}
        {evaluation.keyFindingsHighlighted.length > 0 && (
          <div className="rounded-xl border border-gray-700/50 overflow-hidden">
            <button onClick={() => toggleSection('findings')} className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                🔑 Hallazgos Clave <span className="text-xs text-gray-500 font-normal">({evaluation.keyFindingsHighlighted.length})</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFeedback.findings ? 'rotate-180' : ''}`} />
            </button>
            {expandedFeedback.findings && (
              <div className="p-4 bg-gray-900/30 border-t border-gray-700/30 space-y-2">
                {evaluation.keyFindingsHighlighted.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] mt-0.5 uppercase tracking-wider font-bold flex-shrink-0 ${
                      f.importance === 'critical' ? 'bg-red-900/50 text-red-300'
                      : f.importance === 'major' ? 'bg-amber-900/50 text-amber-300'
                      : 'bg-blue-900/50 text-blue-300'}`}>
                      {f.importance === 'critical' ? 'Crítico' : f.importance === 'major' ? 'Mayor' : 'Soporte'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-white text-xs sm:text-sm"><strong>{f.parameter}</strong> — {f.location}: <code className="text-amber-300">{f.value}</code> <span className="text-gray-500">(N: {f.normalValue})</span></div>
                      <div className="text-gray-400 text-xs mt-0.5">{f.significance}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible: Differential */}
        {evaluation.differentialExplanations.length > 0 && (
          <div className="rounded-xl border border-gray-700/50 overflow-hidden">
            <button onClick={() => toggleSection('differential')} className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> ¿Por qué no otros?
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFeedback.differential ? 'rotate-180' : ''}`} />
            </button>
            {expandedFeedback.differential && (
              <div className="p-4 bg-gray-900/30 border-t border-gray-700/30 space-y-2">
                {evaluation.differentialExplanations.map((d, i) => (
                  <div key={i} className="bg-gray-800/30 rounded-lg p-3">
                    <div className="text-amber-300 font-medium text-sm">{d.patternName}</div>
                    <div className="text-gray-300 text-xs sm:text-sm mt-1">{d.whyNot}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCurrentStep('case')}
            className="py-3 sm:py-4 rounded-xl bg-gray-700/60 hover:bg-gray-600/60 text-white font-medium transition-colors text-sm sm:text-base">
            <Eye className="w-4 h-4 inline mr-1.5" />Revisar Caso
          </button>
          {assignmentId ? (
            <button onClick={() => navigate('/dashboard?tab=assignments')}
              className="py-3 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all text-sm sm:text-base">
              Volver a Tareas <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          ) : (
            <button onClick={generateNewCase}
              className="py-3 sm:py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold transition-all text-sm sm:text-base">
              Siguiente <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>
        {publicMode && <PublicSimulatorAuthBar />}
      </div>
    );
  };

  // ─── MAIN RENDER ────────────
  const renderStep = () => {
    switch (currentStep) {
      case 'config': return renderConfig();
      case 'case': return renderCase();
      case 'ncs': return renderNCS();
      case 'emg': return renderEMG();
      case 'diagnosis': return renderDiagnosis();
      case 'feedback': return renderFeedback();
    }
  };

  const STEP_ICONS: Record<ExerciseStep, React.ReactNode> = {
    config: <Target className="w-3.5 h-3.5" />,
    case: <User className="w-3.5 h-3.5" />,
    ncs: <Activity className="w-3.5 h-3.5" />,
    emg: <Zap className="w-3.5 h-3.5" />,
    diagnosis: <Brain className="w-3.5 h-3.5" />,
    feedback: <Award className="w-3.5 h-3.5" />,
  };

  const STEP_SHORT: Record<ExerciseStep, string> = {
    config: 'Config', case: 'Caso', ncs: 'NCS', emg: 'EMG', diagnosis: 'Dx', feedback: 'Eval',
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-gray-100 pt-14 sm:pt-16">
      {currentStep === 'config' && returnTo && (
        <div className="sticky top-14 sm:top-16 z-40 border-b border-gray-700/60 bg-gray-800/95">
          <div className="max-w-5xl mx-auto px-3 py-2">
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al catálogo
            </button>
          </div>
        </div>
      )}

      {/* Top bar with timer + clickable progress */}
      {currentStep !== 'config' && (
        <div className="bg-gray-800/95 backdrop-blur-lg border-b border-gray-700/60 sticky top-14 sm:top-16 z-40" style={{ backgroundColor: 'rgba(31, 41, 55, 0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(55, 65, 81, 0.6)' }}>
          <div className="max-w-5xl mx-auto px-3 sm:px-4">
            {/* Top row: back + tabs + timer */}
            <div className="flex items-center gap-1 sm:gap-3 py-2 sm:py-2.5">
              <button onClick={handleTopBack}
                className="text-gray-400 hover:text-white transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-700/50 inline-flex items-center gap-1 shrink-0"
                title={assignmentId ? 'Volver a tareas' : returnTo ? 'Volver al catálogo' : 'Volver a configuración'}>
                <ArrowLeft className="w-5 h-5" />
                {returnTo && !assignmentId && (
                  <span className="hidden sm:inline text-xs font-semibold">Catálogo</span>
                )}
              </button>

              {assignmentId && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold shrink-0">
                  <span>📝 {assignmentTitle}</span>
                  {isAssignedPending && (
                    <span className={`px-1.5 py-0.5 rounded ${isAssignedExam ? 'bg-purple-600/40 text-purple-200' : 'bg-emerald-600/40 text-emerald-200'}`}>
                      {isAssignedExam ? 'Examen' : 'Formativo'}
                    </span>
                  )}
                </div>
              )}

              {/* Step tabs */}
              <div className="flex-1 flex gap-0.5 items-center justify-center">
                {STEPS.filter(s => s !== 'config').map(s => {
                  const sIdx = STEPS.indexOf(s);
                  const isActive = s === currentStep;
                  const isVisited = sIdx < stepIndex || (s === 'feedback' && evaluation);
                  const isClickable = (sIdx >= 1 && sIdx <= 4 && clinicalCase && currentStep !== 'feedback')
                    || (s === 'feedback' && evaluation);
                  return (
                    <button
                      key={s}
                      onClick={() => isClickable && handleStepClick(s)}
                      className={`relative flex flex-col items-center px-1.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                        isActive ? 'text-amber-300'
                        : isVisited ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                        : 'text-gray-600'
                      } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`hidden sm:inline transition-colors ${isActive ? 'text-amber-400' : ''}`}>{STEP_ICONS[s]}</span>
                        <span className={isActive ? 'font-bold' : ''}>{STEP_SHORT[s]}</span>
                      </div>
                      {/* Active dot indicator */}
                      {isActive && (
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Timer */}
              {currentStep !== 'feedback' && (
                <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono whitespace-nowrap border ${
                  remainingSeconds !== null
                    ? remainingSeconds <= 60
                      ? 'bg-red-900/40 text-red-300 border-red-600/50 animate-pulse'
                      : remainingSeconds <= 180
                      ? 'bg-amber-900/30 text-amber-300 border-amber-700/40'
                      : 'bg-indigo-900/30 text-indigo-200 border-indigo-700/40'
                    : elapsedSeconds > 300 ? 'bg-red-900/30 text-red-300 border-red-700/40'
                    : elapsedSeconds > 180 ? 'bg-amber-900/30 text-amber-300 border-amber-700/40'
                    : 'bg-gray-700/30 text-gray-400 border-gray-700/40'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(elapsedSeconds)}
                </div>
              )}
            </div>

            {/* Progress bar */}
            {(() => {
              const exerciseSteps = STEPS.filter(s => s !== 'config');
              const currentIdx = exerciseSteps.indexOf(currentStep);
              const progress = currentIdx >= 0 ? ((currentIdx + 1) / exerciseSteps.length) * 100 : 0;
              return (
                <div className="h-0.5 bg-gray-700/40 -mx-3 sm:-mx-4">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out rounded-r-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Quick-review panel on diagnosis step */}
      {showReviewPanel && currentStep === 'diagnosis' && clinicalCase && (
        <div className="fixed inset-y-0 right-0 w-[85vw] sm:w-80 md:w-96 bg-gray-800/98 backdrop-blur-xl border-l border-gray-700 z-50 overflow-y-auto shadow-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">📋 Resumen de Datos</h3>
              <button onClick={() => setShowReviewPanel(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3 text-xs">
              <div><div className="text-gray-500 uppercase tracking-wider text-[10px] mb-1">NCS</div>
                {clinicalCase.ncsResults.map((r, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-gray-700/30">
                    <span className="text-gray-300">{r.nerve} ({r.type === 'motor' ? 'M' : 'S'})</span>
                    <span className={cellColor(r.status)}>{r.status === 'normal' ? '✓' : r.status === 'borderline' ? '⚠' : '✗'}</span>
                  </div>
                ))}
              </div>
              <div><div className="text-gray-500 uppercase tracking-wider text-[10px] mb-1">EMG</div>
                {clinicalCase.emgResults.map((e, i) => {
                  const hasAbn = e.spontaneousActivity.fibrillations !== 'absent' || e.spontaneousActivity.positiveWaves !== 'absent' || e.recruitmentPattern !== 'normal';
                  return (
                    <div key={i} className="flex justify-between py-1 border-b border-gray-700/30">
                      <span className="text-gray-300">{e.muscle}</span>
                      <span className={hasAbn ? 'text-red-400' : 'text-green-400'}>{hasAbn ? '✗' : '✓'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main id="contenido-principal" className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8" style={{ paddingBottom: '12rem' }}>
        {renderStep()}
        {publicMode && currentStep !== 'config' && currentStep !== 'feedback' && (
          <PublicSimulatorAuthBar />
        )}

        {/* Hints — rendered INLINE in the content flow, never overlaps */}
        {hintsAllowed && showHint && hintsUsed > 0 && currentStep !== 'config' && currentStep !== 'feedback' && (
          <div className="mt-4" style={{ marginBottom: '5rem' }}>
            <div className="bg-purple-950 rounded-xl p-4 border border-purple-700/50 shadow-lg space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Pistas ({hintsUsed}/{maxHints})</span>
              </div>
              {currentHints.slice(0, hintsUsed).map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm pl-1">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span className="text-purple-200">{h}</span>
                </div>
              ))}
              <button onClick={() => setShowHint(false)}
                className="text-xs text-purple-400 hover:text-purple-300 block w-full text-center py-1.5 mt-2 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 transition-colors">
                Ocultar pistas
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav with Hints */}
      {currentStep !== 'config' && currentStep !== 'feedback' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-lg border-t border-gray-700/60 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', backgroundColor: 'rgba(31, 41, 55, 0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(55, 65, 81, 0.6)' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between py-3 px-3 sm:px-4">
            <button onClick={goPrev} disabled={!canGoPrev}
              className="px-3 sm:px-5 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors text-sm min-h-[44px]">
              <ChevronLeft className="w-4 h-4 inline mr-0.5 sm:mr-1" /><span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Hint button — only on case/ncs/emg/diagnosis steps, not in study mode or assigned exams */}
            {hintsAllowed && maxHints > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={requestHint} disabled={hintsUsed >= maxHints}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:bg-purple-900/60 disabled:opacity-30 transition-colors text-sm">
                  <HelpCircle className="w-4 h-4" />
                  Pista ({hintsUsed}/{maxHints})
                </button>
              </div>
            )}

            {/* Review panel toggle on diagnosis */}
            {currentStep === 'diagnosis' && (
              <button onClick={() => setShowReviewPanel(!showReviewPanel)}
                className={`px-3 py-2.5 rounded-lg text-sm min-h-[44px] transition-colors ${showReviewPanel ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                📋
              </button>
            )}

            {canGoNext ? (
              <button onClick={goNext}
                className="px-3 sm:px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors text-sm min-h-[44px]">
                <span className="hidden sm:inline">Siguiente</span><ChevronRight className="w-4 h-4 inline ml-0.5" />
              </button>
            ) : currentStep === 'diagnosis' && (!isStudyMode || !!assignmentId) ? (
              <button onClick={() => handleSubmitDiagnosis()} disabled={!selectedAnswer}
                className="px-4 sm:px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold disabled:opacity-30 transition-all text-sm min-h-[44px]">
                Confirmar
              </button>
            ) : <div />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseMode;
