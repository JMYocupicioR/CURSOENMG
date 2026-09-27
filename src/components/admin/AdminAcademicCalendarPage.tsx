import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { CalendarBoard } from './calendar/CalendarBoard';
import { CalendarCreateMenu, type CalendarCreateAction } from './calendar/CalendarCreateMenu';
import { CalendarEventInspector } from './calendar/CalendarEventInspector';
import { CalendarRubricRail } from './calendar/CalendarRubricRail';
import AssignExamModal from './AssignExamModal';
import AssignHomeworkModal from './AssignHomeworkModal';
import { AssignClinicalCaseModal } from './AssignClinicalCaseModal';
import { CreateLiveClassModal } from './CreateLiveClassModal';
import AcademicScheduleManagerModal from './AcademicScheduleManagerModal';
import GradebookConfigModal from './GradebookConfigModal';
import AttendanceTrackerModal from './AttendanceTrackerModal';
import { loadAcademicCalendarFeed } from '../../services/academicCalendarService';
import { getAdminProfiles } from '../../services/editorialService';
import { filterGradeableStudents } from '../../utils/adminUtils';
import {
  calendarTypesForFilter,
  defaultCalendarBoardView,
  filterItemsByTypes,
  localDateTimeInputValue,
  writeCalendarBoardView,
} from '../../utils/academicCalendar';
import { useAuth } from '../../contexts/AuthProvider';
import type { CalendarBoardView, CalendarItem, CalendarItemType, CalendarRubricSnapshot } from '../../types/academicCalendar';
import type { AdminProfileRow } from '../../types/admin';
import type { LiveWorkshop } from '../../types/database';

export default function AdminAcademicCalendarPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [rubric, setRubric] = useState<CalendarRubricSnapshot | null>(null);
  const [workshops, setWorkshops] = useState<LiveWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarBoardView>(() =>
    defaultCalendarBoardView({
      storage: typeof localStorage === 'undefined' ? null : localStorage,
      narrowViewport: typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
    })
  );
  const [anchor, setAnchor] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<CalendarItemType | 'all'>('all');
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [createDay, setCreateDay] = useState<Date | null>(null);

  const [showExam, setShowExam] = useState(false);
  const [showHomework, setShowHomework] = useState(false);
  const [showCase, setShowCase] = useState(false);
  const [showClass, setShowClass] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showRubrics, setShowRubrics] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<LiveWorkshop | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [feedWarnings, setFeedWarnings] = useState<string[]>([]);
  const [reloadError, setReloadError] = useState<string | null>(null);

  const loadFeed = async (): Promise<{ ok: boolean; warnings: string[] }> => {
    setLoading(true);
    setReloadError(null);
    try {
      const people = filterGradeableStudents(await getAdminProfiles(false, 'all').catch(() => []), user?.id);
      setProfiles(people);
      const feed = await loadAcademicCalendarFeed(people);
      setItems(feed.items);
      setRubric(feed.rubric);
      setWorkshops(feed.workshops);
      setFeedWarnings(feed.warnings);
      setSelected((current) => (current ? feed.items.find((item) => item.id === current.id) ?? current : null));
      return { ok: feed.warnings.length === 0, warnings: feed.warnings };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el calendario.';
      setReloadError(message);
      return { ok: false, warnings: [message] };
    } finally {
      setLoading(false);
    }
  };

  const refreshAfterWrite = async (kind: 'talleres' | 'tareas' | 'cortes'): Promise<boolean> => {
    const result = await loadFeed();
    const kindFailed = result.warnings.some((warning) => warning.toLowerCase().includes(kind));
    if (!result.ok || kindFailed) {
      setReloadError((current) => current ?? 'El cambio se guardó, pero el tablero no se pudo recargar por completo.');
      return false;
    }
    return true;
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  const handleViewChange = useCallback((next: CalendarBoardView) => {
    setView(next);
    writeCalendarBoardView(next, typeof localStorage === 'undefined' ? null : localStorage);
  }, []);

  const closeInspector = useCallback(() => setSelected(null), []);
  const closeCreate = useCallback(() => setCreateDay(null), []);

  const visibleItems = useMemo(
    () => filterItemsByTypes(items, calendarTypesForFilter(typeFilter)),
    [items, typeFilter]
  );

  const openCreate = (action: CalendarCreateAction) => {
    if (!createDay) return;
    const dateValue =
      action === 'session' ? localDateTimeInputValue(createDay, 19, 0) : localDateTimeInputValue(createDay, 23, 59);
    setPrefillDate(dateValue);
    setCreateDay(null);
    if (action === 'session') {
      setEditingWorkshop(null);
      setShowClass(true);
    }
    if (action === 'exam') setShowExam(true);
    if (action === 'practical_task') setShowHomework(true);
    if (action === 'clinical_case') setShowCase(true);
    if (action === 'milestone') setShowMilestone(true);
  };

  const selectedWorkshop = selected?.workshopId
    ? workshops.find((workshop) => workshop.id === selected.workshopId) ?? null
    : null;

  return (
    <AdminLayout fullBleed title="Calendario académico">
      {(reloadError || feedWarnings.length > 0) && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 text-xs flex flex-wrap items-start justify-between gap-3"
        >
          <div className="space-y-1.5 min-w-0">
            <p className="font-bold inline-flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              El calendario no pudo cargar todos los eventos
            </p>
            {reloadError ? <p>{reloadError}</p> : null}
            {feedWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadFeed()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400 dark:border-amber-700 bg-white/70 dark:bg-amber-950/50 text-xs font-bold hover:bg-white dark:hover:bg-amber-900/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reintentar
          </button>
        </div>
      )}

      <div className="space-y-4">
        <CalendarRubricRail rubric={rubric} onEdit={() => setShowRubrics(true)} />
        <CalendarBoard
          view={view}
          onViewChange={handleViewChange}
          anchor={anchor}
          onAnchorChange={setAnchor}
          items={visibleItems}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          selectedId={selected?.id}
          onSelectItem={setSelected}
          onSelectDay={(day) => {
            setSelected(null);
            setCreateDay(day);
          }}
          itemCount={items.length}
          loading={loading}
          onRefresh={() => void loadFeed()}
        />
      </div>

      <CalendarEventInspector
        item={selected}
        onClose={closeInspector}
        onEditSession={() => {
          setEditingWorkshop(selectedWorkshop);
          setPrefillDate(undefined);
          setShowClass(true);
        }}
        onTakeAttendance={() => setShowAttendance(true)}
        onAssignAnother={() => {
          if (!selected) return;
          setPrefillDate(localDateTimeInputValue(new Date(selected.startsAt), 23, 59));
          if (selected.type === 'exam') setShowExam(true);
          else if (selected.type === 'practical_task' || selected.type === 'reading' || selected.type === 'emg_report') {
            setShowHomework(true);
          } else setShowCase(true);
        }}
        onEditMilestone={() => setShowMilestone(true)}
      />

      {createDay ? (
        <CalendarCreateMenu
          dateLabel={createDay.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          onSelect={openCreate}
          onClose={closeCreate}
        />
      ) : null}

      <CreateLiveClassModal
        isOpen={showClass}
        onClose={() => {
          setShowClass(false);
          setEditingWorkshop(null);
        }}
        initialWorkshop={editingWorkshop}
        initialScheduledAt={editingWorkshop ? undefined : prefillDate}
        onSuccess={async () => {
          const ok = await refreshAfterWrite('talleres');
          if (ok) {
            setShowClass(false);
            setEditingWorkshop(null);
          }
          return ok;
        }}
      />
      <AssignExamModal
        isOpen={showExam}
        onClose={() => setShowExam(false)}
        profiles={profiles}
        initialDueDate={prefillDate}
        onAssigned={() => refreshAfterWrite('tareas')}
      />
      <AssignHomeworkModal
        isOpen={showHomework}
        onClose={() => setShowHomework(false)}
        profiles={profiles}
        initialDueDate={prefillDate}
        onAssigned={() => refreshAfterWrite('tareas')}
      />
      <AssignClinicalCaseModal
        isOpen={showCase}
        onClose={() => setShowCase(false)}
        profiles={profiles}
        initialDueDate={prefillDate}
        onAssigned={() => refreshAfterWrite('tareas')}
      />
      <AcademicScheduleManagerModal
        isOpen={showMilestone}
        onClose={() => setShowMilestone(false)}
        profiles={profiles}
        onUpdated={() => {
          void refreshAfterWrite('cortes');
        }}
      />
      <GradebookConfigModal
        isOpen={showRubrics}
        onClose={() => setShowRubrics(false)}
        onSaved={() => {
          void loadFeed();
        }}
      />
      <AttendanceTrackerModal
        isOpen={showAttendance}
        onClose={() => setShowAttendance(false)}
        profiles={profiles}
        initialWorkshopId={selected?.workshopId ?? undefined}
        onSaved={() => {
          setShowAttendance(false);
          void loadFeed();
        }}
      />
    </AdminLayout>
  );
}
