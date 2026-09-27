import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { PremiumGate } from '../PremiumGate';
import { usePlexoBraquialAssessment } from './usePlexoBraquialAssessment';
import StepMuscles from './steps/StepMuscles';
import StepSymptoms from './steps/StepSymptoms';
import StepSensibility from './steps/StepSensibility';
import StepReflexes from './steps/StepReflexes';
import StepAdditional from './steps/StepAdditional';
import ResultsPanel from './ResultsPanel';

const STEPS = [
  { id: 1, label: 'Músculos', icon: '💪', desc: 'Escala MRC' },
  { id: 2, label: 'Síntomas', icon: '🩹', desc: 'Dolor y parestesias' },
  { id: 3, label: 'Sensibilidad', icon: '🖐️', desc: 'Dermatomas' },
  { id: 4, label: 'Reflejos', icon: '🔨', desc: 'Osteotendinosos' },
  { id: 5, label: 'Adicional', icon: '📋', desc: 'Contexto clínico' },
];

export default function PlexoCalculatorPage() {
  const { hasPremiumAccess, isAdmin, isEditor } = useAuth();
  const canAccess = hasPremiumAccess || isAdmin || isEditor;

  const {
    datosEvaluacion,
    currentStep,
    setCurrentStep,
    calculoRealizado,
    resultadosDiagnostico,
    hallazgosInervacionDual,
    updateFuerzaMuscular,
    updateSintomas,
    updateAreas,
    updateReflejo,
    updateInformacionAdicional,
    updateContextoClinico,
    updateTiempoEvolucion,
    updateFaseEvolutiva,
    updatePatronEvolucion,
    realizarCalculo,
    reiniciarCalculadora,
    canCalculate,
    cargarCasoClinico,
    casosDisponibles,
    isStepComplete,
  } = usePlexoBraquialAssessment();

  const [showCases, setShowCases] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [currentStep, showResult]);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-20 pb-20">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
            <Link to="/" className="hover:text-blue-500 transition-colors">🏠 Inicio</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-white font-medium">Calculadora Plexo Braquial</span>
          </nav>
          <PremiumGate
            requiresStrictPremium
            moduleId="plexo-braquial"
            title="Calculadora Diagnóstica de Plexo Braquial"
            description="Herramienta avanzada de aprendizaje clínico y localización topográfica de lesiones del plexo braquial (C5-T1, troncos y cordones). Acceso exclusivo para miembros con suscripción Premium activa."
          />
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepMuscles datos={datosEvaluacion} onUpdate={updateFuerzaMuscular} />;
      case 2: return <StepSymptoms datos={datosEvaluacion} onUpdate={updateSintomas} />;
      case 3: return <StepSensibility datos={datosEvaluacion} onUpdate={updateAreas} />;
      case 4: return <StepReflexes datos={datosEvaluacion} onUpdate={updateReflejo} />;
      case 5: return <StepAdditional datos={datosEvaluacion} updateInfo={updateInformacionAdicional} updateContexto={updateContextoClinico} updateFase={updateFaseEvolutiva} updatePatron={updatePatronEvolucion} updateTiempo={updateTiempoEvolucion} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link to="/" className="hover:text-blue-500 transition-colors">🏠 Inicio</Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-white font-medium">Calculadora Plexo Braquial</span>
        </nav>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-700/30 mb-4">
            <span className="text-sm">🧠</span>
            <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Módulo Interactivo</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Calculadora Diagnóstica
            </span>
            <br />
            <span className="text-slate-800 dark:text-white text-2xl md:text-3xl">Plexo Braquial</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Herramienta interactiva de aprendizaje para localizar el nivel anatómico de la lesión en plexopatía braquial. 
            Ingresa los hallazgos electrodiagnósticos y obtén un diagnóstico topográfico probabilístico.
          </p>
        </div>

        {/* Clinical Cases Toggle */}
        {!calculoRealizado && (
          <div className="mb-6">
            <button
              onClick={() => setShowCases(!showCases)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-400 transition-all w-full md:w-auto"
            >
              <span>📖</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">Casos Clínicos de Demostración</span>
              <span className={`transition-transform ${showCases ? 'rotate-180' : ''}`}>▾</span>
            </button>

            <AnimatePresence>
              {showCases && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {casosDisponibles.map(({ nombre, caso }) => (
                      <button
                        key={nombre}
                        onClick={() => { cargarCasoClinico(nombre); setShowCases(false); }}
                        className="text-left p-4 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                      >
                        <h4 className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{caso.nombre}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{caso.descripcion}</p>
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 font-medium">→ {caso.diagnosticoEsperado}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Main Content */}
        {!calculoRealizado ? (
          <>
            {/* Step Navigation */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {STEPS.map(step => {
                const isActive = currentStep === step.id;
                const complete = isStepComplete(step.id) && step.id < currentStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-center transition-all duration-200 border-2 ${
                      isActive
                        ? 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-105'
                        : complete
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                          : 'bg-white/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-700/30 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <span className="text-lg">{complete && !isActive ? '✓' : step.icon}</span>
                    <span className="text-xs font-semibold truncate">{step.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="rounded-2xl bg-white/60 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 p-6 md:p-8 mb-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={reiniciarCalculadora}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:border-red-300 dark:hover:border-red-700 hover:text-red-500 transition-all"
              >
                🔄 Reiniciar
              </button>

              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-300 transition-all"
                  >
                    ← Anterior
                  </button>
                )}
                {currentStep < 5 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    onClick={realizarCalculo}
                    disabled={!canCalculate}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    🧮 Calcular Diagnóstico
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Results */
          <>
            <div className="rounded-2xl bg-white/60 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 p-6 md:p-8 mb-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
              <ResultsPanel resultados={resultadosDiagnostico} hallazgos={hallazgosInervacionDual} datos={datosEvaluacion} />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={reiniciarCalculadora}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all"
              >
                🔄 Nueva Evaluación
              </button>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 max-w-xl mx-auto leading-relaxed">
          ⚕️ Esta herramienta es de apoyo diagnóstico y no sustituye la evaluación clínica.
          Creada por el Dr. Marcos Yocupicio para la plataforma educativa EMG DeepLuxMed.
        </p>
      </div>
    </div>
  );
}
