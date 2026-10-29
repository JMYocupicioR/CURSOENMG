import { Link } from 'react-router-dom';
import {
  Brain,
  Stethoscope,
  ClipboardList,
  Activity,
  ArrowRight,
  BookOpen,
  Video,
} from 'lucide-react';
import { portalCopy } from '../../i18n/portal';
import { useSettingsStore } from '../../stores/settingsStore';

export default function SimulatorsHubPage() {
  const lang = useSettingsStore((s) => s.language);
  const copy = lang === 'en' ? portalCopy.en : portalCopy.es;

  const items = [
    {
      to: '/examenes',
      title: lang === 'en' ? 'Board-style exam' : 'Simulador de Examen COMEFYR',
      desc:
        lang === 'en'
          ? 'Timed simulator with gap analysis and tutor mode.'
          : 'Exámenes cronometrados, modo tutor y análisis de brechas por módulo.',
      badge: 'Evaluación',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
      icon: ClipboardList,
    },
    {
      to: '/ejercicios',
      title: lang === 'en' ? 'EMG clinical cases' : 'Casos Clínicos EMG',
      desc:
        lang === 'en'
          ? 'Guided cases with findings and differential diagnosis.'
          : 'Entrenamiento práctico con trazos, tabla de conducción y diagnóstico diferencial.',
      badge: 'Práctica Clínica',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
      icon: Stethoscope,
    },
    {
      to: '/simuladores/trazos',
      title: lang === 'en' ? 'Clinical traces' : 'Simulador de Trazos EMG',
      desc:
        lang === 'en'
          ? 'Compare normal vs pathologic CMAP/SNAP morphology.'
          : 'Compara morfología normal vs patológica de CMAP, SNAP y aguja en tiempo real.',
      badge: 'Laboratorio',
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
      icon: Activity,
    },
    {
      to: '/herramientas/plexo-braquial',
      title: lang === 'en' ? 'Brachial plexus mapper' : 'Calculadora de Plexo Braquial',
      desc:
        lang === 'en'
          ? 'Localize plexus lesions with a structured algorithm.'
          : 'Algoritmo topográfico de 5 pasos para localización de lesiones de plexo.',
      badge: 'Herramienta',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
      icon: Brain,
    },
  ];

  return (
    <main id="contenido-principal" className="max-w-5xl mx-auto px-4 pt-18 sm:pt-24 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {lang === 'en' ? copy.simulators : 'Centro de Práctica y Evaluación'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'en'
              ? 'All clinical cases, board exams, and simulators in one place.'
              : 'Exámenes tipo consejo, casos clínicos interactivos y simuladores neurofisiológicos.'}
          </p>
        </div>

        {/* Accesos cruzados rápidos a Estudio (Temario y Clases en Vivo) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            to="/temario"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-400 transition shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Temario</span>
          </Link>
          <Link
            to="/talleres"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-violet-400 transition shrink-0"
          >
            <Video className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Clases en Vivo</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="min-h-[48px] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className={`p-2.5 rounded-xl ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
                {item.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                {item.desc}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400">
              {copy.continue} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
