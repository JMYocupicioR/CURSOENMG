import { supabase } from '../lib/supabase';
import { nextBundleVersion } from '../content/legal/agreements';
import {
  documentsFromPhysicianEdition,
  emptyPhysicianParty,
  physicianPartyFromRecord,
  validatePhysicianEditionForPublish,
  type PhysicianEditionTexts,
  type PhysicianParty,
} from '../content/legal/physicianAgreements';
import { PHYSICIAN_AGREEMENT_SOURCE_MARKDOWN } from '../content/legal/physicianDocuments';
import type { PhysicianAgreementEdition } from '../types/database';
import { agreementStoreError } from './agreementStoreError';

const EDITIONS_MIGRATION = '20261029050000_physician_agreements.sql';

export interface PhysicianAgreementEditorModel {
  party: PhysicianParty;
  contrato: string;
  anexo: string;
  reglamento: string;
  aviso: string;
  draftVersion: string | null;
  publishedVersion: string | null;
  publishedAt: string | null;
}

function fromRow(
  row: PhysicianAgreementEdition
): Pick<PhysicianAgreementEditorModel, 'party' | 'contrato' | 'anexo' | 'reglamento' | 'aviso'> {
  return {
    party: physicianPartyFromRecord(row.party),
    contrato: row.contrato_markdown,
    anexo: row.anexo_markdown,
    reglamento: row.reglamento_markdown,
    aviso: row.aviso_markdown,
  };
}

function seedModel(): PhysicianAgreementEditorModel {
  return {
    party: emptyPhysicianParty(),
    contrato: PHYSICIAN_AGREEMENT_SOURCE_MARKDOWN.contrato,
    anexo: PHYSICIAN_AGREEMENT_SOURCE_MARKDOWN.anexo,
    reglamento: PHYSICIAN_AGREEMENT_SOURCE_MARKDOWN.reglamento,
    aviso: PHYSICIAN_AGREEMENT_SOURCE_MARKDOWN.aviso,
    draftVersion: null,
    publishedVersion: null,
    publishedAt: null,
  };
}

export async function fetchPublishedPhysicianAgreementMeta(): Promise<{
  version: string | null;
  partyComplete: boolean;
}> {
  const edition = await fetchPublishedPhysicianEdition();
  if (!edition) return { version: null, partyComplete: false };
  return {
    version: edition.bundleVersion,
    partyComplete: validatePhysicianEditionForPublish(edition) === null,
  };
}

export async function fetchPublishedPhysicianEdition(): Promise<PhysicianEditionTexts | null> {
  const { data, error } = await supabase
    .from('physician_agreement_editions')
    .select('*')
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PhysicianAgreementEdition;
  return {
    bundleVersion: row.bundle_version,
    ...fromRow(row),
  };
}

export async function fetchPhysicianAgreementEditor(): Promise<PhysicianAgreementEditorModel> {
  const { data, error } = await supabase.from('physician_agreement_editions').select('*');
  if (error) throw agreementStoreError(error, 'No se pudo cargar el acuerdo.', EDITIONS_MIGRATION);
  if (!data || data.length === 0) return seedModel();
  const rows = data as PhysicianAgreementEdition[];
  const draft = rows.find((row) => row.status === 'draft');
  const published = rows.find((row) => row.status === 'published');
  const source = draft ?? published;
  if (!source) return seedModel();
  return {
    ...fromRow(source),
    draftVersion: draft?.bundle_version ?? null,
    publishedVersion: published?.bundle_version ?? null,
    publishedAt: published?.published_at ?? null,
  };
}

async function upsertStatus(
  status: 'draft' | 'published',
  version: string,
  model: Omit<PhysicianAgreementEditorModel, 'draftVersion' | 'publishedVersion' | 'publishedAt'>,
  userId: string
) {
  const payload = {
    status,
    bundle_version: version,
    party: model.party,
    contrato_markdown: model.contrato,
    anexo_markdown: model.anexo,
    reglamento_markdown: model.reglamento,
    aviso_markdown: model.aviso,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  const { data: existing, error: readError } = await supabase
    .from('physician_agreement_editions')
    .select('id')
    .eq('status', status)
    .maybeSingle();
  if (readError) throw agreementStoreError(readError, 'No se pudo guardar la edición.', EDITIONS_MIGRATION);
  if (existing?.id) {
    const { error } = await supabase
      .from('physician_agreement_editions')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw agreementStoreError(error, 'No se pudo guardar la edición.', EDITIONS_MIGRATION);
    return;
  }
  const { error } = await supabase.from('physician_agreement_editions').insert(payload);
  if (error) throw agreementStoreError(error, 'No se pudo guardar la edición.', EDITIONS_MIGRATION);
}

export async function savePhysicianAgreementDraft(
  model: Omit<PhysicianAgreementEditorModel, 'draftVersion' | 'publishedVersion' | 'publishedAt'>,
  userId: string,
  currentDraftVersion: string | null
): Promise<void> {
  await upsertStatus('draft', currentDraftVersion ?? 'borrador', model, userId);
}

export async function publishPhysicianAgreementEdition(
  model: Omit<PhysicianAgreementEditorModel, 'draftVersion' | 'publishedVersion' | 'publishedAt'>,
  userId: string,
  currentPublishedVersion: string | null
): Promise<string> {
  const problem = validatePhysicianEditionForPublish(model);
  if (problem) throw new Error(problem);
  const version = nextBundleVersion(currentPublishedVersion);
  await upsertStatus('published', version, model, userId);
  return version;
}

export function previewPhysicianDocuments(model: PhysicianAgreementEditorModel) {
  return documentsFromPhysicianEdition({
    bundleVersion: model.publishedVersion ?? 'borrador',
    party: model.party,
    contrato: model.contrato,
    anexo: model.anexo,
    reglamento: model.reglamento,
    aviso: model.aviso,
  });
}
