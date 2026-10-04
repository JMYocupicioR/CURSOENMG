import { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Save,
  Award,
  BookOpen,
  Calendar,
  FileCheck,
} from 'lucide-react';
import {
  getGradebookRubrics,
  saveGradebookRubrics,
  DEFAULT_RUBRIC_CONFIG,
} from '../../services/gradebookService';
import type { GradebookRubricConfig } from '../../types/academicGradebook';

interface GradebookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function GradebookConfigModal({
  isOpen,
  onClose,
  onSaved,
}: GradebookConfigModalProps) {
  const [config, setConfig] = useState<GradebookRubricConfig>(DEFAULT_RUBRIC_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSuccess(false);
      getGradebookRubrics()
        .then((res) => {
          setConfig(res);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalWeight = config.rubrics.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const isValidTotal = totalWeight === 100;

  const handleWeightChange = (index: number, val: number) => {
    const updated = [...config.rubrics];
    updated[index] = { ...updated[index], weight: Math.max(0, Math.min(100, val)) };
    setConfig({ ...config, rubrics: updated });
  };

  const handleResetDefaults = () => {
    setConfig({
      ...DEFAULT_RUBRIC_CONFIG,
      updated_at: new Date().toISOString(),
    });
  };

  const handleSave = async () => {
    if (!isValidTotal) return;
    setSaving(true);
    try {
      await saveGradebookRubrics(config);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const getRubricIcon = (id: string) => {
    switch (id) {
      case 'exams':
        return Award;
      case 'assignments':
        return FileCheck;
      case 'attendance':
        return Calendar;
      case 'curriculum':
        return BookOpen;
      default:
        return Sliders;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Criterios y Ponderación de Calificaciones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personaliza los rubros evaluativos y la nota mínima para el Kardex oficial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando criterios...</div>
          ) : (
            <>
              {/* Total weight banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition ${
                  isValidTotal
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isValidTotal ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold">
                      {isValidTotal
                        ? 'Ponderación equilibrada al 100%'
                        : `La suma actual de los rubros es ${totalWeight}%. Debe ser exactamente 100%.`}
                    </p>
                    <p className="text-[11px] opacity-80">
                      Cada porcentaje representa la contribución directa de cada área a la nota final del Kardex.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-2xl font-black ${
                      isValidTotal
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {totalWeight}%
                  </span>
                </div>
              </div>

              {/* Rubrics List */}
              <div className="space-y-3.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Rubros de Calificación del Curso
                </label>

                {config.rubrics.map((rubric, idx) => {
                  const Icon = getRubricIcon(rubric.id);

                  return (
                    <div
                      key={rubric.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {rubric.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rubric.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={rubric.weight}
                          onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                          className="w-28 accent-indigo-600 cursor-pointer"
                        />
                        <div className="relative w-16">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={rubric.weight}
                            onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                            className="w-full text-center py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-100"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Min Passing Grade */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white block">
                    Calificación Mínima Aprobatoria (COMEFYR)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Puntuación mínima requerida en la escala 0-100 para expedición de Kardex Acreditado
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={config.minPassingGrade}
                    onChange={(e) =>
                      setConfig({ ...config, minPassingGrade: Number(e.target.value) || 80 })
                    }
                    className="w-20 text-center py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-indigo-600 dark:text-indigo-400"
                  />
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores Predeterminados</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValidTotal || saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Guardando...</span>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Aplicar Criterios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
