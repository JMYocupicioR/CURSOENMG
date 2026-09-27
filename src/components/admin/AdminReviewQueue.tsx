import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, MessageSquare, ExternalLink, User, Filter } from 'lucide-react';
import { allModules } from '../../content/modules';
import { AdminLayout } from './AdminLayout';
import {
  getPendingRevisions,
  getRevisionsByStatus,
  getRevisionById,
  getPublishedTopic,
  getPublishedQuizForTopic,
  reviewRevision,
  getProfilesByIds,
} from '../../services/editorialService';
import { findTopicInTree, findTopicPathInTree, topicToRevisionPayload } from '../../services/contentMerge';
import { getReferencesForTopic } from '../../content/topicReferences';
import type { ContentRevision, RevisionPayload, RevisionStatus } from '../../types/database';
import { MediaPreview } from '../editorial/MediaPreview';
import { RevisionDiff } from './RevisionDiff';
import { QuizRevisionDiff } from './QuizRevisionDiff';
import {
  getModuleLabel,
  getTopicPublicUrl,
  REVISION_STATUS_LABELS,
} from '../../utils/adminUtils';
import { ClinicalQuizValidationPanel } from './ClinicalQuizValidationPanel';

type QueueTab = 'pending' | 'history' | 'clinical';

async function resolveCurrentPayload(rev: ContentRevision): Promise<RevisionPayload | null> {
  if (rev.payload.revisionType === 'quiz') {
    const topicId = rev.target_topic_id ?? rev.payload.quizTopicId;
    if (!topicId) return null;
    const published = await getPublishedQuizForTopic(topicId);
    if (!published) return null;
    return {
      revisionType: 'quiz',
      title: published.quiz.title ?? 'Evaluación',
      quizTopicId: topicId,
      passScore: published.quiz.pass_score,
      maxAttempts: published.quiz.max_attempts,
      shuffleQuestions: published.quiz.shuffle_questions,
      shuffleOptions: published.quiz.shuffle_options,
      questions: published.questions.map((q) => ({
        id: q.id,
        sortOrder: q.sort_order,
        type: q.type,
        stem: q.stem,
        stemEn: q.stem_en ?? undefined,
        imageUrl: q.image_url ?? undefined,
        imageAlt: q.image_alt ?? undefined,
        options: q.options as import('../../types/quiz').QuizOption[],
        explanation: q.explanation ?? undefined,
        explanationEn: q.explanation_en ?? undefined,
        difficulty: q.difficulty ?? undefined,
      })),
    };
  }

  const topicId = rev.target_topic_id ?? rev.payload.id;
  if (!topicId) return null;

  const mod = allModules.find((m) => m.id === rev.module_id);
  const path = mod ? findTopicPathInTree(mod.topics, topicId) : null;
  const inheritedReferences = getReferencesForTopic(rev.module_id, topicId, path ? path.slice(0, -1) : []);

  const published = await getPublishedTopic(topicId);
  if (published) {
    return {
      id: published.id,
      title: published.title,
      titleEn: published.title_en ?? undefined,
      description: published.description ?? undefined,
      content: published.content ?? undefined,
      videoUrls: published.media?.videoUrls ?? [],
      youtubeUrls: published.media?.youtubeUrls ?? [],
      vimeoUrls: published.media?.vimeoUrls ?? [],
      embedUrls: published.media?.embedUrls ?? [],
      imageUrls: published.media?.imageUrls ?? [],
      clinicalPearls: published.clinical_pearls ?? [],
      keyPoints: published.key_points ?? [],
      references: published.media?.references?.length ? published.media.references : inheritedReferences,
    };
  }

  const staticTopic = mod ? findTopicInTree(mod.topics, topicId) : null;
  if (!staticTopic) return null;
  const payload = topicToRevisionPayload(staticTopic);
  if (!payload.references?.length) payload.references = inheritedReferences;
  return payload;
}

export default function AdminReviewQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as QueueTab) || 'pending';
  const [queueTab, setQueueTab] = useState<QueueTab>(initialTab);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentRevision | null>(null);
  const [currentPayload, setCurrentPayload] = useState<RevisionPayload | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState<'all' | 'create' | 'update'>('all');
  const [confirmApprove, setConfirmApprove] = useState(false);

  const load = async () => {
    if (queueTab === 'clinical') {
      setRevisions([]);
      return;
    }
    const data =
      queueTab === 'pending'
        ? await getPendingRevisions()
        : await getRevisionsByStatus(['approved', 'rejected', 'changes_requested']);
    setRevisions(data);
    const profiles = await getProfilesByIds(data.map((r) => r.author_id));
    const names = new Map<string, string>();
    profiles.forEach((p, id) => names.set(id, p.display_name));
    setAuthorNames(names);
  };

  useEffect(() => {
    load().catch(console.error);
    setSelectedId(null);
  }, [queueTab]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setCurrentPayload(null);
      setConfirmApprove(false);
      return;
    }
    getRevisionById(selectedId).then(async (rev) => {
      setSelected(rev);
      setNotes('');
      setConfirmApprove(false);
      if (rev && (rev.action === 'update' || rev.target_topic_id || rev.payload.revisionType === 'quiz')) {
        setCurrentPayload(await resolveCurrentPayload(rev));
      } else {
        setCurrentPayload(null);
      }
    });
  }, [selectedId]);

  const filtered = useMemo(() => {
    return revisions.filter((r) => {
      if (filterModule && r.module_id !== filterModule) return false;
      if (filterAction !== 'all' && r.action !== filterAction) return false;
      return true;
    });
  }, [revisions, filterModule, filterAction]);

  const isQuiz = selected?.payload.revisionType === 'quiz';
  const showDiff = useMemo(
    () =>
      selected &&
      (isQuiz ||
        (currentPayload && (selected.action === 'update' || selected.target_topic_id))),
    [selected, currentPayload, isQuiz]
  );

  const topicUrl = selected
    ? getTopicPublicUrl(selected.module_id, selected.target_topic_id ?? selected.payload.id)
    : null;

  const handleReview = async (status: 'approved' | 'rejected' | 'changes_requested') => {
    if (!selectedId) return;
    if (status === 'approved' && !confirmApprove) {
      setConfirmApprove(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await reviewRevision(selectedId, status, notes || undefined);
      setSelectedId(null);
      setConfirmApprove(false);
      await load();
    } catch (e: any) {
      setError(e?.message || (typeof e === 'string' ? e : 'Error al procesar la revisión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Cola de revisión">
      <div className="flex flex-wrap gap-2 mb-4">
        {(['pending', 'history', 'clinical'] as QueueTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setQueueTab(t);
              setSearchParams(t === 'pending' ? {} : { tab: t });
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              queueTab === t
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
            }`}
          >
            {t === 'pending' ? 'Pendientes' : t === 'history' ? 'Historial' : 'Validación clínica'}
          </button>
        ))}
      </div>

      {queueTab === 'clinical' && <ClinicalQuizValidationPanel />}

      {queueTab !== 'clinical' && (
      <>
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
        >
          <option value="">Todos los módulos</option>
          {allModules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.number}. {m.title}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value as typeof filterAction)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
        >
          <option value="all">Nuevo y edición</option>
          <option value="create">Solo nuevo</option>
          <option value="update">Solo edición</option>
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,320px)_1fr]">
        <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 && (
            <li className="text-sm text-slate-500 py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              {queueTab === 'pending'
                ? 'No hay propuestas pendientes.'
                : 'No hay revisiones en el historial.'}
            </li>
          )}
          {filtered.map((rev) => (
            <li key={rev.id}>
              <button
                type="button"
                onClick={() => setSelectedId(rev.id)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedId === rev.id
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="font-medium line-clamp-2">
                  {rev.payload.revisionType === 'quiz' ? '📝 ' : ''}{rev.payload.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">{getModuleLabel(rev.module_id)}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {authorNames.get(rev.author_id) ?? 'Colaborador'}
                  {' · '}
                  {rev.action === 'update' ? 'Edición' : 'Nuevo'}
                </p>
                {queueTab === 'history' && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700">
                    {REVISION_STATUS_LABELS[rev.status as RevisionStatus]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">{selected.payload.title}</h2>
                <p className="text-sm text-slate-500">{getModuleLabel(selected.module_id)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Por {authorNames.get(selected.author_id) ?? 'Colaborador'}
                  {selected.submitted_at &&
                    ` · ${new Date(selected.submitted_at).toLocaleString('es-MX')}`}
                </p>
              </div>
              {topicUrl && queueTab === 'pending' && (
                <Link
                  to={topicUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-blue-600 border border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver tema
                </Link>
              )}
            </div>

            {showDiff && isQuiz ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-3">
                  Comparación del cuestionario
                </h3>
                <QuizRevisionDiff current={currentPayload} proposed={selected.payload} />
              </div>
            ) : showDiff && currentPayload ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-3">
                  Comparación con versión actual
                </h3>
                <RevisionDiff current={currentPayload} proposed={selected.payload} />
              </div>
            ) : (
              !isQuiz &&
              selected.payload.content && (
                <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40">
                  {selected.payload.content}
                </div>
              )
            )}

            {!isQuiz && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-2">Vista previa multimedia</h3>
                <MediaPreview payload={selected.payload} />
              </div>
            )}

            {queueTab === 'pending' && (
              <>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas para el colaborador"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                {confirmApprove && (
                  <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg">
                    ¿Confirmas publicar esta propuesta? Pulsa de nuevo «Aprobar y publicar».
                  </p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleReview('approved')}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
                  >
                    <Check className="w-4 h-4" />
                    {confirmApprove ? 'Confirmar publicación' : 'Aprobar y publicar'}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setConfirmApprove(false);
                      handleReview('changes_requested');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm"
                  >
                    <MessageSquare className="w-4 h-4" /> Pedir cambios
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setConfirmApprove(false);
                      handleReview('rejected');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm"
                  >
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              </>
            )}

            {queueTab === 'history' && selected.review_notes && (
              <p className="text-sm text-slate-500 border-t pt-4">
                Notas: {selected.review_notes}
              </p>
            )}
          </div>
        ) : (
          <div className="hidden xl:flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 min-h-[300px] text-sm text-slate-400">
            Selecciona una propuesta para revisar
          </div>
        )}
      </div>
      </>
      )}
    </AdminLayout>
  );
}
