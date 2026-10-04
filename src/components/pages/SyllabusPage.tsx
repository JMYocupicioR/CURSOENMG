import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Check,
  GraduationCap,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Sparkles,
  Award,
  Zap,
  Layers,
  Stethoscope,
  Activity,
  Sliders,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Users,
  Compass,
  Calendar,
  UserCheck,
  FileText,
  Download,
  Filter,
} from 'lucide-react';
import { Topic } from '../../types/content';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuizTopicFlags } from '../../hooks/useQuizTopicFlags';
import { QuizTopicBadge } from '../quiz/QuizTopicBadge';
import { useTopicProgress } from '../../hooks/useTopicProgress';
import { BRAND } from '../../config/brand';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { getCourseIdForModule } from '../../content/courseCatalog';
import type { CourseId } from '../../types/database';
import { DownloadSyllabusBrochureButton } from './DownloadSyllabusBrochureButton';
import type { AcademicMilestone } from '../../types/academicGradebook';
import { getAcademicMilestones } from '../../services/academicScheduleService';

/* ── Flatten topics for search ── */
function flattenTopics(
  topics: Topic[],
  moduleId: string,
  moduleTitle: string,
  parentTitles: string[] = [],
  parentPaths: string[] = []
): { id: string; title: string; description?: string; moduleId: string; moduleTitle: string; breadcrumb: string; path: string[] }[] {
  const list: { id: string; title: string; description?: string; moduleId: string; moduleTitle: string; breadcrumb: string; path: string[] }[] = [];
  for (const t of topics) {
    const currentBreadcrumb = [...parentTitles, t.title].join(' › ');
    const currentPath = [...parentPaths, t.id];
    list.push({
      id: t.id,
      title: t.title,
      description: t.description,
      moduleId,
      moduleTitle,
      breadcrumb: currentBreadcrumb,
      path: currentPath,
    });
    if (t.children) {
      list.push(...flattenTopics(t.children, moduleId, moduleTitle, [...parentTitles, t.title], currentPath));
    }
  }
  return list;
}

function countTotalTopics(topics: Topic[]): number {
  let count = 0;
  for (const t of topics) {
    count++;
    if (t.children) count += countTotalTopics(t.children);
  }
  return count;
}

/* ── Resumen rápido y simplificado por pilares ── */
const SIMPLIFIED_PILLARS = [
  {
    id: 'biofisica',
    number: '01',
    title: 'Fundamentos Bioeléctricos e Instrumentación',
    modules: 'Módulos 01 y 13',
    badge: 'Base Fisiológica',
    color: 'from-blue-600 to-indigo-600',
    borderColor: 'border-blue-200 dark:border-blue-900/60',
    bgLight: 'bg-blue-50/60 dark:bg-blue-950/20',
    icon: Sliders,
    summary:
      'Comprensión rigurosa de cómo se originan los biopotenciales de membrana y cómo se configuran adecuadamente los filtros, la ganancia, el barrido y la tierra del electromiógrafo.',
    keyPoints: [
      'Configuración de filtros pasa-altas y pasa-bajas para evitar distorsión de latencia y fase.',
      'Eliminación de interferencia a 60 Hz y reducción de impedancia piel-electrodo.',
      'Prevención de artefactos por volumen conductor y sobreestimulación.',
      'Normas de bioseguridad eléctrica en pacientes con marcapasos o DAI.',
    ],
    outcome:
      'Dominarás la calibración del equipo para obtener registros fidedignos sin artefactos que simulen patología.',
  },
  {
    id: 'ncs',
    number: '02',
    title: 'Estudios de Neuroconducción Periférica (NCS)',
    modules: 'Módulos 02 y 04',
    badge: 'Conducción Nerviosa',
    color: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-200 dark:border-emerald-900/60',
    bgLight: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    icon: Zap,
    summary:
      'Protocolos estandarizados de neuroconducción motora y sensitiva en extremidades superiores e inferiores, incluyendo técnicas segmentarias de alta resolución.',
    keyPoints: [
      'Parámetros normativos: latencia distal, amplitud CMAP / SNAP y velocidad de conducción.',
      'Diferenciación cuantitativa: pérdida axonal vs desmielinización vs bloqueo de conducción.',
      'Respuestas tardías: análisis de persistencia y cronodispersión de Onda F, y Reflejo H.',
      'Técnicas comparativas de segmento corto (Inching) para atrapamientos focales.',
    ],
    outcome:
      'Podrás localizar con precisión milimétrica el sitio de lesión y categorizar el mecanismo fisiopatológico primario.',
  },
  {
    id: 'emg',
    number: '03',
    title: 'Electromiografía de Aguja y Mapeo Miopático/Neuropático',
    modules: 'Módulos 03 y 05',
    badge: 'Mapeo Muscular',
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-200 dark:border-amber-900/60',
    bgLight: 'bg-amber-50/60 dark:bg-amber-950/20',
    icon: Activity,
    summary:
      'Exploración muscular sistemática con aguja concéntrica en las 4 fases clásicas: inserción, reposo, activación voluntaria mínima y esfuerzo máximo.',
    keyPoints: [
      'Reconocimiento de actividad espontánea anormal: fibrilaciones, ondas agudas positivas y CRDs.',
      'Identificación de descargas miotónicas, fasciculaciones y mioquimias.',
      'Análisis morfométrico del PUM (Potencial de Unidad Motora): duración, fases y amplitud.',
      'Graduación del patrón de reclutamiento e interferencia (pérdida de unidades vs reclutamiento precoz).',
    ],
    outcome:
      'Distinguirás con seguridad afecciones neuropáticas (denervación activa vs reinervación) de procesos miopáticos primarios.',
  },
  {
    id: 'unm',
    number: '04',
    title: 'Unión Neuromuscular y Respuestas Especiales',
    modules: 'Módulos 05 y 07',
    badge: 'Transmisión Sináptica',
    color: 'from-purple-600 to-indigo-600',
    borderColor: 'border-purple-200 dark:border-purple-900/60',
    bgLight: 'bg-purple-50/60 dark:bg-purple-950/20',
    icon: Layers,
    summary:
      'Evaluación neurofisiológica de trastornos postsinápticos y presinápticos mediante estimulación nerviosa repetitiva y pruebas dinámicas.',
    keyPoints: [
      'Estimulación repetitiva a baja frecuencia (3 Hz): detección de decremento mayor al 10%.',
      'Prueba de ejercicio breve (10 s) para agotamiento pos-ejercicio vs facilitación.',
      'Estimulación a alta frecuencia (20-50 Hz) o post-ejercicio prolongado en síndromes presinápticos.',
      'Protocolos diferenciales para Miastenia Gravis, Lambert-Eaton y Botulismo.',
    ],
    outcome:
      'Aprenderás a ejecutar e interpretar las pruebas diagnósticas con sensibilidad óptima evitando falsos negativos por temperatura o fatiga.',
  },
  {
    id: 'patologias',
    number: '05',
    title: 'Diagnóstico Topográfico de Patologías Frecuentes',
    modules: 'Módulos 08, 09 y 10',
    badge: 'Casos Clínicos y Criterios',
    color: 'from-rose-600 to-pink-600',
    borderColor: 'border-rose-200 dark:border-rose-900/60',
    bgLight: 'bg-rose-50/60 dark:bg-rose-950/20',
    icon: Stethoscope,
    summary:
      'Algoritmos de decisión para las principales neuropatías focales, radiculopatías, plexopatías y enfermedades de motoneurona bajo directrices internacionales.',
    keyPoints: [
      'Síndrome del Túnel Carpiano: criterios de severidad AANEM y pruebas de sensibilidad cruzada.',
      'Neuropatía ulnar en codo (túnel cubital vs arcada de Struthers) y nervio radial.',
      'Radiculopatías cervicales y lumbosacras: muestreo miotomal de Aguja y exclusión de plexopatía.',
      'Criterios Gold Coast (2019) para Esclerosis Lateral Amiotrófica (ELA) y EAN/PNS (2021) para CIDP.',
    ],
    outcome:
      'Desarrollarás criterio clínico resolutivo para fundamentar diagnósticos certeros con impacto directo en el pronóstico del paciente.',
  },
  {
    id: 'avanzados',
    number: '06',
    title: 'Potenciales Evocados, Ultrasonido y Control de Calidad',
    modules: 'Módulos 06, 07 y 13',
    badge: 'Técnicas Multimodales',
    color: 'from-cyan-600 to-blue-600',
    borderColor: 'border-cyan-200 dark:border-cyan-900/60',
    bgLight: 'bg-cyan-50/60 dark:bg-cyan-950/20',
    icon: Compass,
    summary:
      'Integración de vías sensoriales centrales (PESS, PEV, PEATC) con ecografía neuromuscular de alta resolución para correlación morfológica.',
    keyPoints: [
      'Potenciales Evocados Somatosensoriales (PESS): latencias N9, N13, N20 y P37.',
      'Ultrasonido Neuromuscular: medición del área de sección transversal (CSA) y ecoestructura nerviosa.',
      'Escala Heckmatt para miopatías y protocolos combinados EMG-ecografía.',
      'Checklist de control de calidad para emisión de reportes médicos de validez legal y académica.',
    ],
    outcome:
      'Complementarás el estudio electrofisiológico funcional con imagen anatómica en tiempo real para diagnósticos de máxima certidumbre.',
  },
];

export default function SyllabusPage() {
  const { isEnrolledPhysician, user, hasCourseAccess, hasPremiumAccess } = useAuth();
  const { hasQuiz, moduleQuizCount } = useQuizTopicFlags();
  const { isCompleted, getParentTopicStats, getModuleStats } = useTopicProgress();
  const { grouped, unassigned, modulesWithOverrides, assignments, loading } = useSyllabusCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseFilterParam = searchParams.get('curso') || 'todos';
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(courseFilterParam);
  const [activeTab, setActiveTab] = useState<'temario' | 'resumen' | 'inscripcion'>('temario');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [didExpand, setDidExpand] = useState(false);
  const [milestones, setMilestones] = useState<AcademicMilestone[]>([]);

  useEffect(() => {
    const param = searchParams.get('curso');
    if (param && param !== selectedCourseFilter) {
      setSelectedCourseFilter(param);
    } else if (!param && selectedCourseFilter !== 'todos') {
      setSelectedCourseFilter('todos');
    }
  }, [searchParams]);

  const handleSelectCourseFilter = (courseId: string) => {
    setSelectedCourseFilter(courseId);
    const newParams = new URLSearchParams(searchParams);
    if (courseId === 'todos') {
      newParams.delete('curso');
    } else {
      newParams.set('curso', courseId);
    }
    setSearchParams(newParams, { replace: true });
  };

  const displayedGrouped = useMemo(() => {
    if (selectedCourseFilter === 'todos') return grouped;
    return grouped.filter((g) => g.course.id === selectedCourseFilter);
  }, [grouped, selectedCourseFilter]);

  useEffect(() => {
    let cancelled = false;
    void getAcademicMilestones().then((rows) => {
      if (!cancelled) setMilestones(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didExpand && modulesWithOverrides.length) {
      setExpandedModules(new Set(modulesWithOverrides.map((m) => m.id)));
      setDidExpand(true);
    }
  }, [modulesWithOverrides, didExpand]);

  const totalModulesCount = modulesWithOverrides.length;
  const totalTopicsCount = useMemo(() => {
    return modulesWithOverrides.reduce((acc, mod) => acc + countTotalTopics(mod.topics), 0);
  }, [modulesWithOverrides]);

  const searchableTopics = useMemo(() => {
    return modulesWithOverrides.flatMap((mod) => flattenTopics(mod.topics, mod.id, mod.title));
  }, [modulesWithOverrides]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;
    const q = searchQuery.toLowerCase();
    return searchableTopics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.moduleTitle.toLowerCase().includes(q)
    );
  }, [searchQuery, searchableTopics]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedModules(new Set(modulesWithOverrides.map((m) => m.id)));
  const collapseAll = () => setExpandedModules(new Set());

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-24">
      {/* ── Hero Section ── */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-6 border border-blue-500/20"
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>
              {BRAND.enableAccreditation
                ? 'Programa Académico Oficial · Avalado por COMEFYR'
                : 'Programa Académico Oficial · Posgrado en Neurofisiología Clínica'}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-5"
          >
            Temario Completo y Resumen del Curso
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8"
          >
            Formación especializada de alto nivel en Electrodiagnóstico, Conducción Nerviosa y Electromiografía Clínica.
            Todo el material didáctico interactivo, simuladores y evaluaciones es de acceso exclusivo mediante suscripción para médicos en formación y especialistas.
          </motion.p>

          {/* Quick Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto mb-10 text-left"
          >
            {[
              { label: 'Módulos Clínicos', value: `${totalModulesCount}`, icon: BookOpen, color: 'text-blue-500' },
              { label: 'Temas Detallados', value: `${totalTopicsCount}+`, icon: Layers, color: 'text-indigo-500' },
              {
                label: BRAND.enableAccreditation ? 'Aval Académico' : 'Acreditación',
                value: BRAND.enableAccreditation ? 'COMEFYR' : 'Posgrado',
                icon: Award,
                color: 'text-emerald-500',
              },
              { label: 'Acceso Exclusivo', value: 'Suscripción', icon: Lock, color: 'text-amber-500' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {isEnrolledPhysician ? (
              <Link
                to="/modulo/fundamentals"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
              >
                <Check className="w-5 h-5" />
                Ya estás inscrito — Entrar a las lecciones
              </Link>
            ) : user ? (
              <Link
                to="/perfil"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
              >
                <GraduationCap className="w-5 h-5" />
                Completar mi suscripción de alumno
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/auth/registro"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
              >
                <GraduationCap className="w-5 h-5" />
                {BRAND.enableAccreditation
                  ? 'Inscribirme como Alumno (Aval COMEFYR)'
                  : 'Inscribirme como Alumno del Diplomado'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {!user && (
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 font-semibold hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                Ya tengo cuenta · Iniciar sesión
              </Link>
            )}
            <DownloadSyllabusBrochureButton
              grouped={grouped}
              unassigned={unassigned}
              milestones={milestones}
              disabled={loading}
            />
          </motion.div>
        </div>
      </section>

      {/* ── Navigation Tabs ── */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-10">
        <div className="flex flex-wrap items-center justify-center p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 max-w-xl mx-auto">
          {[
            { id: 'temario', label: `Temario Completo (${totalModulesCount} Módulos)` },
            { id: 'resumen', label: 'Resumen Rápido y Simplificado' },
            { id: 'inscripcion', label: BRAND.enableAccreditation ? 'Beneficios y Aval' : 'Beneficios y Acreditación' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Tab 1: Temario Completo ── */}
      {activeTab === 'temario' && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          {/* Course filter pill tabs */}
          <div className="mb-6 p-4 rounded-2xl bg-white/70 dark:bg-slate-850/70 border border-slate-200/70 dark:border-slate-750 backdrop-blur-sm shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Filtrar temario por diplomado o curso:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => handleSelectCourseFilter('todos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCourseFilter === 'todos'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-500/20'
                    : 'bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Todos los diplomados ({totalModulesCount} módulos)
              </button>
              {grouped.map(({ course, modules }) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelectCourseFilter(course.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCourseFilter === course.id
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-500/20'
                      : 'bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {course.title} ({modules.length})
                </button>
              ))}
            </div>
          </div>

          {/* Search bar and controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tema (ej. túnel carpiano, aguja, onda F, ELA)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-800 dark:text-slate-100 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <DownloadSyllabusBrochureButton
                grouped={grouped}
                unassigned={unassigned}
                milestones={milestones}
                disabled={loading}
                variant="compact"
              />
              <button
                onClick={expandAll}
                className="px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition"
              >
                Expandir todos
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition"
              >
                Colapsar todos
              </button>
            </div>
          </div>

          {/* If searching */}
          {searchResults !== null ? (
            <div className="mb-12">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Se encontraron <span className="font-bold text-blue-600 dark:text-blue-400">{searchResults.length}</span> temas relacionados con "{searchQuery}":
              </p>
              {searchResults.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40">
                  <p className="text-slate-500 dark:text-slate-400">No encontramos coincidencias para esa búsqueda en el temario.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((item, idx) => (
                    <Link
                      key={idx}
                      to={`/modulo/${item.moduleId}/${item.path.join('/')}`}
                      className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all flex items-start justify-between gap-4 group"
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                          {item.moduleTitle}
                        </span>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{item.breadcrumb}</p>
                        {item.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <span>Estudiar tema</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : displayedGrouped.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40">
              <p className="text-slate-500 dark:text-slate-400 mb-3">No hay módulos asignados a este diplomado actualmente.</p>
              <button
                type="button"
                onClick={() => handleSelectCourseFilter('todos')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Ver todos los diplomados
              </button>
            </div>
          ) : (
            /* Module Accordions */
            <div className="space-y-10">
              {displayedGrouped.map(({ course, modules }) => {
                if (!modules.length) return null;
                return (
                  <section key={course.id} className="space-y-4">
                    {/* Rich Course Header */}
                    <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm shadow-2xs">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                              Programa de Certificación
                            </span>
                            {hasCourseAccess(course.id) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                                <Check className="w-3.5 h-3.5" /> Acceso activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/80">
                                <Lock className="w-3 h-3" /> Requiere suscripción
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            {course.title}
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
                            {course.description}
                          </p>

                          {/* Docente & Horarios */}
                          <div className="flex flex-wrap items-center gap-3 mt-3.5">
                            {(course.instructor_name || course.instructor_title) && (
                              <div className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
                                <span>
                                  <strong>Docente Titular:</strong> {course.instructor_name || 'Profesor Titular'}
                                  {course.instructor_title ? ` · ${course.instructor_title}` : ''}
                                </span>
                              </div>
                            )}
                            {course.live_schedule_notes && (
                              <div className="inline-flex items-center gap-2 text-xs text-purple-800 dark:text-purple-200 bg-purple-50/80 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span>
                                  <strong>En vivo:</strong> {course.live_schedule_notes}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap md:flex-col items-stretch sm:items-end gap-2 shrink-0">
                          {hasCourseAccess(course.id) ? (
                            <Link
                              to={`/portal/curso/${course.id}`}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                            >
                              <span>Ir a mi aula del curso</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <Link
                              to="/cursos"
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-600/20"
                            >
                              <span>Solicitar inscripción</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          {course.syllabus_brochure_url && (
                            <a
                              href={course.syllabus_brochure_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-500" />
                              <span>Descargar temario (PDF)</span>
                              <Download className="w-3 h-3 text-slate-400 ml-0.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
              {modules.map((mod) => {
                const isExpanded = expandedModules.has(mod.id);
                const topicCount = countTotalTopics(mod.topics);
                const quizCount = moduleQuizCount(mod.id);
                const modStats = getModuleStats(mod.topics);
                const isModDone = modStats.isFullyCompleted;
                const assignedCourse = getCourseIdForModule(assignments, mod.id);
                const isLocked = assignedCourse ? !hasCourseAccess(assignedCourse as CourseId) : !hasPremiumAccess;

                return (
                  <div
                    key={mod.id}
                    id={`modulo-${mod.id}`}
                    className={`rounded-2xl border backdrop-blur-sm overflow-hidden shadow-sm transition-all ${
                      isModDone
                        ? 'border-emerald-300/80 dark:border-emerald-800/70 bg-emerald-50/20 dark:bg-emerald-950/15'
                        : 'border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/50'
                    }`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl text-white text-2xl flex items-center justify-center flex-shrink-0 shadow-md transition-all ${
                            isModDone
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                              : `bg-gradient-to-br ${mod.color}`
                          }`}
                        >
                          {mod.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                              MÓDULO {String(mod.number).padStart(2, '0')}
                            </span>
                            {isModDone ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Módulo Completado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                {modStats.completed > 0 ? `${modStats.completed}/${modStats.total} completados` : `${topicCount} temas`}
                              </span>
                            )}
                            {quizCount > 0 && <QuizTopicBadge compact />}
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            {mod.title}
                            {isLocked && <Lock className="inline w-4 h-4 ml-2 text-amber-500 align-text-top" />}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Link
                          to={`/modulo/${mod.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          title="Entrar directamente a este módulo"
                        >
                          <span className="hidden sm:inline">Entrar al módulo</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Topics Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 px-5 py-4"
                        >
                          <div className="space-y-3">
                            {mod.topics.map((t, idx) => {
                              const isDone = isCompleted(t.id);
                              const parentStats = t.children?.length ? getParentTopicStats(t) : null;
                              const topicUrl = `/modulo/${mod.id}/${t.id}`;

                              return (
                                <div
                                  key={t.id}
                                  className={`p-3.5 rounded-2xl border transition-all ${
                                    isDone || parentStats?.status === 'completed'
                                      ? 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-300/60 dark:border-emerald-800/50'
                                      : 'bg-white/90 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600'
                                  }`}
                                >
                                  <Link
                                    to={topicUrl}
                                    className="flex items-start justify-between gap-3 group/topic cursor-pointer"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                          {mod.number}.{idx + 1}
                                        </span>
                                        <h4 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 group-hover/topic:text-blue-600 dark:group-hover/topic:text-blue-400 transition-colors">
                                          {t.title}
                                        </h4>
                                        {hasQuiz(t.id) && <QuizTopicBadge compact />}
                                        {isDone ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            Completado
                                          </span>
                                        ) : parentStats ? (
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                            parentStats.status === 'completed'
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                              : parentStats.status === 'in_progress'
                                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                          }`}>
                                            {parentStats.completed}/{parentStats.total} completados
                                          </span>
                                        ) : null}
                                      </div>
                                      {t.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                          {t.description}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-slate-400 group-hover/topic:text-blue-500 transition-colors flex-shrink-0 mt-0.5">
                                      <span className="hidden sm:inline font-medium">Estudiar</span>
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  </Link>

                                  {/* Subtopics clickable cards */}
                                  {t.children && t.children.length > 0 && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/30 grid sm:grid-cols-2 gap-1.5">
                                      {t.children.map((sub, sIdx) => {
                                        const subDone = isCompleted(sub.id);
                                        return (
                                          <Link
                                            key={sub.id}
                                            to={`/modulo/${mod.id}/${t.id}/${sub.id}`}
                                            className={`flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg border transition-all group/sub ${
                                              subDone
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 text-slate-700 dark:text-slate-200'
                                                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-700/30 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-cyan-400 hover:border-blue-200 dark:hover:border-blue-800'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="font-mono text-[10px] text-slate-400">
                                                {mod.number}.{idx + 1}.{sIdx + 1}
                                              </span>
                                              <span className="truncate group-hover/sub:font-medium transition-all">{sub.title}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              {subDone ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/sub:text-blue-500" />
                                              )}
                                            </div>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Footer Action for Module */}
                          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              Lecciones completas, perlas clínicas y evaluaciones disponibles para alumnos inscritos.
                            </span>
                            <Link
                              to={isEnrolledPhysician ? `/modulo/${mod.id}` : '/auth/registro'}
                              className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {isEnrolledPhysician ? 'Entrar a este módulo' : 'Inscribirme para cursar este módulo'}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Tab 2: Resumen Rápido y Simplificado ── */}
      {activeTab === 'resumen' && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="mb-8 text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Visión Ejecutiva del Programa
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Una síntesis estructurada en 6 ejes temáticos para comprender con rapidez qué conceptos, protocolos prácticos y habilidades diagnósticas se adquieren a lo largo del curso.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {SIMPLIFIED_PILLARS.map((pillar) => (
              <div
                key={pillar.id}
                className={`p-6 rounded-3xl border ${pillar.borderColor} ${pillar.bgLight} backdrop-blur-sm shadow-sm flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-white dark:bg-slate-800 shadow-sm text-slate-700 dark:text-slate-300">
                      EJE {pillar.number} · {pillar.modules}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/80 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40">
                      {pillar.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pillar.color} text-white flex items-center justify-center shadow-md`}
                    >
                      <pillar.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {pillar.title}
                    </h3>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {pillar.summary}
                  </p>

                  <div className="space-y-2 mb-5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Aspectos prácticos clave:
                    </p>
                    {pillar.keyPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Competencia adquirida: </span>
                    {pillar.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Flow Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-500/20 text-center max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">
              ¿Quieres acceder a todos los protocolos clínicos y casos de estudio?
            </h3>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto mb-6">
              El contenido integral, con valores normativos de referencia, tablas de cálculo de latencias y simulador de casos está disponible exclusivamente para alumnos inscritos.
            </p>
            <Link
              to="/auth/registro"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 font-bold transition shadow-lg shadow-indigo-500/30"
            >
              <GraduationCap className="w-5 h-5" />
              Inscribirme como Alumno
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Tab 3: Beneficios, Aval y Suscripción ── */}
      {activeTab === 'inscripcion' && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Acreditación Médica y Modelo de Suscripción
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              {BRAND.enableAccreditation
                ? `${BRAND.name} está respaldado por el Colegio Mexicano de Medicina de Rehabilitación (COMEFYR) para garantizar estándares de excelencia académica en electrofisiología.`
                : `${BRAND.name} está estructurado bajo estándares de alta exigencia académica en neurofisiología clínica y electrodiagnóstico.`}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: ShieldCheck,
                title: BRAND.enableAccreditation ? 'Aval Oficial COMEFYR' : 'Acreditación Oficial',
                desc: BRAND.enableAccreditation
                  ? 'Programa alineado a las directrices de enseñanza del Colegio Mexicano de Medicina de Rehabilitación.'
                  : 'Programa de posgrado con seguimiento curricular y evaluación formativa continua.',
              },
              {
                icon: FileCheck,
                title: 'Evaluaciones y Certificación',
                desc: 'Exámenes clínicos interactivos al final de cada tema para constatar el aprovechamiento del médico.',
              },
              {
                icon: Users,
                title: 'Comité Editorial de Expertos',
                desc: 'Contenidos revisados y validados continuamente por especialistas activos en neurofisiología clínica.',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-sm text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                  <card.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">{card.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Three steps */}
          <div className="p-8 rounded-3xl bg-white/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700/60 shadow-md mb-12">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              ¿Cómo funciona la inscripción como Alumno?
            </h3>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'Registro Profesional',
                  desc: 'Completa tu registro con correo, institución hospitalaria y cédula profesional o número COMEFYR.',
                },
                {
                  step: '02',
                  title: 'Verificación Académica',
                  desc: 'El comité valida tu perfil médico como residente o especialista en formación electrodiagnóstica.',
                },
                {
                  step: '03',
                  title: 'Acceso Total al Curso',
                  desc: `Desbloquea los ${totalModulesCount} módulos, evaluaciones por tema, simuladores diagnósticos y registro de progreso.`,
                },
              ].map((s) => (
                <div key={s.step} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="inline-block text-sm font-mono font-extrabold text-blue-600 dark:text-blue-400 mb-2">
                    PASO {s.step}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{s.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                to="/auth/registro"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-500/25"
              >
                <GraduationCap className="w-5 h-5" />
                Iniciar mi Registro de Alumno
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer Link to Home ── */}
      <div className="text-center mt-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-500 transition-colors"
        >
          ← Volver a la página principal
        </Link>
      </div>
    </div>
  );
}
