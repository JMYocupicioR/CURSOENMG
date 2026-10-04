import { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Clock,
  ShieldCheck,
  UserX,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Lock,
  Unlock,
  RotateCcw,
  CheckCheck,
  Video,
  Calendar,
  Building,
} from 'lucide-react';
import {
  getWorkshopAttendance,
  saveCohortAttendanceBatch,
  normalizeSessionModality,
} from '../../services/attendanceService';
import { setWorkshopAttendanceClosed } from '../../services/courseService';
import { useAuth } from '../../contexts/AuthProvider';
import type { AdminProfileRow } from '../../types/admin';
import type { LiveWorkshop } from '../../types/database';
import type { AttendanceStatus, ClassAttendanceRecord } from '../../types/academicGradebook';

interface AttendanceCockpitProps {
  workshops: LiveWorkshop[];
  selectedWorkshopId: string;
  onSelectWorkshop: (workshopId: string) => void;
  students: AdminProfileRow[];
  onSaved: () => void;
  onClose?: () => void;
}

interface StudentAttendanceDraft {
  status: AttendanceStatus | null; // null = sin marcar
  excuseReason: string;
  notes: string;
  minutesAttended: number | null;
}

const COMMON_EXCUSE_REASONS = [
  'Guardia hospitalaria en sede',
  'Comisión académica o congreso médico',
  'Incapacidad médica comprobada',
  'Permiso oficial de jefatura de enseñanza',
  'Rotación externa programada',
  'Otro motivo justificado',
];

export default function AttendanceCockpit({
  workshops,
  selectedWorkshopId,
  onSelectWorkshop,
  students,
  onSaved,
  onClose,
}: AttendanceCockpitProps) {
  const { user } = useAuth();

  const [attendances, setAttendances] = useState<Record<string, StudentAttendanceDraft>>({});
  const [activeExcuseStudentId, setActiveExcuseStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentWorkshop = useMemo(
    () => workshops.find((w) => w.id === selectedWorkshopId) || workshops[0] || null,
    [workshops, selectedWorkshopId]
  );

  // Cargar estado inicial del taller seleccionado
  useEffect(() => {
    if (!currentWorkshop) return;

    let isMounted = true;
    const loadWorkshopData = async () => {
      try {
        const records = await getWorkshopAttendance(currentWorkshop.id);
        const draft: Record<string, StudentAttendanceDraft> = {};

        // Inicializar cada estudiante
        for (const s of students) {
          const rec = records.find((r) => r.student_id === s.id);
          if (rec) {
            draft[s.id] = {
              status: rec.status,
              excuseReason: rec.excuse_reason || '',
              notes: rec.notes || '',
              minutesAttended: rec.minutes_attended ?? null,
            };
          } else {
            draft[s.id] = {
              status: null, // Por defecto sin marcar
              excuseReason: '',
              notes: '',
              minutesAttended: null,
            };
          }
        }

        if (isMounted) {
          setAttendances(draft);
          setSaveSuccess(false);
          setErrorMsg(null);
        }
      } catch (e) {
        console.error('Error loading workshop attendance:', e);
      }
    };

    loadWorkshopData();
    return () => {
      isMounted = false;
    };
  }, [currentWorkshop?.id, students]);

  // Contadores en vivo
  const counters = useMemo(() => {
    let present = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;
    let unassigned = 0;

    for (const s of students) {
      const item = attendances[s.id];
      if (!item || item.status === null) {
        unassigned++;
      } else if (item.status === 'present') {
        present++;
      } else if (item.status === 'late') {
        late++;
      } else if (item.status === 'excused') {
        excused++;
      } else if (item.status === 'absent') {
        absent++;
      }
    }

    const total = students.length;
    const evaluated = total - unassigned;
    const points = present * 1.0 + late * 0.8 + excused * 1.0;
    const avgPct = evaluated > 0 ? Math.round((points / evaluated) * 100) : 0;

    return { present, late, excused, absent, unassigned, total, evaluated, avgPct };
  }, [students, attendances]);

  // Filtrado de alumnos en el listado
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.institution && s.institution.toLowerCase().includes(q)) ||
        (s.residency_year && s.residency_year.toLowerCase().includes(q))
    );
  }, [students, search]);

  // Cambiar estatus de un alumno
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendances((prev) => {
      const current = prev[studentId] || {
        status: null,
        excuseReason: '',
        notes: '',
        minutesAttended: null,
      };

      // Si ya tenía ese estatus, desmarcar
      if (current.status === status) {
        return {
          ...prev,
          [studentId]: { ...current, status: null },
        };
      }

      return {
        ...prev,
        [studentId]: {
          ...current,
          status,
          // Si es justificada y no tiene razón previa, abrir prompt
          excuseReason:
            status === 'excused' && !current.excuseReason
              ? COMMON_EXCUSE_REASONS[0]
              : current.excuseReason,
        },
      };
    });

    if (status === 'excused') {
      setActiveExcuseStudentId(studentId);
    } else if (activeExcuseStudentId === studentId) {
      setActiveExcuseStudentId(null);
    }
  };

  // Acciones masivas
  const handleBulkMarkPresent = () => {
    if (
      !window.confirm(
        '¿Deseas marcar a todos los médicos cursistas de la cohorte como PRESENTES?'
      )
    ) {
      return;
    }
    setAttendances((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = {
          ...(next[s.id] || { excuseReason: '', notes: '', minutesAttended: null }),
          status: 'present',
        };
      }
      return next;
    });
  };

  const handleBulkFillAbsent = () => {
    setAttendances((prev) => {
      const next = { ...prev };
      let filled = 0;
      for (const s of students) {
        if (!next[s.id] || next[s.id].status === null) {
          next[s.id] = {
            ...(next[s.id] || { excuseReason: '', notes: '', minutesAttended: null }),
            status: 'absent',
          };
          filled++;
        }
      }
      if (filled === 0) {
        alert('Todos los cursistas ya tienen un estatus asignado.');
      }
      return next;
    });
  };

  const handleResetRollCall = () => {
    if (!window.confirm('¿Reiniciar todo el pase de lista de esta sesión a "Sin marcar"?')) {
      return;
    }
    setAttendances(() => {
      const next: Record<string, StudentAttendanceDraft> = {};
      for (const s of students) {
        next[s.id] = {
          status: null,
          excuseReason: '',
          notes: '',
          minutesAttended: null,
        };
      }
      return next;
    });
  };

  // Guardar pase de lista
  const handleSave = async (closeSession = false) => {
    if (!currentWorkshop) return;
    setErrorMsg(null);
    setSaving(true);

    try {
      const recordsToSave: ClassAttendanceRecord[] = [];
      const sessionDate = currentWorkshop.scheduled_at
        ? currentWorkshop.scheduled_at.split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Verificar que justificadas tengan nota
      for (const s of students) {
        const item = attendances[s.id];
        if (item && item.status) {
          if (item.status === 'excused' && !item.excuseReason && !item.notes) {
            setErrorMsg(
              `El alumno ${s.display_name} está marcado con falta Justificada pero no tiene motivo ni nota asignada.`
            );
            setSaving(false);
            return;
          }

          recordsToSave.push({
            id: `att_${s.id}_${currentWorkshop.id}`,
            workshop_id: currentWorkshop.id,
            student_id: s.id,
            session_title: currentWorkshop.title,
            session_date: sessionDate,
            status: item.status,
            session_modality: normalizeSessionModality(currentWorkshop.session_modality),
            minutes_attended: item.minutesAttended,
            notes: item.notes || null,
            excuse_reason: item.excuseReason || null,
            recorded_by: user?.id || null,
            created_at: new Date().toISOString(),
          });
        }
      }

      await saveCohortAttendanceBatch(recordsToSave);

      if (closeSession || currentWorkshop.attendance_closed) {
        await setWorkshopAttendanceClosed(currentWorkshop.id, closeSession);
      }

      setSaveSuccess(true);
      onSaved();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : 'Error al guardar el pase de lista.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentWorkshop) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-slate-400 font-semibold">No hay talleres disponibles para pase de lista.</p>
      </div>
    );
  }

  const isClosed = !!currentWorkshop.attendance_closed;

  return (
    <div className="space-y-5">
      {/* Selector y Ficha del Taller */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                Sesión Activa
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  currentWorkshop.session_modality === 'in_person'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                }`}
              >
                {currentWorkshop.session_modality === 'in_person' ? 'Presencial' : 'En línea (Zoom)'}
              </span>
              {isClosed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  <Lock className="w-3 h-3" /> Lista Cerrada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                  <Unlock className="w-3 h-3" /> En Captura
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={currentWorkshop.id}
                onChange={(e) => onSelectWorkshop(e.target.value)}
                className="font-black text-lg md:text-xl text-slate-900 dark:text-white bg-transparent border-0 p-0 focus:ring-0 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                {workshops.map((w) => (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-sm">
                    {w.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentWorkshop.scheduled_at
                  ? new Date(currentWorkshop.scheduled_at).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Fecha por definir'}
              </span>
              {currentWorkshop.stream_url && (
                <a
                  href={currentWorkshop.stream_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Video className="w-3.5 h-3.5" /> Enlace de transmisión
                </a>
              )}
            </div>
          </div>

          {/* Botones de acción superior */}
          <div className="flex items-center gap-2 flex-wrap">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Volver
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Asentar Lista'}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(!isClosed)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 ${
                isClosed
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isClosed ? 'Reabrir Lista' : 'Asentar y Cerrar'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pase de lista guardado con éxito. Las métricas del Kardex se han sincronizado.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Cockpit Toolbar: Métricas en vivo y Bulk Actions */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Cohorte</p>
          <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{counters.total}</p>
          <p className="text-[10px] text-slate-500 mt-1">{counters.evaluated} evaluados</p>
        </div>

        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/50">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
            Presentes (100%)
          </p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {counters.present}
          </p>
          <p className="text-[10px] text-emerald-600/80 mt-1">Valor pleno</p>
        </div>

        <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/50">
          <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
            Retardos (80%)
          </p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{counters.late}</p>
          <p className="text-[10px] text-amber-600/80 mt-1">Penalización 20%</p>
        </div>

        <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 dark:border-blue-900/50">
          <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
            Justificadas
          </p>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">
            {counters.excused}
          </p>
          <p className="text-[10px] text-blue-600/80 mt-1">Con aval oficial</p>
        </div>

        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/60 dark:border-rose-900/50">
          <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Faltas (0%)</p>
          <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{counters.absent}</p>
          <p className="text-[10px] text-rose-600/80 mt-1">Sin valor</p>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Sin Marcar</p>
          <p
            className={`text-xl font-black mt-0.5 ${
              counters.unassigned > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
            }`}
          >
            {counters.unassigned}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {counters.unassigned === 0 ? 'Pase completo' : 'Incompleto'}
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda y Acciones Masivas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por médico o sede hospitalaria..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBulkMarkPresent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Todos Presentes
          </button>

          <button
            type="button"
            onClick={handleBulkFillAbsent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            Restantes como Falta
          </button>

          <button
            type="button"
            onClick={handleResetRollCall}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium transition cursor-pointer"
            title="Limpiar marcas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Listado de Médicos Cursistas */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No se encontraron cursistas con el criterio de búsqueda.
          </div>
        ) : (
          filteredStudents.map((student) => {
            const draft = attendances[student.id] || {
              status: null,
              excuseReason: '',
              notes: '',
              minutesAttended: null,
            };
            const isExcusedExpanded = activeExcuseStudentId === student.id;

            return (
              <div
                key={student.id}
                className="p-4 flex flex-col gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Info Alumno */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {student.display_name}
                      </p>
                      {draft.status === null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-400">
                          Sin marcar
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{student.email}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {student.institution || 'Sede no especificada'}
                      </span>
                      {student.residency_year && (
                        <>
                          <span>·</span>
                          <span>{student.residency_year}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* 4 Botones de Pase de Lista */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Presente */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'present')}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        draft.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Presente</span>
                    </button>

                    {/* Retardo */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'late')}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        draft.status === 'late'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Retardo</span>
                    </button>

                    {/* Justificada */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'excused')}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        draft.status === 'excused'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Justificada</span>
                    </button>

                    {/* Falta */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'absent')}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        draft.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Falta</span>
                    </button>
                  </div>
                </div>

                {/* Panel desplegable obligatorio para Falta Justificada */}
                {(draft.status === 'excused' || isExcusedExpanded) && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2 mt-1 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        Motivo Oficial de Justificación (Requerido para aval de diplomado)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                          Causa Tipificada
                        </label>
                        <select
                          value={draft.excuseReason || COMMON_EXCUSE_REASONS[0]}
                          onChange={(e) =>
                            setAttendances((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                excuseReason: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-medium"
                        >
                          {COMMON_EXCUSE_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                          Notas / Oficio de Respaldo
                        </label>
                        <input
                          type="text"
                          value={draft.notes}
                          onChange={(e) =>
                            setAttendances((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                notes: e.target.value,
                              },
                            }))
                          }
                          placeholder="No. de oficio, turno de guardia o detalles..."
                          className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Sticky Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl">
        <div className="text-xs text-slate-500">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {counters.evaluated} de {counters.total} cursistas asentados
          </span>
          {counters.unassigned > 0 && (
            <span className="text-amber-600 dark:text-amber-400 ml-2">
              ({counters.unassigned} pendientes de marcar)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Asentar Asistencia'}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(!isClosed)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 ${
              isClosed
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{isClosed ? 'Reabrir Lista' : 'Asentar y Cerrar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
