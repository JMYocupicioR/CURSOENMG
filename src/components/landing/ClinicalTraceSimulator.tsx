import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, Sliders, Zap, Stethoscope, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TraceData {
  id: string;
  title: string;
  nerve: string;
  technique: string;
  normal: {
    label: string;
    latency: string;
    amplitude: string;
    velocity: string;
    duration: string;
    path: string; // SVG path definition
    markers: { onset: number; peak: { x: number; y: number } };
    summary: string;
    status: 'normal';
    statusText: string;
  };
  pathologic: {
    label: string;
    latency: string;
    amplitude: string;
    velocity: string;
    duration: string;
    path: string;
    markers: { onset: number; peak: { x: number; y: number } };
    summary: string;
    status: 'abnormal';
    statusText: string;
  };
  sensitivity: string;
  sweepSpeed: string;
}

const CLINICAL_CASES: TraceData[] = [
  {
    id: 'median-motor',
    title: 'Nervio Mediano Motor',
    nerve: 'N. Mediano (C8-T1)',
    technique: 'Registro en Abductor Pollicis Brevis (APB) · Estimulación en Muñeca (8 cm)',
    sensitivity: '2 mV / div',
    sweepSpeed: '2 ms / div',
    normal: {
      label: 'Trazado Normal',
      latency: '3.4 ms',
      amplitude: '9.2 mV',
      velocity: '56.8 m/s',
      duration: '5.2 ms',
      // Clean CMAP: stimulus at x=30, onset at x=100 (3.4ms), sharp negative peak at (150, 45), positive rebound at (210, 165), return to baseline (280, 120)
      path: 'M 10 120 L 28 120 L 30 100 L 32 140 L 34 120 L 98 120 Q 115 118 130 90 Q 150 42 165 42 Q 185 45 205 155 Q 220 172 245 160 Q 270 140 295 120 L 580 120',
      markers: { onset: 98, peak: { x: 165, y: 42 } },
      summary: 'Latencia distal conservada (<4.0 ms) y CMAP de configuración monofásica aguda sin bloqueo ni dispersión temporal.',
      status: 'normal',
      statusText: 'Dentro de límites fisiológicos',
    },
    pathologic: {
      label: 'Síndrome del Túnel Carpiano Severo',
      latency: '5.9 ms',
      amplitude: '3.8 mV',
      velocity: '38.4 m/s',
      duration: '8.4 ms',
      // Dispersed, prolonged CMAP: stimulus at x=30, delayed onset at x=175 (5.9ms), blunt peak at (240, 80), dispersed multiphasic rebound (330, 145), baseline (410, 120)
      path: 'M 10 120 L 28 120 L 30 100 L 32 140 L 34 120 L 175 120 Q 195 118 215 98 Q 235 80 250 82 Q 275 85 295 110 Q 315 130 330 145 Q 355 155 380 138 Q 405 125 430 120 L 580 120',
      markers: { onset: 175, peak: { x: 250, y: 82 } },
      summary: 'Prolongación severa de la latencia distal motora (>4.5 ms) con dispersión temporal y caída de amplitud por desmielinización focal en ligamento anular.',
      status: 'abnormal',
      statusText: 'Atrapamiento focal (Criterios AANEM / COMEFYR)',
    },
  },
  {
    id: 'needle-emg',
    title: 'EMG de Aguja (Músculo APB)',
    nerve: 'Músculo Abductor Pollicis Brevis',
    technique: 'Electrodo concéntrico · Registro en Reposo e Inserción',
    sensitivity: '50 µV / div',
    sweepSpeed: '10 ms / div',
    normal: {
      label: 'Reposo Normal',
      latency: '—',
      amplitude: '0 µV (Silencio)',
      velocity: '—',
      duration: 'Silencio basal',
      // Baseline electrical silence with only minor noise
      path: 'M 10 120 Q 50 121 100 120 Q 160 119 220 120 Q 280 121 350 120 Q 420 119 490 120 L 580 120',
      markers: { onset: 0, peak: { x: 0, y: 0 } },
      summary: 'Silencio eléctrico completo tras el cese de la actividad de inserción. Membrana muscular estable sin descargas espontáneas.',
      status: 'normal',
      statusText: 'Actividad de reposo fisiológica (0 descargas)',
    },
    pathologic: {
      label: 'Denervación Aguda (Fibrilaciones +3 / PSW)',
      latency: 'Espontánea',
      amplitude: '85 µV',
      velocity: '12-25 Hz',
      duration: '1.8 ms',
      // Spontaneous rhythmic fibrillations (sharp dip-rise-dip) and positive sharp waves (PSW: rapid positive dive then slow negative decay)
      path: 'M 10 120 L 60 120 Q 65 145 68 152 Q 72 152 75 90 Q 78 82 82 120 L 170 120 Q 174 165 178 172 Q 185 140 210 125 Q 235 120 270 120 Q 275 142 278 150 Q 282 150 285 88 Q 288 80 292 120 L 380 120 Q 385 168 390 174 Q 400 138 425 125 Q 450 120 480 120 Q 484 144 487 150 Q 490 150 493 88 Q 496 82 500 120 L 580 120',
      markers: { onset: 60, peak: { x: 75, y: 82 } },
      summary: 'Descargas espontáneas profusas de fibrilaciones rítmicas y ondas agudas positivas (PSW). Denervación activa con hiperexcitabilidad de fibra muscular desnuda.',
      status: 'abnormal',
      statusText: 'Signos de denervación activa aguda (Grado 3+)',
    },
  },
  {
    id: 'sural-sensory',
    title: 'Nervio Sural Sensitivo',
    nerve: 'N. Sural (S1-S2)',
    technique: 'Registro Antidrómico en Maléolo Externo · Estimulación en Pantorrilla (14 cm)',
    sensitivity: '10 µV / div',
    sweepSpeed: '1 ms / div',
    normal: {
      label: 'SNAP Sensitivo Normal',
      latency: '3.1 ms',
      amplitude: '19.4 µV',
      velocity: '49.2 m/s',
      duration: '1.4 ms',
      // Biphasic/Triphasic sharp sensory nerve action potential
      path: 'M 10 120 L 28 120 L 30 110 L 32 130 L 34 120 L 140 120 Q 155 120 162 135 Q 168 145 176 80 Q 184 62 192 148 Q 198 158 206 120 L 580 120',
      markers: { onset: 140, peak: { x: 184, y: 62 } },
      summary: 'Potencial sensitivo bifásico bien estructurado con amplitud superior a 10 µV y velocidad de conducción conservada.',
      status: 'normal',
      statusText: 'Integridad axonal sensitiva distal normal',
    },
    pathologic: {
      label: 'Polineuropatía Axonal Sensitiva',
      latency: '3.3 ms',
      amplitude: '2.2 µV (Colapso)',
      velocity: '44.8 m/s',
      duration: '2.1 ms',
      // Severely attenuated SNAP
      path: 'M 10 120 L 28 120 L 30 110 L 32 130 L 34 120 L 148 120 Q 160 120 168 126 Q 175 130 182 108 Q 188 104 195 128 Q 200 132 208 120 L 580 120',
      markers: { onset: 148, peak: { x: 188, y: 104 } },
      summary: 'Marcada reducción de amplitud (<4.0 µV) con velocidad de conducción relativamente preservada, indicativo de pérdida de fibras axonales de gran calibre.',
      status: 'abnormal',
      statusText: 'Patrón axónico degenerativo (Axonopatía sensitiva)',
    },
  },
];

export function ClinicalTraceSimulator() {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [isPathologic, setIsPathologic] = useState(false);

  const currentCase = CLINICAL_CASES[activeCaseIndex];
  const activeTrace = isPathologic ? currentCase.pathologic : currentCase.normal;

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 text-slate-100 shadow-[0_20px_55px_rgba(2,6,23,0.52)] sm:rounded-[28px]">
      <div className="border-b border-slate-800 bg-slate-900/90 px-3.5 py-3 sm:px-6 sm:py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-300 sm:tracking-[0.14em]">
                Demo clínica interactiva
              </p>
              <p className="hidden text-xs text-slate-400 md:block">
                Visualizador electrofisiológico calibrado
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-300">
            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
              {currentCase.sensitivity}
            </span>
            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
              {currentCase.sweepSpeed}
            </span>
            <span className="hidden rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400 lg:inline-flex">
              Filtro 20 Hz a 2 kHz
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-800/80 bg-slate-900/70 px-3.5 pb-2 pt-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-400">
            <Stethoscope className="h-3.5 w-3.5 text-cyan-400" />
            Caso:
          </span>
          {CLINICAL_CASES.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCaseIndex(idx);
                setIsPathologic(false);
              }}
              aria-pressed={activeCaseIndex === idx}
              className={`max-w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium leading-snug transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                activeCaseIndex === idx
                  ? 'bg-cyan-500/90 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-12">
        <div className="relative flex min-w-0 flex-col justify-between border-b border-slate-800 bg-slate-950 p-3.5 sm:p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-mono text-cyan-300">{currentCase.nerve}</p>
              <p className="line-clamp-1 text-xs text-slate-400">{currentCase.technique}</p>
            </div>

            <div className="inline-flex shrink-0 self-start rounded-xl border border-slate-700/80 bg-slate-900 p-1 sm:self-auto">
              <button
                onClick={() => setIsPathologic(false)}
                aria-pressed={!isPathologic}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  !isPathologic ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Normal
              </button>
              <button
                onClick={() => setIsPathologic(true)}
                aria-pressed={isPathologic}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  isPathologic ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Patológico
              </button>
            </div>
          </div>

          <div className="relative flex h-44 w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950 shadow-inner sm:h-64">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #334155 1px, transparent 1px),
                  linear-gradient(to bottom, #334155 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
              }}
            />

            <div className="absolute left-0 right-0 top-1/2 h-[1px] border-t border-dashed border-slate-700/70" />

            {currentCase.id !== 'needle-emg' && (
              <div className="absolute left-7 top-3 flex items-center gap-1 rounded border border-cyan-800/70 bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                <Zap className="h-2.5 w-2.5" />
                Estímulo 0 ms
              </div>
            )}

            <svg
              viewBox="0 0 600 240"
              className="relative z-10 h-full w-full"
              preserveAspectRatio="none"
            >
              <AnimatePresence mode="wait">
                <motion.path
                  key={`${currentCase.id}-${isPathologic ? 'path' : 'norm'}`}
                  initial={{ pathLength: 0, opacity: 0.35 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  d={activeTrace.path}
                  fill="none"
                  stroke={isPathologic ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </AnimatePresence>

              {activeTrace.markers.peak.x > 0 && (
                <g>
                  <circle
                    cx={activeTrace.markers.peak.x}
                    cy={activeTrace.markers.peak.y}
                    r="4.5"
                    fill={isPathologic ? '#f59e0b' : '#38bdf8'}
                  />
                  <line
                    x1={activeTrace.markers.peak.x}
                    y1={activeTrace.markers.peak.y}
                    x2={activeTrace.markers.peak.x}
                    y2="120"
                    stroke={isPathologic ? '#f59e0b' : '#38bdf8'}
                    strokeDasharray="2,2"
                    strokeWidth="1.2"
                    opacity="0.6"
                  />
                </g>
              )}
            </svg>

            <div className="absolute bottom-2.5 right-3 rounded border border-slate-700/70 bg-slate-900/95 px-2 py-0.5 text-[10px] font-mono text-slate-300">
              {activeTrace.label}
            </div>
          </div>

          <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="flex min-w-0 items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span className="min-w-0">Trazo calibrado para correlación clínica</span>
            </span>
            <span className="font-mono text-slate-500">ElectroDx Engine v2</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between bg-slate-900/95 p-3.5 sm:p-6 lg:col-span-5">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                Telemetría clínica
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  isPathologic
                    ? 'border-amber-800/80 bg-amber-950/70 text-amber-300'
                    : 'border-emerald-800/80 bg-emerald-950/70 text-emerald-300'
                }`}
              >
                {isPathologic ? 'Patológico' : 'Fisiológico'}
              </span>
            </div>

            <div className="mb-5 grid min-w-0 grid-cols-2 gap-2 font-mono tabular-nums sm:gap-2.5">
              <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 sm:p-3">
                <div className="text-[10px] uppercase tracking-tight text-slate-400">Latencia distal</div>
                <div className={`mt-0.5 break-words text-base font-bold leading-tight sm:text-xl ${isPathologic ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {activeTrace.latency}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500">Norma: &lt; 4.0 ms</div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 sm:p-3">
                <div className="text-[10px] uppercase tracking-tight text-slate-400">Amplitud pico</div>
                <div className={`mt-0.5 break-words text-base font-bold leading-tight sm:text-xl ${isPathologic ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {activeTrace.amplitude}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500">Norma: &gt; 4.5 mV</div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 sm:p-3">
                <div className="text-[10px] uppercase tracking-tight text-slate-400">Velocidad (VCN)</div>
                <div className={`mt-0.5 break-words text-base font-bold leading-tight sm:text-xl ${isPathologic ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {activeTrace.velocity}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500">Norma: &gt; 50 m/s</div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 sm:p-3">
                <div className="text-[10px] uppercase tracking-tight text-slate-400">Duración CMAP</div>
                <div className={`mt-0.5 break-words text-base font-bold leading-tight sm:text-xl ${isPathologic ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {activeTrace.duration}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500">Dispersión: normal</div>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3.5">
              <div className="mb-1 flex items-start gap-1.5 text-xs font-semibold leading-snug text-slate-200">
                {isPathologic ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                )}
                <span>{activeTrace.statusText}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{activeTrace.summary}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 text-[11px] leading-snug text-slate-400">
              Más de 470 trazos diagnósticos interactivos con registro guiado.
            </span>
            <Link
              to="/ejercicios"
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
            >
              <span>Abrir simulador</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
