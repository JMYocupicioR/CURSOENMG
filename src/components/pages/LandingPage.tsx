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
  Users,
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
import { MedicalBentoGrid } from '../landing/MedicalBentoGrid';
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
  const { isAdmin, isEnrolledPhysician } = useAuth();
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isAdmin;
  const [searchQuery, setSearchQuery] = useState('');
  const allTopics = useMemo(() => getAllSearchableTopics(), []);
  const { upcomingWorkshops, load: loadCourse } = useCourseStore();

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const enrollUrl = '/auth/registro';

  const totalTopics = useMemo(
    () => modules.reduce((acc, m) => acc + countTopics(m.topics), 0),
    [modules]
  );

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
    <main className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      {/* ── 1. HERO SECTION ── */}
      <section className="relative overflow-hidden px-4 pt-24 pb-14 sm:pt-32 sm:pb-20">
        {/* Subtle Ambient Depth (No harsh saturated blues) */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-[400px] h-[300px] bg-cyan-500/5 dark:bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto text-center">
          {/* Official COMEFYR Institutional Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex justify-center"
          >
            <ComefyrBadge />
          </motion.div>

          {/* Clinically Persuasive H1 Value Proposition */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto mb-6 leading-[1.15]"
          >
            Domina el electrodiagnóstico y la neuroconducción con{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 dark:from-blue-400 dark:via-cyan-300 dark:to-indigo-300 bg-clip-text text-transparent">
              casos clínicos reales
            </span>
          </motion.h1>

          {/* Subtitle with Institutional Weight (Natural copywriting, no AI bold words) */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed font-normal"
          >
            {BRAND.enableAccreditation
              ? 'El programa interactivo avalado por la COMEFYR para médicos especialistas en rehabilitación y residentes en formación neurofisiológica.'
              : 'El programa interactivo de posgrado para médicos especialistas en rehabilitación y residentes en formación neurofisiológica.'}
          </motion.p>

          {/* Primary & Secondary Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12"
          >
            {isEnrolledPhysician ? (
              <Link
                to="/mi-progreso"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Ver mi progreso y clases</span>
              </Link>
            ) : isSupabaseConfigured ? (
              <Link
                to={enrollUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all"
              >
                <GraduationCap className="w-5 h-5" />
                <span>
                  {BRAND.enableAccreditation
                    ? 'Registro de Estudiante (Créditos COMEFYR)'
                    : 'Registro de Estudiante de Posgrado'}
                </span>
              </Link>
            ) : null}

            <a
              href="#programa"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500 transition-all shadow-xs"
            >
              <span>Explorar programa y 13 módulos</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </motion.div>

          {/* High-Impact Real Clinical Metrics (Replacing filler stats) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-12 sm:mb-16"
          >
            {[
              {
                value: '13 Módulos',
                label: 'Certificados',
                sub: 'ENMG, aguja y ultrasonido',
              },
              {
                value: '470+ Trazos',
                label: 'Casos Interactivos',
                sub: 'Bioelectricidad real',
              },
              {
                value: 'Valor Curricular',
                label: BRAND.enableAccreditation ? 'Aval Oficial COMEFYR' : 'Acreditación Oficial',
                sub: BRAND.enableAccreditation ? 'Créditos recertificación' : 'Horas de posgrado',
              },
              {
                value: 'Paso a Paso',
                label: 'Feedback Diagnóstico',
                sub: 'Correlación anatómica',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs text-left"
              >
                <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs font-semibold text-blue-600 dark:text-cyan-400 mt-0.5">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                  {stat.sub}
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── SHOW, DON'T TELL INTERACTIVE MICRO-DEMO (Before the Scroll) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <ClinicalTraceSimulator />
          </motion.div>
        </div>
      </section>

      {/* ── 2. MODULAR BENTO GRID (MedTech & EdTech Modern Standards) ── */}
      <MedicalBentoGrid />

      {/* ── 3. CURRICULUM & MODULE EXPLORER WITH INTEGRATED CONTEXTUAL SEARCH ── */}
      <section id="programa" className="px-4 py-16 sm:py-24 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3 border border-blue-500/20">
              <Layers className="w-3.5 h-3.5" />
              <span>Currículo Académico Completo</span>
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
                    className="group flex flex-col justify-between h-full p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-600 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} text-white shadow-md group-hover:scale-105 transition-transform`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                            MOD {String(mod.number).padStart(2, '0')}
                          </span>
                          <span className="text-xl">{mod.emoji}</span>
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
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border border-indigo-500/30 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Suscripción Académica
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:opacity-95 font-bold text-sm text-white shadow-lg shadow-blue-500/25 transition-all"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Comenzar registro de estudiante</span>
                </Link>
              ) : null}

              <div className="text-center mt-4">
                <Link to="/temario" className="text-xs text-cyan-300 hover:underline">
                  ¿Deseas consultar el desglose completo del temario antes? Haz clic aquí →
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
                      👑 Premium
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
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-700 text-white p-8 sm:p-12 shadow-2xl shadow-blue-500/20 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 tracking-tight">
              Acredita tu competencia en electrodiagnóstico
            </h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto mb-8 leading-relaxed">
              Únete a la plataforma interactiva más rigurosa para médicos especialistas en rehabilitación y residentes en formación.
            </p>
            <Link
              to={enrollUrl}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-bold hover:bg-blue-50 transition-all shadow-lg text-sm"
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
