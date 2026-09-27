import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, ClipboardList, Link2, Paperclip, Search, Sparkles, Trash2, Users, X } from 'lucide-react';
import { createBatchAssignments } from '../../services/studentPlanService';
import {
  removeAssignmentMaterialFiles,
  uploadAssignmentMaterialFile,
} from '../../services/assignmentMaterialService';
import { getAdminProfiles } from '../../services/editorialService';
import { filterGradeableStudents } from '../../utils/adminUtils';
import {
  ASSIGNMENT_MATERIAL_MAX_FILES,
  ASSIGNMENT_MATERIAL_MAX_LINKS,
  assignmentMaterialFileError,
  assignmentMaterialLinkError,
  formatAssignmentMaterialSize,
  type AssignmentMaterial,
} from '../../utils/assignmentMaterials';
import { useAuth } from '../../contexts/AuthProvider';
import type { AdminProfileRow } from '../../types/admin';
import type { AssignmentPriority } from '../../types/studentPlan';

interface DraftFile {
  id: string;
  file: File;
}

interface DraftLink {
  id: string;
  url: string;
  label: string;
}

interface AssignHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void | boolean | Promise<void | boolean>;
  initialStudentId?: string;
  initialStudentName?: string;
  initialDueDate?: string;
  profiles?: AdminProfileRow[];
}

export default function AssignHomeworkModal({
  isOpen,
  onClose,
  onAssigned,
  initialStudentId,
  initialStudentName,
  initialDueDate,
  profiles: initialProfiles,
}: AssignHomeworkModalProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfileRow[]>(initialProfiles || []);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [targetScope, setTargetScope] = useState<'single' | 'selected' | 'cohort'>(
    initialStudentId ? 'single' : 'cohort'
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    initialStudentId ? new Set([initialStudentId]) : new Set()
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResidencyFilter, setStudentResidencyFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AssignmentPriority>('normal');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (!initialProfiles || initialProfiles.length === 0) {
      setLoadingProfiles(true);
      getAdminProfiles(false, 'all')
        .then((data) => setProfiles(filterGradeableStudents(data)))
        .catch((err) => console.error(err))
        .finally(() => setLoadingProfiles(false));
    } else {
      setProfiles(filterGradeableStudents(initialProfiles));
    }
    if (initialStudentId) {
      setSelectedStudentIds(new Set([initialStudentId]));
      setTargetScope('single');
    } else {
      setTargetScope('cohort');
    }
    if (initialDueDate) setDueDate(initialDueDate);
  }, [isOpen, initialProfiles, initialStudentId, initialDueDate]);

  useEffect(() => {
    if (!isOpen) return;
    setDraftFiles([]);
    setDraftLinks([]);
    setLinkDraft('');
    setLinkLabel('');
  }, [isOpen]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const q = studentSearch.toLowerCase();
      const matchSearch =
        profile.display_name.toLowerCase().includes(q) ||
        profile.email.toLowerCase().includes(q) ||
        (profile.institution && profile.institution.toLowerCase().includes(q)) ||
        (profile.cedula_profesional && profile.cedula_profesional.includes(q));
      const matchRes =
        studentResidencyFilter === 'all' ||
        (profile.residency_year || '').toLowerCase().includes(studentResidencyFilter.toLowerCase());
      return matchSearch && matchRes;
    });
  }, [profiles, studentSearch, studentResidencyFilter]);

  const finalRecipientIds = useMemo(() => {
    if (targetScope === 'single') return initialStudentId ? [initialStudentId] : [];
    if (targetScope === 'cohort') return profiles.map((profile) => profile.id);
    return Array.from(selectedStudentIds);
  }, [targetScope, initialStudentId, profiles, selectedStudentIds]);

  const toggleStudentSelected = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.size === filteredProfiles.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredProfiles.map((profile) => profile.id)));
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError(null);
    const next = [...draftFiles];
    for (const file of Array.from(list)) {
      const validation = assignmentMaterialFileError(file, next.length);
      if (validation) {
        setError(validation);
        break;
      }
      next.push({ id: crypto.randomUUID(), file });
    }
    setDraftFiles(next);
  };

  const addLink = () => {
    const validation = assignmentMaterialLinkError(linkDraft, draftLinks.length);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setDraftLinks((current) => [
      ...current,
      { id: crypto.randomUUID(), url: linkDraft.trim(), label: linkLabel.trim() },
    ]);
    setLinkDraft('');
    setLinkLabel('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (finalRecipientIds.length === 0) {
      setError('Elige al menos un alumno.');
      return;
    }
    if (!title.trim()) {
      setError('Escribe un título para la tarea.');
      return;
    }
    if (!dueDate) {
      setError('Indica la fecha límite.');
      return;
    }

    if (draftFiles.length > 0 && !user?.id) {
      setError('Inicia sesión de nuevo para subir archivos.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const uploadedPaths: string[] = [];
    let published = false;
    try {
      const materials: AssignmentMaterial[] = draftLinks.map((item) => ({
        kind: 'link',
        url: item.url,
        label: item.label || null,
      }));
      for (const item of draftFiles) {
        const uploaded = await uploadAssignmentMaterialFile(user!.id, item.file);
        if (uploaded.storage_path) uploadedPaths.push(uploaded.storage_path);
        materials.push(uploaded);
      }
      const created = await createBatchAssignments(finalRecipientIds, {
        title: title.trim(),
        type: 'practical_task',
        description:
          description.trim() ||
          'Entrega un archivo (PDF o imagen) o un enlace de Drive, OneDrive o Dropbox.',
        due_date: new Date(dueDate).toISOString(),
        status: 'pending',
        priority,
        assigned_by: user?.id ?? null,
        materials,
      });
      if (created.length === 0) {
        throw new Error('No se pudo asignar la tarea. Revisa la conexión e inténtalo de nuevo.');
      }
      published = true;
      const reloaded = await onAssigned?.();
      if (reloaded === false) {
        setError('La tarea se asignó, pero la lista no se pudo recargar. Usa Reintentar.');
        return;
      }
      setTitle('');
      setDescription('');
      setDraftFiles([]);
      setDraftLinks([]);
      onClose();
    } catch (err) {
      if (!published) await removeAssignmentMaterialFiles(uploadedPaths);
      const message = err instanceof Error ? err.message : 'No se pudo enviar la tarea.';
      const missingColumn = message.toLowerCase().includes('materials');
      setError(
        missingColumn
          ? 'Falta aplicar la migración de material de tareas (20260927053609_assignment_teacher_materials) en Supabase.'
          : message
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nueva tarea</h2>
              <p className="text-xs text-slate-500">
                La misma entrega para toda la cohorte o para los alumnos que elijas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Destinatarios</span>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {initialStudentId && (
                  <button
                    type="button"
                    onClick={() => setTargetScope('single')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      targetScope === 'single' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Este alumno
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTargetScope('selected')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    targetScope === 'selected' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Elegir ({selectedStudentIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('cohort')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    targetScope === 'cohort' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Toda la cohorte ({profiles.length})
                </button>
              </div>
            </div>

            {targetScope === 'single' ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {initialStudentName || 'Alumno actual'}
                </p>
                <p className="text-[11px] text-slate-500">La tarea queda solo en este expediente.</p>
              </div>
            ) : targetScope === 'cohort' ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  Se crea la misma tarea para los <strong>{profiles.length} médicos cursistas</strong>.
                </span>
              </div>
            ) : (
              <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, correo o cédula..."
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <select
                    value={studentResidencyFilter}
                    onChange={(event) => setStudentResidencyFilter(event.target.value)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="all">Todos los grados</option>
                    <option value="R1">Solo R1</option>
                    <option value="R2">Solo R2</option>
                    <option value="R3">Solo R3</option>
                    <option value="R4">Solo R4</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleSelectAllStudents}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold whitespace-nowrap"
                  >
                    {selectedStudentIds.size === filteredProfiles.length ? 'Quitar todos' : 'Marcar todos'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {loadingProfiles ? (
                    <p className="text-center py-3 text-slate-400">Cargando alumnos…</p>
                  ) : filteredProfiles.length === 0 ? (
                    <p className="text-center py-3 text-slate-400">No hay cursistas con este filtro.</p>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <label
                        key={profile.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(profile.id)}
                            onChange={() => toggleStudentSelected(profile.id)}
                            className="rounded text-amber-600"
                          />
                          <span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {profile.display_name}
                            </span>
                            <span className="text-[10px] text-slate-400">{profile.email}</span>
                          </span>
                        </span>
                        {profile.residency_year && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            {profile.residency_year}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Título</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Reporte de latencias del mediano"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Instrucciones</span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Qué debe entregar el alumno. Puede subir PDF/imagen o un enlace de Drive."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </label>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Paperclip className="h-3.5 w-3.5 text-amber-600" />
                  Material para el alumno
                </span>
                <span className="text-[10px] text-slate-400">
                  {draftFiles.length}/{ASSIGNMENT_MATERIAL_MAX_FILES} archivos
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Imagen, PDF, documento, audio o video. Cada archivo puede pesar hasta 50 MB, el máximo del plan
                gratuito de Supabase. El proyecto tiene 1 GB de almacenamiento en total. Para algo más grande, pega un
                enlace.
              </p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-white px-3 py-2.5 font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950/30">
                <Paperclip className="h-3.5 w-3.5" />
                Subir archivos
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
              {draftFiles.length > 0 && (
                <ul className="space-y-1">
                  {draftFiles.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 dark:bg-slate-900"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-200">
                        {item.file.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatAssignmentMaterialSize(item.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraftFiles((current) => current.filter((row) => row.id !== item.id))}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                        aria-label={`Quitar ${item.file.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="url"
                  value={linkDraft}
                  onChange={(event) => setLinkDraft(event.target.value)}
                  placeholder="https://… enlace de Drive, YouTube u otro sitio"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={addLink}
                  disabled={draftLinks.length >= ASSIGNMENT_MATERIAL_MAX_LINKS}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Agregar enlace
                </button>
              </div>
              <input
                type="text"
                value={linkLabel}
                onChange={(event) => setLinkLabel(event.target.value)}
                placeholder="Nombre del enlace (opcional)"
                maxLength={180}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
              />
              {draftLinks.length > 0 && (
                <ul className="space-y-1">
                  {draftLinks.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 dark:bg-slate-900"
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-200">
                        {item.label || item.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraftLinks((current) => current.filter((row) => row.id !== item.id))}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                        aria-label="Quitar enlace"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha límite
                </span>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Prioridad</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as AssignmentPriority)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
            </div>
          </div>

          {error && <p className="text-rose-600 dark:text-rose-300 font-semibold">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">
              Se enviará a <strong className="text-slate-800 dark:text-slate-200">{finalRecipientIds.length}</strong>{' '}
              alumno{finalRecipientIds.length === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || finalRecipientIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Enviando…' : 'Publicar tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
