import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Award,
  CheckCircle2,
  WifiOff,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function MedicalBentoGrid() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(1);

  return (
    <section className="py-16 sm:py-24 px-4 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4 border border-blue-500/20">
            <Zap className="w-3.5 h-3.5" />
            <span>Infraestructura MedTech Especializada</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            Diseñado con rigor para la práctica de la neurorehabilitación
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Una plataforma modular construida desde cero con las necesidades reales del electrodiagnóstico clínico moderno: casos reales, simulación interactiva y aval académico.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {/* Card 1: Needle EMG & Waveform Simulator (Large 2 Cols on lg) */}
          <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600 dark:text-cyan-400">
                      Simulación en Vivo
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Simulador de Aguja y Trazos EMG
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Premium
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    470+ Trazos Reales
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mb-6 leading-relaxed">
                Entrena tu reconocimiento de potenciales de acción de unidad motora (MUAP), reclutamiento reducido, potenciales polifásicos y descargas espontáneas antes de tocar a un paciente real.
              </p>

              {/* Interactive Visual Element: Mini EMG Monitor Preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 shadow-inner mb-6">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 mb-3 border-b border-slate-800/80">
                  <span className="text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    BARRIDO CONTINUO: 10 ms/div
                  </span>
                  <span className="text-emerald-400 font-semibold">50 µV/div</span>
                  <span className="hidden sm:inline text-slate-500">CANAL 1: M. TIBIAL ANTERIOR</span>
                </div>

                {/* SVG Visual Trace Graphic */}
                <div className="h-28 sm:h-32 w-full relative overflow-hidden flex items-center">
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <svg className="w-full h-full relative z-10" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <path
                      d="M 0 60 L 40 60 Q 45 85 48 90 Q 52 90 55 30 Q 58 20 62 60 L 130 60 Q 135 105 140 110 Q 148 20 155 10 Q 162 100 170 60 L 250 60 Q 255 88 258 92 Q 262 92 265 30 Q 268 22 272 60 L 340 60 Q 345 105 350 110 Q 358 18 365 8 Q 372 100 380 60 L 440 60 Q 445 85 448 90 Q 452 90 455 30 Q 458 22 462 60 L 500 60"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.4"
                    />
                  </svg>
                </div>

                {/* EMG Telemetry row */}
                <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-slate-400">Patrón: <strong className="text-amber-400 font-semibold">Neuropático con Reclutamiento Reducido</strong></span>
                  <span className="text-slate-400">Amplitud MUAP: <strong className="text-cyan-300">4.8 mV (Polifásico gigante)</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Casos con correlación anatómica y patológica
              </span>
              <Link
                to="/ejercicios"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors"
              >
                <span>Probar simulador</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Interactive Quiz / Board Cases (1 Col) */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400">
                    Evaluaciones Tipo Consejo
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Feedback Diagnóstico Paso a Paso
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Preguntas basadas en viñetas clínicas con retroalimentación instantánea argumentada con guías de práctica clínica:
              </p>

              {/* Mini Clinical Question Interactive Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 mb-4">
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mb-2.5">
                  ¿Cuál es el hallazgo patognomónico de una lesión axonal aguda a los 21 días?
                </div>
                <div className="space-y-1.5">
                  {[
                    { id: 0, text: 'Dispersión temporal con latencia prolongada' },
                    { id: 1, text: 'Fibrilaciones y ondas agudas positivas (PSW)' },
                    { id: 2, text: 'Bloqueo de conducción motor reversible' },
                  ].map((ans) => (
                    <button
                      key={ans.id}
                      onClick={() => setSelectedAnswer(ans.id)}
                      className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center justify-between border ${
                        selectedAnswer === ans.id
                          ? ans.id === 1
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-medium'
                            : 'bg-red-50 text-red-900 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span>{ans.text}</span>
                      {selectedAnswer === ans.id && (
                        ans.id === 1 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1.5" />
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold shrink-0 ml-1.5">Incorrecto</span>
                        )
                      )}
                    </button>
                  ))}
                </div>

                {selectedAnswer === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 text-[11px] text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                  >
                    <strong className="font-semibold">Correcto:</strong> Tras degeneración walleriana completa (2 a 3 semanas), la fibra muscular desnuda genera potenciales espontáneos rítmicos.
                  </motion.div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Banco de más de 250 reactivos</span>
              <Link
                to="/examenes"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                Ver exámenes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: COMEFYR Official Accreditation (1 Col) */}
          <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-500/20 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-cyan-300 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 font-bold">
                  AVAL DOCENTE OFICIAL
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2 tracking-tight text-white">
                Certificación COMEFYR
              </h3>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Respaldado por el Colegio Mexicano de Medicina de Rehabilitación A.C. Entrega constancia oficial con valor curricular y créditos académicos para recertificación de médicos especialistas.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-200 mb-6">
                {[
                  'Créditos curriculares para médicos especialistas',
                  'Válido para residentes de medicina de rehabilitación',
                  'Verificación automática de cédula profesional',
                  'Diploma digital verificable con código QR institucional',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">COMEFYR A.C.</span>
              <span className="text-xs text-cyan-400 font-semibold">Créditos de Educación Médica Continua</span>
            </div>
          </div>

          {/* Card 4: Brachial Plexus Engine (1 Col) */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                      Algoritmo Topográfico
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Premium
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Calculadora de Plexo Braquial
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Localización matemática de lesiones complejas: correlaciona paresia según escala MRC, reflejos osteotendinosos y distribución sensitiva para identificar nivel de raíz (C5-T1), tronco o cordón.
              </p>

              {/* Visual Anatomical Pill Grid */}
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] mb-4">
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Tronco Superior</span>
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Tronco Medio</span>
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Tronco Inferior</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Ponderación diagnóstica</span>
              <Link
                to="/herramientas/plexo-braquial"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                Acceder a calculadora <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 5: Offline First Hospital Mode (1 Col) */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
                    Uso Hospitalario PWA
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Modo Offline
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Las salas de electromiografía y hospitales en general a menudo cuentan con blindaje o mala cobertura. Descarga módulos completos a la memoria de tu dispositivo para estudiar y consultar valores de referencia sin conexión.
              </p>

              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Check className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Módulos y valores de referencia pre-cacheados en almacenamiento local seguro.</span>
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">PWA Instalable en iOS / Android / PC</span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">100% Funcional</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
