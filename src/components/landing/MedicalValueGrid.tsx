import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Award,
  Brain,
  Check,
  CheckCircle2,
  ShieldCheck,
  Stethoscope,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CORE_PILLARS = [
  {
    icon: Zap,
    title: 'Simulación electrofisiológica guiada',
    description:
      'Trazos de aguja y neuroconducción con parámetros calibrados para correlación clínica real.',
  },
  {
    icon: Brain,
    title: 'Razonamiento diagnóstico estructurado',
    description:
      'Evaluaciones clínicas por tema con retroalimentación argumentada y errores explicados por mecanismo.',
  },
  {
    icon: Stethoscope,
    title: 'Integración topográfica neuroanatómica',
    description:
      'Lectura del trazo en contexto de dermatomas, miotomas y localización de lesión periférica.',
  },
];

const LEARNING_FLOW = [
  {
    step: '01',
    title: 'Observa',
    text: 'Compara trazado fisiológico y patológico con las mismas condiciones de registro.',
  },
  {
    step: '02',
    title: 'Interpreta',
    text: 'Relaciona latencia, amplitud y velocidad con hipótesis topográfica concreta.',
  },
  {
    step: '03',
    title: 'Decide',
    text: 'Recibe retroalimentación diagnóstica paso a paso y aplica corrección inmediata.',
  },
];

export function MedicalValueGrid() {
  return (
    <section className="border-y border-slate-200/70 bg-white px-4 py-16 dark:border-slate-800/70 dark:bg-slate-950/35 sm:py-24">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="grid min-w-0 items-start gap-9 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-5">
            <p className="mb-3 max-w-full text-balance text-[11px] font-semibold uppercase leading-snug tracking-[0.06em] text-cyan-700 dark:text-cyan-300 sm:text-xs sm:tracking-[0.14em]">
              Arquitectura docente especializada
            </p>
            <h2 className="mb-4 max-w-full text-balance text-[1.65rem] font-bold leading-[1.16] tracking-tight text-slate-900 dark:text-white sm:text-4xl sm:leading-tight">
              Entrenamiento clínico diseñado para decidir con criterio, no por memoria
            </h2>
            <p className="mb-7 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              El núcleo de ElectroDx no es una colección de tarjetas. Es una secuencia de aprendizaje que une trazo,
              fisiopatología y decisión terapéutica en una sola ruta de estudio.
            </p>

            <div className="space-y-3.5">
              {CORE_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/75"
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                      <pillar.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pillar.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{pillar.description}</p>
                </div>
              ))}
            </div>

            <Link
              to="/ejercicios"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              <span>Abrir entorno de práctica clínica</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/85 lg:col-span-7"
          >
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Panel de evidencia clínica
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Lectura de trazos con telemetría objetiva
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 font-mono text-[11px] text-cyan-700 dark:border-cyan-800/70 dark:bg-cyan-950/40 dark:text-cyan-300">
                  470+ registros interactivos
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr] sm:p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>N. Mediano Motor</span>
                  <span>2 mV/div · 2 ms/div</span>
                </div>
                <div className="relative h-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <svg className="relative z-10 h-full w-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <path
                      d="M 0 60 L 35 60 L 38 42 L 41 72 L 45 60 L 110 60 Q 130 58 152 18 Q 168 5 190 65 Q 204 93 228 78 Q 250 64 280 60 L 500 60"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <dt className="text-slate-500 dark:text-slate-400">Latencia</dt>
                    <dd className="font-semibold text-slate-900 dark:text-slate-100">3.4 ms</dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <dt className="text-slate-500 dark:text-slate-400">Amplitud</dt>
                    <dd className="font-semibold text-slate-900 dark:text-slate-100">9.2 mV</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Flujo docente estructurado</h3>
                <ol className="space-y-3">
                  {LEARNING_FLOW.map((step) => (
                    <li key={step.step} className="flex gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-mono text-cyan-300 dark:bg-slate-800">
                        {step.step}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{step.title}</p>
                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                <Award className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Acreditación académica oficial</h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Programa respaldado por COMEFYR con constancia oficial para médicos especialistas y residentes.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              {[
                'Validación de perfil profesional para ingreso',
                'Créditos académicos para recertificación',
                'Constancia verificable con respaldo institucional',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                <Stethoscope className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Calculadora de plexo braquial</h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Herramienta topográfica para integrar fuerza MRC, sensibilidad y reflejos en localización de lesión.
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-950/40">Superior</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-950/40">Medio</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-950/40">Inferior</span>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
              <Link
                to="/herramientas/plexo-braquial"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
              >
                Acceder a calculadora
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                <WifiOff className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Modo hospitalario offline</h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Consulta módulos y valores de referencia aun en áreas con blindaje o conectividad limitada.
            </p>
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>PWA instalable en iOS, Android y escritorio con contenido local protegido.</span>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3 text-[11px] font-mono text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
              Disponibilidad clínica continua
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/65">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Verificación docente permanente
            </h3>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Cada bloque se conecta con el siguiente para evitar estudio fragmentado.
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: 'Evaluación por competencia',
                text: 'No solo final de módulo. Hay control de comprensión por bloque temático.',
              },
              {
                title: 'Retroalimentación concreta',
                text: 'Cada error se explica por fisiopatología, no por respuestas genéricas.',
              },
              {
                title: 'Progresión verificable',
                text: 'El seguimiento curricular prioriza consolidación antes de avanzar de nivel.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/75">
                <div className="mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
