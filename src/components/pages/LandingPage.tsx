import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAllSearchableTopics } from '../../content/modules';
import { useAllModules } from '../../hooks/useAllModules';
import { useAuth } from '../../contexts/AuthProvider';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  BookOpen,
  Zap,
  Crosshair,
  RefreshCw,
  Repeat,
  Brain,
  Wrench,
  Map,
  Stethoscope,
  ClipboardList,
  Table,
  BookMarked,
  ShieldAlert,
  Search,
  GraduationCap,
  Check,
  BarChart3,
  Award,
  ClipboardCheck,
  ArrowRight,
  Lock,
  Video,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { TeacherLanding } from '../landing/TeacherLanding';
import { WorkshopCard } from '../course/WorkshopCard';
import { ComefyrBadge } from '../landing/ComefyrBadge';
import { ClinicalTraceSimulator } from '../landing/ClinicalTraceSimulator';
import { MedicalValueGrid } from '../landing/MedicalValueGrid';
import { BrandLogo } from '../brand/BrandLogo';
import { BRAND } from '../../config/brand';

const iconMap: Record<string, any> = {
  BookOpen,
  Zap,
  Crosshair,
  RefreshCw,
  Repeat,
  Brain,
  Wrench,
  Map,
  Stethoscope,
  ClipboardList,
  Table,
  BookMarked,
  ShieldAlert,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const SUBSCRIPTION_BENEFITS = [
  { icon: BookOpen, title: '13 módulos · 200+ temas', desc: 'ENMG, neuroconducción, electromiografía de aguja, potenciales evocados y ultrasonido neuromuscular.' },
  { icon: ClipboardCheck, title: 'Evaluaciones por tema', desc: 'Cuestionarios clínicos al final de cada lección con retroalimentación argumentada.' },
  { icon: BarChart3, title: 'Seguimiento de progreso', desc: 'Panel personal con avance curricular, intentos y áreas específicas por reforzar.' },
  {
    icon: Award,
    title: BRAND.enableAccreditation ? 'Aval COMEFYR' : 'Valor Curricular',
    desc: BRAND.enableAccreditation
      ? 'Reconocimiento oficial con valor curricular y créditos de educación médica continua.'
      : 'Programa formativo de posgrado con seguimiento curricular y emisión de constancias.',
  },
  { icon: Wrench, title: 'Herramientas interactivas', desc: 'Calculadora topográfica de plexo braquial y simuladores de trazos EMG incluidos.' },
  { icon: Zap, title: 'Modo hospitalario offline', desc: 'Descarga módulos completos para estudiar en quirófanos o áreas sin conexión.' },
];

const FREE_VS_PREMIUM = [
  { feature: 'Temario oficial y resumen analítico del programa', visitor: true, student: true },
  {
    feature: BRAND.enableAccreditation
      ? 'Directorio de especialistas y marco institucional COMEFYR'
      : 'Directorio de especialistas y red académica de electrodiagnóstico',
    visitor: true,
    student: true,
  },
  { feature: 'Contenido formativo completo (13 módulos · 200+ temas)', visitor: false, student: true },
  { feature: 'Calculadora diagnóstica de Plexo Braquial y Modo Ejercicio EMG', visitor: false, student: 'premium' },
  { feature: 'Banco de evaluaciones clínicas con retroalimentación paso a paso', visitor: false, student: true },
  { feature: 'Panel personalizado de progreso y seguimiento curricular', visitor: false, student: true },
  { feature: 'Modo offline PWA para consulta en quirófanos sin cobertura', visitor: false, student: true },
  {
    feature: BRAND.enableAccreditation
      ? 'Constancia oficial con valor curricular avalada por COMEFYR'
      : 'Constancia académica oficial de posgrado con valor curricular',
    visitor: false,
    student: true,
  },
];

function countTopics(topics: any[]): number {
  let count = 0;
  for (const t of topics) {
    count++;
    if (t.children) count += countTopics(t.children);
  }
  return count;
}

export default function LandingPage() {
  const { modules } = useAllModules();
  const { isAdmin, isEditor, isEnrolledPhysician } = useAuth();
  const isStaff = isAdmin || isEditor;
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isStaff;
  const [searchQuery, setSearchQuery] = useState('');
  const allTopics = useMemo(() => getAllSearchableTopics(), []);
  const { upcomingWorkshops, load: loadCourse } = useCourseStore();

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const enrollUrl = '/auth/registro';

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allTopics
      .filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [searchQuery, allTopics]);

  if (isAdmin && !studentMode) {
    return <TeacherLanding />;
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── 1. HERO SECTION ── */}
      <section className="border-b border-slate-200/70 px-4 pb-12 pt-[4.75rem] dark:border-slate-800/70 sm:px-6 sm:pb-20 sm:pt-28">
        <div className="mx-auto min-w-0 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 flex justify-center lg:mb-7 lg:justify-start"
          >
            <ComefyrBadge />
          </motion.div>

          <div className="grid min-w-0 items-start gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="min-w-0 lg:col-span-5">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="mb-3 max-w-full text-balance text-[11px] font-semibold uppercase leading-snug tracking-[0.06em] text-cyan-700 dark:text-cyan-300 sm:mb-4 sm:text-xs sm:tracking-[0.14em]"
              >
                Formación electrofisiológica de posgrado
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="mb-4 max-w-full text-balance break-words text-[1.65rem] font-extrabold leading-[1.16] tracking-tight text-slate-900 dark:text-white sm:mb-5 sm:text-5xl sm:leading-[1.08] lg:text-[3.15rem] lg:leading-[1.06]"
              >
                Domina el electrodiagnóstico y la neuroconducción con
                <span className="mt-1 block text-cyan-700 dark:text-cyan-300">casos clínicos reales</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 }}
                className="mb-6 max-w-full text-pretty text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 sm:mb-8 sm:text-lg"
              >
                {BRAND.enableAccreditation
                  ? 'Programa interactivo avalado por COMEFYR para médicos especialistas en rehabilitación y residentes en formación neurofisiológica.'
                  : 'Programa interactivo de posgrado para médicos especialistas en rehabilitación y residentes en formación neurofisiológica.'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-5 flex min-w-0 flex-col gap-2.5 sm:mb-8 sm:flex-row sm:gap-3"
              >
                {isEnrolledPhysician ? (
                  <Link
                    to="/mi-progreso"
                    className="inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold leading-snug text-white transition-colors hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 sm:w-auto sm:px-6"
                  >
                    <BarChart3 className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 text-balance">Ver mi progreso y clases</span>
                  </Link>
                ) : isSupabaseConfigured ? (
                  <Link
                    to={enrollUrl}
                    className="inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold leading-snug text-white transition-colors hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 sm:w-auto sm:px-6"
                  >
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 text-balance">
                      {BRAND.enableAccreditation
                        ? 'Registro con créditos COMEFYR'
                        : 'Registro de posgrado'}
                    </span>
                  </Link>
                ) : null}

                <a
                  href="#programa"
                  className="inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold leading-snug text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 sm:w-auto sm:px-6"
                >
                  <span className="min-w-0 text-balance">Ver programa y 13 módulos</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                </a>
              </motion.div>

              <motion.dl
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-4"
              >
                {[
                  { term: '13 módulos', desc: 'Ruta por bloques clínicos' },
                  { term: '470+ trazos', desc: 'Práctica interactiva' },
                  { term: 'Feedback guiado', desc: 'Corrección paso a paso' },
                  { term: 'Modo offline', desc: 'Consulta sin cobertura' },
                ].map((item) => (
                  <div
                    key={item.term}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-3.5"
                  >
                    <dt className="text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-sm">{item.term}</dt>
                    <dd className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:text-xs">{item.desc}</dd>
                  </div>
                ))}
              </motion.dl>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="min-w-0 lg:col-span-7"
            >
              <ClinicalTraceSimulator />
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold tracking-wide text-slate-700 dark:text-slate-200">EMG · NCV</span>{' '}
                Demostración interactiva orientada a correlación neuroanatómica y toma de decisiones clínicas.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. CLINICAL VALUE BLOCKS ── */}
      <MedicalValueGrid />

      {/* ── 3. CURRICULUM & MODULE EXPLORER WITH INTEGRATED CONTEXTUAL SEARCH ── */}
      <section id="programa" className="px-4 py-16 sm:py-24 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
              <Layers className="h-3.5 w-3.5" />
              <span>Currículo académico completo</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
              Plan de Estudios en 13 Módulos Clínicos
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Desde las bases biofísicas de membrana y anatomía funcional del SNP hasta técnicas avanzadas de estimulación repetitiva, plexopatías y ultrasonido neuromuscular.
            </p>
          </div>

          {/* Contextual Course Search Input (Replacing orphan search) */}
          <div className="max-w-2xl mx-auto relative mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar patologías, nervios o temas (ej. túnel carpiano, onda F, PESS, miastenia...)"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-sm transition placeholder:text-slate-400"
              />
            </div>

            {/* Live Search Results Overlay */}
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-30 top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-80 overflow-y-auto"
              >
                {searchResults.map((r, i) => (
                  <Link
                    key={i}
                    to={isEnrolledPhysician ? `/modulo/${r.moduleId}/${r.topicPath.join('/')}` : `/temario#modulo-${r.moduleId}`}
                    onClick={() => setSearchQuery('')}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-b-0"
                  >
                    <span className="text-[11px] font-mono text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md shrink-0">
                      {r.moduleTitle.substring(0, 22)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{r.title}</div>
                      {r.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{r.description}</p>}
                    </div>
                  </Link>
                ))}
              </motion.div>
            )}
          </div>

          {/* Modules Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {modules.map((mod) => {
              const IconComponent = iconMap[mod.icon] || BookOpen;
              const topicCount = countTopics(mod.topics);

              return (
                <motion.div key={mod.id} variants={cardVariants}>
                  <Link
                    to={isEnrolledPhysician ? `/modulo/${mod.id}` : `/temario#modulo-${mod.id}`}
                    className="group flex flex-col justify-between h-full rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:border-slate-400 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-slate-600"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-cyan-300 transition-transform group-hover:scale-105 dark:border-slate-700 dark:bg-slate-800">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                            MOD {String(mod.number).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors leading-snug">
                        {mod.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {mod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-medium text-slate-500 dark:text-slate-400 font-mono">
                        {topicCount} temas
                      </span>

                      {isEnrolledPhysician ? (
                        <span className="text-blue-600 dark:text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Entrar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{BRAND.enableAccreditation ? 'Aval COMEFYR' : 'Posgrado'}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── 4. LIVE CLINICAL WORKSHOPS (If any scheduled) ── */}
      {upcomingWorkshops.length > 0 && (
        <section className="px-4 py-16 sm:py-20 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold mb-3 border border-red-500/20">
                <Video className="w-3.5 h-3.5" />
                <span>Talleres Clínicos en Vivo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Discusión de Casos en Tiempo Real
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {BRAND.enableAccreditation
                  ? 'Sesiones interactivas con profesores invitados y electrofisiólogos miembros de COMEFYR'
                  : 'Sesiones interactivas con profesores invitados y electrofisiólogos especialistas'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {upcomingWorkshops.map((ws) => (
                <WorkshopCard key={ws.id} workshop={ws} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. PLAN COMPARISON & REGISTRATION MODALITY ── */}
      <section id="suscripcion" className="px-4 py-16 sm:py-24 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/20">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Inscripción Médica Certificada</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Acceso Completo con Acreditación Académica
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Inscripción exclusiva para médicos en rehabilitación, residentes de la especialidad y profesionales afines al electrodiagnóstico clínico.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
            {/* Benefits 2x3 Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {SUBSCRIPTION_BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center mb-2.5">
                    <b.icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{b.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* High-Authority Registration Card */}
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900 p-6 text-white shadow-2xl shadow-slate-900/30 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Suscripción Académica
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-700">
                  {BRAND.enableAccreditation ? 'Aval COMEFYR' : 'Acreditación Posgrado'}
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-2">Programa Integral de Electrodiagnóstico</h3>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Inscripción formal con validación de cédula profesional ante la Dirección General de Profesiones. Entrega de constancia oficial con valor curricular.
              </p>

              <ul className="space-y-3 mb-8 text-xs text-slate-200">
                {[
                  'Acceso irrestricto a los 13 módulos y 200+ lecciones',
                  'Simulador de casos de aguja y neuroconducción en vivo',
                  'Exámenes por tema con retroalimentación paso a paso',
                  'Descarga de material y funcionamiento offline en quirófano',
                  BRAND.enableAccreditation
                    ? 'Créditos académicos oficiales avalados por COMEFYR'
                    : 'Créditos y horas curriculares oficiales de posgrado',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {isEnrolledPhysician ? (
                <Link
                  to="/mi-progreso"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Ya estás inscrito · Ir a mi portal</span>
                </Link>
              ) : isSupabaseConfigured ? (
                <Link
                  to={enrollUrl}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-colors"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Comenzar registro de estudiante</span>
                </Link>
              ) : null}

              <div className="text-center mt-4">
                <Link to="/temario" className="text-xs text-cyan-300 hover:underline">
                  ¿Deseas consultar el desglose completo del temario antes? Haz clic aquí.
                </Link>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 overflow-hidden shadow-xs">
            <div className="grid grid-cols-3 text-xs sm:text-sm font-semibold border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="p-3.5 sm:p-4 text-slate-700 dark:text-slate-300">Funcionalidad</div>
              <div className="p-3.5 sm:p-4 text-center text-slate-600 dark:text-slate-400">Visitante</div>
              <div className="p-3.5 sm:p-4 text-center text-blue-600 dark:text-cyan-400 bg-blue-50/50 dark:bg-blue-950/30 font-bold">
                {BRAND.enableAccreditation ? 'Alumno Certificado (COMEFYR)' : 'Alumno del Diplomado'}
              </div>
            </div>
            {FREE_VS_PREMIUM.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 text-xs sm:text-sm ${
                  i < FREE_VS_PREMIUM.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/60' : ''
                }`}
              >
                <div className="p-3 sm:p-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{row.feature}</div>
                <div className="p-3 sm:p-3.5 flex justify-center items-center">
                  {row.visitor ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </div>
                <div className="p-3 sm:p-3.5 flex justify-center items-center bg-blue-50/30 dark:bg-blue-950/20">
                  {row.student === 'premium' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Acceso premium
                    </span>
                  ) : row.student ? (
                    <Check className="w-4 h-4 text-blue-600 dark:text-cyan-400 font-bold" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FINAL ENROLLMENT BANNER ── */}
      {!isEnrolledPhysician && isSupabaseConfigured && (
        <section className="px-4 pb-20">
          <div className="max-w-5xl mx-auto rounded-3xl border border-cyan-500/20 bg-slate-900 text-white p-8 sm:p-12 shadow-2xl shadow-slate-900/30 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-cyan-300" />
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 tracking-tight">
              Acredita tu competencia en electrodiagnóstico
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
              Únete a la plataforma interactiva más rigurosa para médicos especialistas en rehabilitación y residentes en formación.
            </p>
            <Link
              to={enrollUrl}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-all shadow-lg shadow-cyan-500/20 text-sm"
            >
              <span>
                {BRAND.enableAccreditation
                  ? 'Registrarme como alumno (Aval COMEFYR)'
                  : 'Registrarme como alumno del Diplomado'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── 7. INSTITUTIONAL FOOTER ── */}
      <footer className="px-4 py-10 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50">
        <div className="max-w-6xl mx-auto flex flex-col gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BrandLogo variant="compact" size="xs" showAccreditation={false} />
              <span className="hidden sm:inline">·</span>
              <span>{BRAND.tagline}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span>
                {BRAND.enableAccreditation
                  ? `Aval Oficial: ${BRAND.accreditationFull}`
                  : BRAND.academicTitle}
              </span>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2" aria-label="Enlaces institucionales">
            <Link to="/temario" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">Temario</Link>
            <Link to="/cursos" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">Cursos</Link>
            <Link to="/especialistas" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">Especialistas</Link>
            <Link to="/comite-editorial" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">Comité editorial</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
