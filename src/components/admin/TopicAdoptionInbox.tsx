import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, UserPlus, Users, X } from 'lucide-react';
import { allModules } from '../../content/modules';
import { useAuth } from '../../contexts/AuthProvider';
import { getSyllabusTopicOverrides } from '../../services/courseService';
import {
  DEFAULT_ACADEMIC_MILESTONES,
  getAcademicMilestones,
} from '../../services/academicScheduleService';
import {
  confirmTopicCommitment,
  listTopicTeachingCommitments,
  proposeTopicCommitments,
  withdrawTopicCommitment,
} from '../../services/topicTeachingService';
import type { AcademicMilestone } from '../../types/academicGradebook';
import type { SyllabusTopicOverride, TopicTeachingCommitment } from '../../types/database';
import {
  assignedCoverageNodes,
  buildTopicCoverage,
  collectAdoptTopicIds,
  nodesWithoutTeacher,
  type TopicCoverageNode,
} from '../../utils/topicCoverage';

function defaultLocalDatetime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const tzOffset = tomorrow.getTimezoneOffset() * 60000;
  return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
}

function teacherLabel(row: TopicTeachingCommitment): string {
  return row.teacher_name?.trim() || 'Profesor';
}

export function TopicAdoptionInbox({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const { user, isAdmin, isEditor } = useAuth();
  const canAdopt = isAdmin || isEditor;
  const userId = user?.id ?? null;

  const [overrides, setOverrides] = useState<SyllabusTopicOverride[]>([]);
  const [commitments, setCommitments] = useState<TopicTeachingCommitment[]>([]);
  const [milestones, setMilestones] = useState<AcademicMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [includeSubtree, setIncludeSubtree] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState<TopicTeachingCommitment | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overrideRows, commitmentRows, milestoneRows] = await Promise.all([
        getSyllabusTopicOverrides().catch(() => []),
        listTopicTeachingCommitments(),
        getAcademicMilestones().catch(() => []),
      ]);
      setOverrides(overrideRows);
      setCommitments(commitmentRows);
      setMilestones(milestoneRows.length ? milestoneRows : DEFAULT_ACADEMIC_MILESTONES);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los temas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const coverage = useMemo(
    () => buildTopicCoverage(allModules, overrides, commitments),
    [overrides, commitments]
  );
  const withoutTeacher = useMemo(() => nodesWithoutTeacher(coverage), [coverage]);
  const assigned = useMemo(() => assignedCoverageNodes(coverage), [coverage]);
  const proposals = useMemo(
    () => commitments.filter((row) => row.status === 'proposed'),
    [commitments]
  );
  const mine = useMemo(
    () => commitments.filter((row) => row.teacher_id === userId),
    [commitments, userId]
  );

  const unassignedByModule = useMemo(() => {
    const groups = new Map<string, TopicCoverageNode<TopicTeachingCommitment>[]>();
    for (const node of withoutTeacher) {
      const list = groups.get(node.moduleId) ?? [];
      list.push(node);
      groups.set(node.moduleId, list);
    }
    return allModules
      .map((mod) => ({
        moduleId: mod.id,
        moduleTitle: mod.title,
        nodes: groups.get(mod.id) ?? [],
      }))
      .filter((group) => group.nodes.length > 0);
  }, [withoutTeacher]);

  const titleForTopic = (topicId: string, moduleId: string) =>
    coverage.find((node) => node.topicId === topicId && node.moduleId === moduleId)?.topicTitle ||
    topicId;

  const hasMineOn = (topicId: string) =>
    commitments.some((row) => row.topic_id === topicId && row.teacher_id === userId);

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key);
    setError(null);
    try {
      await action();
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAdopt = (node: TopicCoverageNode<TopicTeachingCommitment>) => {
    const mod = allModules.find((item) => item.id === node.moduleId);
    if (!mod) return;
    const topicIds = collectAdoptTopicIds(
      mod.topics,
      node.topicId,
      node.moduleId,
      overrides,
      includeSubtree
    );
    if (!topicIds.length) {
      setError('Ese tema no está visible en el temario.');
      return;
    }
    void runAction(`adopt-${node.topicId}`, async () => {
      const rows = await proposeTopicCommitments(topicIds, node.moduleId);
      if (!rows.length) throw new Error('Ya tienes ese tema confirmado.');
    });
  };

  const handleJoin = (node: TopicCoverageNode<TopicTeachingCommitment>) => {
    void runAction(`join-${node.topicId}`, async () => {
      const rows = await proposeTopicCommitments([node.topicId], node.moduleId);
      if (!rows.length) throw new Error('Ya formas parte de ese tema.');
    });
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Temas sin profesor</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                withoutTeacher.length > 0
                  ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {withoutTeacher.length} libres
            </span>
          </h2>
        </div>
        {canAdopt ? (
          <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeSubtree}
              onChange={(event) => setIncludeSubtree(event.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Incluir subtemas visibles
          </label>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 text-xs text-rose-600 dark:text-rose-300">{error}</p>
      ) : null}

      {loading ? (
        <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Cargando cobertura del temario…
        </div>
      ) : (
        <div className="space-y-4">
          {unassignedByModule.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500">
              Todos los temas visibles tienen profesor confirmado.
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              {unassignedByModule.map((group) => {
                const open = openModules[group.moduleId] ?? false;
                return (
                  <div key={group.moduleId} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenModules((current) => ({ ...current, [group.moduleId]: !open }))
                      }
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <span className="truncate">
                        {group.moduleTitle}{' '}
                        <span className="font-semibold text-slate-400">· {group.nodes.length}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open ? (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {group.nodes.map((node) => (
                          <div
                            key={`${node.moduleId}-${node.topicId}`}
                            className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {node.depth > 0 ? `${'· '.repeat(node.depth)}` : ''}
                                {node.topicTitle}
                              </p>
                              {node.proposed.length > 0 ? (
                                <p className="text-[11px] text-amber-600 dark:text-amber-300 truncate">
                                  Propuesto: {node.proposed.map(teacherLabel).join(', ')}
                                </p>
                              ) : null}
                            </div>
                            {canAdopt && !hasMineOn(node.topicId) ? (
                              <button
                                type="button"
                                disabled={busyKey === `adopt-${node.topicId}`}
                                onClick={() => handleAdopt(node)}
                                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold disabled:opacity-60"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Adoptar
                              </button>
                            ) : hasMineOn(node.topicId) ? (
                              <span className="shrink-0 text-[11px] font-semibold text-slate-400">Propuesto</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Propuestas ({proposals.length})
            </h3>
            {proposals.length === 0 ? (
              <p className="text-xs text-slate-500">No hay propuestas pendientes de fecha.</p>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {proposals.map((row) => (
                  <div key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {titleForTopic(row.topic_id, row.module_id)}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{teacherLabel(row)}</p>
                    </div>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setConfirming(row)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {commitments.some(
                          (other) =>
                            other.topic_id === row.topic_id &&
                            other.status === 'confirmed' &&
                            other.workshop_id
                        )
                          ? 'Integrar'
                          : 'Confirmar'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Mis temas ({mine.length})
            </h3>
            {mine.length === 0 ? (
              <p className="text-xs text-slate-500">Aún no adoptaste un tema.</p>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {mine.map((row) => (
                  <div key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {titleForTopic(row.topic_id, row.module_id)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {row.status === 'confirmed' ? 'Confirmado' : 'Propuesto'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey === `withdraw-${row.id}`}
                      onClick={() =>
                        void runAction(`withdraw-${row.id}`, async () => {
                          await withdrawTopicCommitment(row.id);
                        })
                      }
                      className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-60"
                    >
                      Retirar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {assigned.length > 0 ? (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Con profesor ({assigned.length})
              </h3>
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {assigned.map((node) => (
                  <div
                    key={`${node.moduleId}-${node.topicId}`}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{node.topicTitle}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {node.confirmed.map(teacherLabel).join(', ')}
                        {node.coverage === 'shared' ? ' · compartido' : ''}
                      </p>
                    </div>
                    {canAdopt && !hasMineOn(node.topicId) ? (
                      <button
                        type="button"
                        disabled={busyKey === `join-${node.topicId}`}
                        onClick={() => handleJoin(node)}
                        className="shrink-0 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 disabled:opacity-60"
                      >
                        Integrarme
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {confirming ? (
        <ConfirmTopicModal
          commitment={confirming}
          topicTitle={titleForTopic(confirming.topic_id, confirming.module_id)}
          milestones={milestones}
          reuseWorkshop={commitments.some(
            (other) =>
              other.topic_id === confirming.topic_id &&
              other.status === 'confirmed' &&
              Boolean(other.workshop_id)
          )}
          busy={busyKey === `confirm-${confirming.id}`}
          onClose={() => setConfirming(null)}
          onConfirm={(values) =>
            void runAction(`confirm-${confirming.id}`, async () => {
              await confirmTopicCommitment({
                commitmentId: confirming.id,
                milestoneId: values.milestoneId,
                scheduledAt: values.scheduledAt,
                durationMinutes: values.durationMinutes,
                title: values.title,
              });
              setConfirming(null);
            })
          }
        />
      ) : null}
    </section>
  );
}

function ConfirmTopicModal({
  commitment,
  topicTitle,
  milestones,
  reuseWorkshop,
  busy,
  onClose,
  onConfirm,
}: {
  commitment: TopicTeachingCommitment;
  topicTitle: string;
  milestones: AcademicMilestone[];
  reuseWorkshop: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (values: {
    milestoneId: string;
    scheduledAt: string | null;
    durationMinutes: number;
    title: string;
  }) => void;
}) {
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id ?? '');
  const [scheduledAt, setScheduledAt] = useState(defaultLocalDatetime);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [title, setTitle] = useState(topicTitle);

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-topic-title"
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 max-w-md mx-auto p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {reuseWorkshop ? 'Integrar a la clase' : 'Confirmar tema'}
            </p>
            <h3 id="confirm-topic-title" className="text-sm font-black text-slate-900 dark:text-white">
              {topicTitle}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{teacherLabel(commitment)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {reuseWorkshop ? (
          <p className="text-xs text-slate-500">
            Ya hay una clase de este tema. El profesor se suma a esa sesión; no se crea otra.
          </p>
        ) : null}

        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Corte académico
          <select
            value={milestoneId}
            onChange={(event) => setMilestoneId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
          >
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </label>

        {!reuseWorkshop ? (
          <>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Fecha y hora de la clase
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Duración (minutos)
              <input
                type="number"
                min={15}
                max={480}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value) || 90)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Título de la clase
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </label>
          </>
        ) : null}

        <button
          type="button"
          disabled={busy || !milestoneId || (!reuseWorkshop && !scheduledAt)}
          onClick={() =>
            onConfirm({
              milestoneId,
              scheduledAt: reuseWorkshop ? null : new Date(scheduledAt).toISOString(),
              durationMinutes,
              title: title.trim() || topicTitle,
            })
          }
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-60"
        >
          {reuseWorkshop ? 'Sumar a la clase' : 'Confirmar y programar'}
        </button>
      </section>
    </div>
  );
}
