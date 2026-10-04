import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, ClipboardList, Pencil, UserCheck, Video, X, BookOpen } from 'lucide-react';
import type { CalendarItem } from '../../../types/academicCalendar';
import { calendarItemStartDate } from '../../../utils/academicCalendar';
import { calendarChipStyle, calendarEventColor, calendarTypeLabel, useCalendarColorLabels } from '../../../utils/calendarColorLabels';
import { listWorkshopInstructorNames } from '../../../services/topicTeachingService';
import { AssignmentMaterialsList } from '../../student/AssignmentMaterialsList';
import { allModules } from '../../../content/modules';

export function CalendarEventInspector({
  item,
  onClose,
  onEditSession,
  onTakeAttendance,
  onAssignAnother,
  onEditMilestone,
}: {
  item: CalendarItem | null;
  onClose: () => void;
  onEditSession: () => void;
  onTakeAttendance: () => void;
  onAssignAnother: () => void;
  onEditMilestone: () => void;
}) {
  const { labels } = useCalendarColorLabels();
  const closeRef = useRef<HTMLButtonElement>(null);
  const itemId = item?.id;
  const workshopId = item?.workshopId ?? null;
  const [instructorNames, setInstructorNames] = useState<string[]>([]);

  const topicTitle = useMemo(() => {
    if (!item?.topicId) return null;
    for (const m of allModules) {
      for (const t of m.topics) {
        if (t.id === item.topicId) return t.title;
        if (t.children) {
          const found = t.children.find((c) => c.id === item.topicId);
          if (found) return found.title;
        }
      }
    }
    return item.topicId;
  }, [item?.topicId]);

  useEffect(() => {
    if (!workshopId) {
      setInstructorNames([]);
      return;
    }
    let cancelled = false;
    void listWorkshopInstructorNames(workshopId)
      .then((names) => {
        if (!cancelled) setInstructorNames(names);
      })
      .catch(() => {
        if (!cancelled) setInstructorNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  useEffect(() => {
    if (!itemId) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [itemId, onClose]);

  if (!item) return null;

  const start = calendarItemStartDate(item.startsAt, item.allDay);
  const end = item.endsAt ? calendarItemStartDate(item.endsAt, item.allDay) : null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50"
        aria-label="Cerrar detalle del evento"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-title"
        className="fixed inset-x-3 bottom-3 z-50 max-h-[min(80vh,40rem)] overflow-y-auto p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-4 xl:inset-auto xl:top-24 xl:right-6 xl:bottom-6 xl:w-[400px]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold border"
              style={calendarChipStyle(calendarEventColor(item.type, labels))}
            >
              {calendarTypeLabel(item.type, labels)}
            </span>
            <h2 id="calendar-event-title" className="text-sm font-black text-slate-900 dark:text-white mt-2 leading-snug">
              {item.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            aria-label="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {item.description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">{item.description}</p>
        ) : null}
        <AssignmentMaterialsList materials={item.materials} />

        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Fecha</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
              {item.allDay
                ? start.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                : start.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {end && item.allDay && end.toDateString() !== start.toDateString()
                ? ` – ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : null}
              {end && !item.allDay ? ` – ${end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : null}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Rubro</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-200">
              {item.rubricKey}
              {item.countsForKardex ? '' : ' · no cuenta'}
            </dd>
          </div>
          {item.studentCount > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Alumnos</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200">
                {item.studentCount} · {item.submittedCount} entregas · {item.pendingCount} pendientes
              </dd>
            </div>
          ) : null}
          {item.topicCount != null ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Temas del corte</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200">{item.topicCount}</dd>
            </div>
          ) : null}
          {item.passingGrade != null ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Mínimo del corte</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200">{item.passingGrade} pts</dd>
            </div>
          ) : null}
          {item.modality ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Modalidad</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200">
                {item.modality === 'online' ? 'En línea' : 'Presencial'}
              </dd>
            </div>
          ) : null}
          {topicTitle ? (
            <div className="flex justify-between gap-3 items-center">
              <dt className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Tema asignado</span>
              </dt>
              <dd className="font-semibold text-indigo-600 dark:text-indigo-400 text-right truncate max-w-[200px]" title={topicTitle}>
                {topicTitle}
              </dd>
            </div>
          ) : null}
          {instructorNames.length > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Profesores</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                {instructorNames.join(', ')}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {item.type === 'session' ? (
            <>
              <button
                type="button"
                onClick={onEditSession}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar clase / grabación
              </button>
              <button
                type="button"
                onClick={onTakeAttendance}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Pase de lista
              </button>
              <Link
                to="/admin/talleres"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300"
              >
                <Video className="w-3.5 h-3.5" />
                Ver talleres
              </Link>
            </>
          ) : null}

          {item.assignmentIds.length > 0 ? (
            <>
              <Link
                to="/admin/alumnos/tareas"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Ver entregas
              </Link>
              <button
                type="button"
                onClick={onAssignAnother}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <Activity className="w-3.5 h-3.5" />
                Asignar otro
              </button>
            </>
          ) : null}

          {item.type === 'milestone' ? (
            <button
              type="button"
              onClick={onEditMilestone}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold"
            >
              <Calendar className="w-3.5 h-3.5" />
              Editar corte y checklist
            </button>
          ) : null}

          <Link
            to="/admin/alumnos"
            className="block text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600"
          >
            Abrir libro de calificaciones
          </Link>
        </div>
      </section>
    </div>
  );
}
