import { useState } from 'react';
import { 
  CASOS_CLINICOS_DEMO,
  MUSCULOS_EVALUACION,
  type DatosEvaluacion, 
  type ResultadoDiagnostico,
  type HallazgoInervacionDual,
} from './plexoBraquial';
import { runPlexusDiagnosis, analizarInervacionDual } from './plexusDiagnosisEngine';

export function usePlexoBraquialAssessment() {
  // Inicializar todos los músculos con MRC 5 (normal)
  const initialMuscleStrengths = MUSCULOS_EVALUACION.reduce((acc, musculo) => {
    acc[musculo] = 5;
    return acc;
  }, {} as { [musculo: string]: number });

  const [datosEvaluacion, setDatosEvaluacion] = useState<DatosEvaluacion>({
    fuerzasMuscular: initialMuscleStrengths,
    sintomasSeleccionados: [],
    areasSeleccionadas: [],
    reflejos: {
      bicipital: 'normal',
      braquiorradial: 'normal',
      tricipital: 'normal'
    },
    informacionAdicional: {
      mecanismo: '',
      evolucion: '',
      tipoPlexo: 'normal'
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [calculoRealizado, setCalculoRealizado] = useState(false);
  const [resultadosDiagnostico, setResultadosDiagnostico] = useState<ResultadoDiagnostico[]>([]);
  const [hallazgosInervacionDual, setHallazgosInervacionDual] = useState<HallazgoInervacionDual[]>([]);

  // Funciones de actualización
  const updateFuerzaMuscular = (musculo: string, fuerza: number) => {
    setDatosEvaluacion(prev => ({
      ...prev,
      fuerzasMuscular: {
        ...prev.fuerzasMuscular,
        [musculo]: fuerza
      }
    }));
    setCalculoRealizado(false);
  };

  const updateSintomas = (sintomas: string[]) => {
    setDatosEvaluacion(prev => ({
      ...prev,
      sintomasSeleccionados: sintomas
    }));
    setCalculoRealizado(false);
  };

  const updateAreas = (areas: string[]) => {
    setDatosEvaluacion(prev => ({
      ...prev,
      areasSeleccionadas: areas
    }));
    setCalculoRealizado(false);
  };

  const updateReflejo = (reflejo: keyof typeof datosEvaluacion.reflejos, valor: 'normal' | 'disminuido' | 'ausente') => {
    setDatosEvaluacion(prev => ({
      ...prev,
      reflejos: {
        ...prev.reflejos,
        [reflejo]: valor
      }
    }));
    setCalculoRealizado(false);
  };

  const updateInformacionAdicional = (campo: keyof typeof datosEvaluacion.informacionAdicional, valor: string | number) => {
    setDatosEvaluacion(prev => ({
      ...prev,
      informacionAdicional: {
        ...prev.informacionAdicional,
        [campo]: valor
      }
    }));
    setCalculoRealizado(false);
  };

  const updateContextoClinico = (contexto: 'traumatico' | 'obstetrico' | 'iatrogeno' | 'idiopatico') => {
    setDatosEvaluacion(prev => ({
      ...prev,
      informacionAdicional: {
        ...prev.informacionAdicional,
        contextoClinico: contexto
      }
    }));
    setCalculoRealizado(false);
  };

  const updateTiempoEvolucion = (dias: number) => {
    setDatosEvaluacion(prev => ({
      ...prev,
      informacionAdicional: {
        ...prev.informacionAdicional,
        tiempoEvolucion: dias
      }
    }));
    setCalculoRealizado(false);
  };

  const updateFaseEvolutiva = (fase: 'hiperaguda' | 'aguda' | 'subaguda' | 'cronica') => {
    setDatosEvaluacion(prev => ({
      ...prev,
      informacionAdicional: {
        ...prev.informacionAdicional,
        faseEvolutiva: fase
      }
    }));
    setCalculoRealizado(false);
  };

  const updatePatronEvolucion = (patron: 'mejorando' | 'estable' | 'deteriorando') => {
    setDatosEvaluacion(prev => ({
      ...prev,
      informacionAdicional: {
        ...prev.informacionAdicional,
        patronEvolucion: patron
      }
    }));
    setCalculoRealizado(false);
  };

  const realizarCalculo = () => {
    // Realizar análisis de inervación dual
    const hallazgos = analizarInervacionDual(datosEvaluacion.fuerzasMuscular);
    setHallazgosInervacionDual(hallazgos);
    
    // Ejecutar el motor de diagnóstico
    const resultados = runPlexusDiagnosis(datosEvaluacion);
    setResultadosDiagnostico(resultados);

    setCalculoRealizado(true);
  };

  const reiniciarCalculadora = () => {
    setDatosEvaluacion({
      fuerzasMuscular: initialMuscleStrengths,
      sintomasSeleccionados: [],
      areasSeleccionadas: [],
      reflejos: {
        bicipital: 'normal',
        braquiorradial: 'normal',
        tricipital: 'normal'
      },
      informacionAdicional: {
        mecanismo: '',
        evolucion: '',
        tipoPlexo: 'normal',
        contextoClinico: undefined,
        tiempoEvolucion: undefined,
        faseEvolutiva: undefined,
        patronEvolucion: undefined
      }
    });
    setCurrentStep(1);
    setCalculoRealizado(false);
    setResultadosDiagnostico([]);
    setHallazgosInervacionDual([]);
  };

  // Validación de completitud por paso
  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return Object.keys(datosEvaluacion.fuerzasMuscular).length > 0;
      case 2:
        return true; // Los síntomas son opcionales
      case 3:
        return true; // Las áreas de sensibilidad son opcionales
      case 4:
        return true; // Los reflejos tienen valores por defecto
      case 5:
        return true; // La información adicional es opcional
      default:
        return false;
    }
  };

  // Validaciones más específicas
  const getStepValidationMessage = (step: number): string | null => {
    switch (step) {
      case 1:
        const musculosEvaluados = Object.keys(datosEvaluacion.fuerzasMuscular).length;
        if (musculosEvaluados === 0) {
          return "Debe evaluar al menos un músculo para continuar";
        }
        if (musculosEvaluados < 3) {
          return "Recomendamos evaluar al menos 3 músculos para un diagnóstico más preciso";
        }
        return null;
      case 2:
        return null; // Síntomas opcionales
      case 3:
        return null; // Sensibilidad opcional
      case 4:
        return null; // Reflejos tienen valores por defecto
      case 5:
        return null; // Información adicional opcional
      default:
        return null;
    }
  };

  // Validación para el cálculo final
  const getCalculationValidationMessage = (): string | null => {
    const musculosAfectados = Object.values(datosEvaluacion.fuerzasMuscular).filter(mrc => mrc < 5).length;
    
    if (musculosAfectados === 0) {
      return "No se encontraron músculos afectados. ¿Está seguro de que todos los músculos están normales (MRC 5)?";
    }
    
    if (musculosAfectados < 3) {
      return "Solo se encontraron pocos músculos afectados. Considere revisar la evaluación para mayor precisión diagnóstica";
    }
    
    return null;
  };

  // Obtener sugerencias por paso
  const getStepSuggestions = (step: number): string[] => {
    switch (step) {
      case 1:
        const musculosEvaluados = Object.keys(datosEvaluacion.fuerzasMuscular);
        const suggestions = [];
        
        if (musculosEvaluados.length === 0) {
          suggestions.push("Comience evaluando músculos proximales como Deltoides y Bíceps");
        }
        
        if (!musculosEvaluados.includes("Deltoides") && !musculosEvaluados.includes("Bíceps Braquial")) {
          suggestions.push("Evalúe músculos proximales para localizar el nivel de la lesión");
        }
        
        if (!musculosEvaluados.includes("Interóseos Dorsales") && musculosEvaluados.length > 3) {
          suggestions.push("Evalúe músculos intrínsecos de la mano para descartar lesiones distales");
        }
        
        return suggestions;
      
      case 2:
        if (datosEvaluacion.sintomasSeleccionados.length === 0) {
          return ["Los síntomas ayudan a diferenciar entre tipos de lesión", "El dolor neurítico sugiere lesión radicular"];
        }
        return [];
      
      case 3:
        if (datosEvaluacion.areasSeleccionadas.length === 0) {
          return ["La evaluación sensitiva ayuda a localizar la lesión", "Los dermatomas indican qué raíces están afectadas"];
        }
        return [];
      
      case 4:
        return ["Los reflejos ayudan a localizar el nivel de la lesión", "Reflejos ausentes sugieren lesión de la raíz correspondiente"];
      
      case 5:
        return ["El mecanismo de lesión orienta el diagnóstico", "El tipo de plexo puede modificar los hallazgos"];
      
      default:
        return [];
    }
  };

  const canCalculate = isStepComplete(1); // Al menos debe haber evaluación muscular

  // Función para cargar un caso clínico predefinido
  const cargarCasoClinico = (nombreCaso: string) => {
    const caso = CASOS_CLINICOS_DEMO[nombreCaso];
    if (!caso) return;

    setDatosEvaluacion({
      fuerzasMuscular: { ...caso.musculos },
      sintomasSeleccionados: [...caso.sintomas],
      areasSeleccionadas: [...caso.sensibilidad],
      reflejos: { ...caso.reflejos },
      informacionAdicional: { ...caso.informacionAdicional }
    });
    
    setCurrentStep(5); // Ir al último paso para revisar
    setCalculoRealizado(false);
    setResultadosDiagnostico([]);
    setHallazgosInervacionDual([]);
  };

  // Obtener lista de casos clínicos disponibles
  const casosDisponibles = Object.keys(CASOS_CLINICOS_DEMO).map(key => ({
    nombre: key,
    caso: CASOS_CLINICOS_DEMO[key]
  }));

  return {
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
    isStepComplete,
    canCalculate,
    cargarCasoClinico,
    casosDisponibles,
    getStepValidationMessage,
    getCalculationValidationMessage,
    getStepSuggestions
  };
}
