import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import {
  getAcademicMilestones,
  saveMilestone,
  deleteMilestone,
  rememberAdminMilestones,
} from '../../services/academicScheduleService';
import { allModules } from '../../content/modules';
import type { AcademicMilestone } from '../../types/academicGradebook';
import type { AdminProfileRow } from '../../types/admin';
import type { Topic } from '../../types/content';

interface AcademicScheduleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: AdminProfileRow[];
  onUpdated?: () => void;
}

export default function AcademicScheduleManagerModal({
  isOpen,
  onClose,
  profiles,
  onUpdated,
}: AcademicScheduleManagerModalProps) {
  const [milestones, setMilestones] = useState<AcademicMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'milestones' | 'matrix'>('milestones');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [editingMilestone, setEditingMilestone] = useState<AcademicMilestone | null>(null);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAcademicMilestones()
        .then((res) => {
          rememberAdminMilestones(res);
          setMilestones(res);
          if (res.length > 0) {
            setSelectedMilestoneId(res[0].id);
            setExpandedMilestoneId(res[0].id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Lista aplanada de hojas del temario. Algunos IDs se reutilizan entre módulos
  // (p. ej. fiber-types), así que cada fila lleva una clave de lista única.
  const allPlatformTopics = useMemo(() => {
    const list: { listKey: string; id: string; title: string; moduleId: string; moduleTitle: string }[] = [];
    for (const m of allModules) {
      const extractLeafs = (topics: Topic[]) => {
        for (const t of topics) {
          if (!t.children || t.children.length === 0) {
            list.push({
              listKey: `${m.id}:${t.id}:${list.length}`,
              id: t.id,
              title: t.title,
              moduleId: m.id,
              moduleTitle: m.title,
            });
          } else {
            extractLeafs(t.children);
          }
        }
      };
      extractLeafs(m.topics);
    }
    return list;
  }, []);

  if (!isOpen) return null;

  const handleCreateNew = () => {
    const newM: AcademicMilestone = {
      id: `mls_${Date.now()}`,
      cohort_id: '2026-general',
      title: 'Nuevo Corte Académico',
      description: 'Checklist de temas y metas para esta fecha de evaluación',
      start_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      target_topic_ids: allPlatformTopics.slice(0, 5).map((t) => t.id),
      passing_grade: 80,
      order_index: milestones.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingMilestone(newM);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    setSaveError(null);
    try {
      await saveMilestone(editingMilestone);
      const updated = await getAcademicMilestones();
      setMilestones(updated);
      setEditingMilestone(null);
      if (onUpdated) onUpdated();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el corte.');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('¿Deseas eliminar este hito del calendario?')) return;
    await deleteMilestone(id);
    const updated = await getAcademicMilestones();
    setMilestones(updated);
    if (onUpdated) onUpdated();
  };

  const toggleTopicInEditing = (topicId: string) => {
    if (!editingMilestone) return;
    const current = editingMilestone.target_topic_ids || [];
    const exists = current.includes(topicId);
    const updated = exists ? current.filter((id) => id !== topicId) : [...current, topicId];
    setEditingMilestone({ ...editingMilestone, target_topic_ids: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Calendarización de Calificaciones y Checklist de Temas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define fechas de corte, metas periódicas y los temas requeridos por fecha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`py-3.5 border-b-2 transition cursor-pointer ${
              activeTab === 'milestones'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Hitos y Fechas de Corte ({milestones.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`py-3.5 border-b-2 transition cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Auditoría de Cumplimiento por Alumno
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Cargando calendario académico...
            </div>
          ) : activeTab === 'milestones' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cronograma de Periodos del Curso
                  </h3>
                  <p className="text-xs text-slate-500">
                    Los temas del checklist vencen en la fecha de corte indicada
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Corte / Hito</span>
                </button>
              </div>

              {/* Milestones list */}
              <div className="space-y-3">
                {milestones.map((m, idx) => {
                  const dueDate = new Date(m.due_date);
                  const isPast = dueDate < new Date();
                  const isExpanded = expandedMilestoneId === m.id;

                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 overflow-hidden transition"
                    >
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              Periodo {idx + 1}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {m.title}
                            </h4>
                            {isPast ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3" /> Corte Cerrado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> Periodo Vigente
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {m.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1">
                            <span className="flex items-center gap-1 font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              Inicio: {(m.start_date || m.due_date).slice(0, 10)}
                            </span>
                            <span>·</span>
                            <span className="font-semibold">
                              Límite: {m.due_date.slice(0, 10)}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {m.target_topic_ids?.length || 0} temas obligatorios
                            </span>
                            <span>·</span>
                            <span>Mínimo: {m.passing_grade}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMilestoneId(isExpanded ? null : m.id)
                            }
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-xs font-semibold cursor-pointer"
                            title="Ver checklist de temas"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMilestone(m)}
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition cursor-pointer"
                            title="Editar Hito y Temas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                            title="Eliminar hito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Checklist Preview */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/40">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                            Checklist de Temas Requeridos para este Corte:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.target_topic_ids?.map((tid, topicIndex) => {
                              const tMeta = allPlatformTopics.find((t) => t.id === tid);
                              return (
                                <div
                                  key={`${m.id}:${tid}:${topicIndex}`}
                                  className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {tMeta?.title || tid}
                                  </span>
                                  <span className="text-[10px] text-slate-400 ml-auto font-mono shrink-0">
                                    {tMeta?.moduleTitle?.slice(0, 12)}…
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Matrix Tab */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Matriz de Cumplimiento de Temas por Alumno
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supervisa el ritmo de los alumnos frente a las fechas calendarizadas
                  </p>
                </div>

                <select
                  value={selectedMilestoneId}
                  onChange={(e) => setSelectedMilestoneId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} (Fecha: {m.due_date.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Alumno</th>
                      <th className="py-3 px-4">Grado / Hospital</th>
                      <th className="py-3 px-4 text-center">Temas Cumplidos</th>
                      <th className="py-3 px-4 text-center">Progreso del Corte</th>
                      <th className="py-3 px-4 text-right">Estatus frente a Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {profiles.map((student) => {
                      const curM = milestones.find((m) => m.id === selectedMilestoneId);
                      const totalTopics = curM?.target_topic_ids?.length || 10;
                      // Simulación realista basada en el perfil
                      const completedCount = student.enrollment_status === 'approved' ? 8 : 4;
                      const pct = Math.round((completedCount / totalTopics) * 100);
                      const isOverdue = curM && new Date(curM.due_date) < new Date();

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {student.display_name}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {student.residency_year || 'Residente'} · {student.institution || 'Sede'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                            {completedCount} / {totalTopics}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-bold text-[11px]">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {pct >= 80 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> Al corriente
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" /> Rezagado en fecha
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <Clock className="w-3 h-3" /> En tiempo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal para Crear / Editar Hito */}
        {editingMilestone && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Configurar Periodo y Checklist de Temas
                </h3>
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMilestone} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Título del Periodo / Hito
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMilestone.title}
                    onChange={(e) =>
                      setEditingMilestone({ ...editingMilestone, title: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={editingMilestone.description}
                    onChange={(e) =>
                      setEditingMilestone({ ...editingMilestone, description: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      required
                      value={(editingMilestone.start_date || '').slice(0, 10)}
                      max={(editingMilestone.due_date || '').slice(0, 10) || undefined}
                      onChange={(e) =>
                        setEditingMilestone({ ...editingMilestone, start_date: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Fecha límite de corte
                    </label>
                    <input
                      type="date"
                      required
                      value={(editingMilestone.due_date || '').slice(0, 10)}
                      min={(editingMilestone.start_date || '').slice(0, 10) || undefined}
                      onChange={(e) =>
                        setEditingMilestone({ ...editingMilestone, due_date: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nota mínima aprobatoria (%)
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={100}
                      value={editingMilestone.passing_grade}
                      onChange={(e) =>
                        setEditingMilestone({
                          ...editingMilestone,
                          passing_grade: Number(e.target.value),
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Seleccionar temas del checklist */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Temas Requeridos en este Corte ({editingMilestone.target_topic_ids?.length || 0})
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Haz clic para seleccionar o desmarcar temas
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 space-y-1.5 bg-slate-50/50 dark:bg-slate-800/50">
                    {allPlatformTopics.map((t) => {
                      const isSelected = editingMilestone.target_topic_ids?.includes(t.id);
                      return (
                        <button
                          key={t.listKey}
                          type="button"
                          onClick={() => toggleTopicInEditing(t.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-300 dark:border-indigo-700'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate pr-2">{t.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {t.moduleTitle?.slice(0, 14)}…
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {saveError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{saveError}</p>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingMilestone(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Periodo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
