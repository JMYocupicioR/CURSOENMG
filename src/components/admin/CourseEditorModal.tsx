import { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  X,
  Settings,
  BookOpen,
  Video,
  FileText,
  Save,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { slugify } from '../../utils/slugify';
import { assertCreateableCourseId } from '../../content/courseCatalog';
import type { Course, LiveWorkshop } from '../../types/database';
import type { Module } from '../../types/content';

const PRICE_PRESETS = ['$4,500 MXN', '$3,500 MXN', '$2,500 MXN', 'Consultar', 'Beca 100%'];
const INSTRUCTOR_PRESETS = [
  { name: 'Dr. Juan Marcos Yocupicio Robles', title: 'Especialista en Neurofisiología Clínica' },
  { name: 'Comité Académico NeuroSAFE', title: 'Consejo Editorial ElectroDx' },
];

export type CourseEditorTab = 'general' | 'temario' | 'live' | 'materials';

export interface CourseEditorSavePayload {
  id?: string;
  title: string;
  description: string;
  price_display: string | null;
  is_active: boolean;
  is_sellable: boolean;
  instructor_name?: string | null;
  instructor_title?: string | null;
  live_meeting_url?: string | null;
  live_schedule_notes?: string | null;
  active_workshop_id?: string | null;
  syllabus_brochure_url?: string | null;
  min_passing_grade?: number | null;
  selectedModuleIds?: string[];
}

interface CourseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course | null; // null si es creación
  allCourses: Course[];
  allModules: Module[];
  assignedModuleIds: string[];
  workshops?: LiveWorkshop[];
  onSave: (payload: CourseEditorSavePayload) => Promise<void>;
  onDelete?: () => void;
}

export function CourseEditorModal({
  isOpen,
  onClose,
  course,
  allCourses,
  allModules,
  assignedModuleIds,
  workshops = [],
  onSave,
  onDelete,
}: CourseEditorModalProps) {
  const isCreate = !course;
  const [activeTab, setActiveTab] = useState<CourseEditorTab>('general');

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [customSlug, setCustomSlug] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('Consultar');
  const [isActive, setIsActive] = useState(true);
  const [isSellable, setIsSellable] = useState(true);
  const [minPassingGrade, setMinPassingGrade] = useState(80);

  // Instructor
  const [instructorName, setInstructorName] = useState('Dr. Juan Marcos Yocupicio Robles');
  const [instructorTitle, setInstructorTitle] = useState('Especialista en Neurofisiología Clínica');

  // Fast-Track / Live
  const [liveMeetingUrl, setLiveMeetingUrl] = useState('');
  const [liveScheduleNotes, setLiveScheduleNotes] = useState('');
  const [activeWorkshopId, setActiveWorkshopId] = useState('');

  // Docs
  const [syllabusBrochureUrl, setSyllabusBrochureUrl] = useState('');

  // Módulos asignados (para tab 2)
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingIds = useMemo(() => allCourses.map((c) => c.id), [allCourses]);

  useEffect(() => {
    if (!isOpen) return;

    if (course) {
      setTitle(course.title || '');
      setSlug(course.id || '');
      setCustomSlug(true);
      setDescription(course.description || '');
      setPrice(course.price_display || 'Consultar');
      setIsActive(course.is_active ?? true);
      setIsSellable(course.is_sellable ?? true);
      setMinPassingGrade(course.min_passing_grade ?? 80);
      setInstructorName(course.instructor_name || 'Dr. Juan Marcos Yocupicio Robles');
      setInstructorTitle(course.instructor_title || 'Especialista en Neurofisiología Clínica');
      setLiveMeetingUrl(course.live_meeting_url || '');
      setLiveScheduleNotes(course.live_schedule_notes || '');
      setActiveWorkshopId(course.active_workshop_id || '');
      setSyllabusBrochureUrl(course.syllabus_brochure_url || '');
      setSelectedModuleIds(assignedModuleIds);
    } else {
      setTitle('');
      setSlug('');
      setCustomSlug(false);
      setDescription('');
      setPrice('Consultar');
      setIsActive(true);
      setIsSellable(true);
      setMinPassingGrade(80);
      setInstructorName('Dr. Juan Marcos Yocupicio Robles');
      setInstructorTitle('Especialista en Neurofisiología Clínica');
      setLiveMeetingUrl('');
      setLiveScheduleNotes('');
      setActiveWorkshopId('');
      setSyllabusBrochureUrl('');
      setSelectedModuleIds([]);
    }

    setActiveTab('general');
    setError(null);
    setSaving(false);
  }, [isOpen, course, assignedModuleIds]);

  useEffect(() => {
    if (isCreate && !customSlug && title) {
      setSlug(slugify(title));
    }
  }, [isCreate, customSlug, title]);

  if (!isOpen) return null;

  const handleToggleModule = (modId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título del curso es obligatorio.');
      setActiveTab('general');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let finalId = course?.id;
      if (isCreate) {
        finalId = assertCreateableCourseId(slug.trim() || slugify(title), existingIds);
      }

      await onSave({
        id: finalId,
        title: title.trim(),
        description: description.trim(),
        price_display: isSellable ? price.trim() || 'Consultar' : null,
        is_active: isActive,
        is_sellable: isSellable,
        min_passing_grade: minPassingGrade,
        instructor_name: instructorName.trim() || null,
        instructor_title: instructorTitle.trim() || null,
        live_meeting_url: liveMeetingUrl.trim() || null,
        live_schedule_notes: liveScheduleNotes.trim() || null,
        active_workshop_id: activeWorkshopId.trim() || null,
        syllabus_brochure_url: syllabusBrochureUrl.trim() || null,
        selectedModuleIds,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el curso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-3xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                {isCreate ? 'Nuevo Diplomado / Curso' : 'Configuración del Curso'}
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white truncate max-w-md">
                {isCreate ? 'Agregar curso al catálogo' : title || 'Editar curso'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Pestañas Limpias */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 overflow-x-auto">
          {[
            { id: 'general', label: '1. General & Visibilidad', icon: Settings },
            { id: 'temario', label: `2. Temario (${selectedModuleIds.length})`, icon: BookOpen },
            { id: 'live', label: '3. Aula Virtual & En Vivo', icon: Video },
            { id: 'materials', label: '4. Docs & Materiales', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as CourseEditorTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'border-blue-600 text-blue-600 dark:text-cyan-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[62vh] overflow-y-auto space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-300 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ─── PESTAÑA 1: GENERAL ─── */}
            {activeTab === 'general' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Título Oficial del Curso <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. Diplomado Nivel 1 en Electrodiagnóstico"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Identificador (Slug URL) <span className="text-red-500">*</span>
                      </label>
                      {isCreate && (
                        <button
                          type="button"
                          onClick={() => setCustomSlug(!customSlug)}
                          className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold hover:underline"
                        >
                          {customSlug ? 'Restaurar automático' : 'Personalizar'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      disabled={!isCreate && !customSlug}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 disabled:opacity-75"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descripción Pedagógica Pública
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Objetivo clínico del curso, perfil del egresado y competencias a adquirir..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Docente Titular */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                      👨‍⚕️ Docente Titular del Curso
                    </span>
                    <div className="flex gap-1.5">
                      {INSTRUCTOR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setInstructorName(p.name);
                            setInstructorTitle(p.title);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400 cursor-pointer"
                        >
                          {p.name.split(' ')[1] || p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Nombre completo del profesor
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                        value={instructorName}
                        onChange={(e) => setInstructorName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Especialidad / Título académico
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        value={instructorTitle}
                        onChange={(e) => setInstructorTitle(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Precio y Calificación Mínima */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Inversión / Precio mostrado
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-black text-emerald-700 dark:text-emerald-400"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {PRICE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPrice(preset)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nota Mínima Acreditación (%)
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={100}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                      value={minPassingGrade}
                      onChange={(e) => setMinPassingGrade(Number(e.target.value) || 80)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Requisito de promedio en quizzes para emitir la constancia oficial.
                    </p>
                  </div>
                </div>

                {/* Toggles de Estado */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Curso Activo (Visible para inscripciones)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSellable}
                      onChange={(e) => setIsSellable(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Diplomado Independiente (Con constancia propia)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ─── PESTAÑA 2: TEMARIO ASIGNADO ─── */}
            {activeTab === 'temario' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Módulos Incluidos en este Curso
                    </h3>
                    <p className="text-xs text-slate-500">
                      Selecciona los módulos de la biblioteca que componen el temario oficial de este nivel.
                    </p>
                  </div>
                  <span className="text-xs font-black text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                    {selectedModuleIds.length} seleccionados
                  </span>
                </div>

                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                  {allModules.map((mod) => {
                    const isChecked = selectedModuleIds.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleModule(mod.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                          <span className="text-xl shrink-0">{mod.emoji || '📘'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate">{mod.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {mod.topics?.length || 0} temas formativos
                            </p>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-cyan-400 shrink-0">
                            <Check className="w-3 h-3" /> Asignado
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── PESTAÑA 3: AULA VIRTUAL Y FAST-TRACK ─── */}
            {activeTab === 'live' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-100 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Regla Fast-Track del Estudiante:</strong> Cuando configures un enlace de reunión o vincules un taller activo programado para hoy, el encabezado del alumno en <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">/portal/curso/{course?.id || 'slug'}</code> mostrará un botón rojo pulsante de 1 clic para entrar directamente a la clase en vivo.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Enlace de Clase en Vivo Recurrente (Zoom / Meet / Teams)
                  </label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/123456789 o https://meet.google.com/..."
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    value={liveMeetingUrl}
                    onChange={(e) => setLiveMeetingUrl(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Si no hay taller de fecha específica, este enlace servirá como aula virtual permanente del diplomado.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Horario Habitual de Transmisión
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Jueves 19:00 a 20:30 hrs (CDMX) · Sesión Quincenal"
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    value={liveScheduleNotes}
                    onChange={(e) => setLiveScheduleNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vincular Taller en Vivo Activo de la Plataforma
                  </label>
                  <select
                    className="w-full border rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                    value={activeWorkshopId}
                    onChange={(e) => setActiveWorkshopId(e.target.value)}
                  >
                    <option value="">-- Sin taller específico vinculado (Usar aula recurrente) --</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title} ({new Date(w.scheduled_at).toLocaleDateString('es-MX')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ─── PESTAÑA 4: DOCS & MATERIALES ─── */}
            {activeTab === 'materials' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL del Folleto / Temario Oficial en PDF
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../brochure-nivel-1.pdf"
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    value={syllabusBrochureUrl}
                    onChange={(e) => setSyllabusBrochureUrl(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Permite que los alumnos descarguen el PDF oficial del diplomado desde su panel del curso y desde el catálogo público.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Bibliografía Recomendada del Nivel
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Las referencias académicas se integran automáticamente con los metadatos de los temas de los módulos asignados a este curso.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Botones */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            {onDelete && !isCreate ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar curso</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
