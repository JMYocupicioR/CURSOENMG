import { supabase } from '../lib/supabase';
import {
  documentsFromEdition,
  nextBundleVersion,
  validateEditionForPublish,
  type AgreementEditionTexts,
} from '../content/legal/agreements';
import { partyFromRecord, type LegalParty } from '../content/legal/party';
import { AGREEMENT_SOURCE_MARKDOWN } from '../content/legal/studentDocuments';
import type { StudentAgreementEdition } from '../types/database';

export interface AgreementEditorModel {
  party: LegalParty;
  contrato: string;
  reglamento: string;
  normas: string;
  aviso: string;
  draftVersion: string | null;
  publishedVersion: string | null;
  publishedAt: string | null;
}

function emptyParty(): LegalParty {
  return { legalName: '', rfc: '', address: '', privacyEmail: '', academicEmail: '', city: '' };
}

function fromRow(row: StudentAgreementEdition): Pick<AgreementEditorModel, 'party' | 'contrato' | 'reglamento' | 'normas' | 'aviso'> {
  return {
    party: partyFromRecord(row.party),
    contrato: row.contrato_markdown,
    reglamento: row.reglamento_markdown,
    normas: row.normas_markdown,
    aviso: row.aviso_markdown,
  };
}

function seedModel(): AgreementEditorModel {
  return {
    party: emptyParty(),
    contrato: AGREEMENT_SOURCE_MARKDOWN.contrato,
    reglamento: AGREEMENT_SOURCE_MARKDOWN.reglamento,
    normas: AGREEMENT_SOURCE_MARKDOWN.normas,
    aviso: AGREEMENT_SOURCE_MARKDOWN.aviso,
    draftVersion: null,
    publishedVersion: null,
    publishedAt: null,
  };
}

export async function fetchPublishedAgreementMeta(): Promise<{
  version: string | null;
  partyComplete: boolean;
}> {
  const edition = await fetchPublishedEdition();
  if (!edition) return { version: null, partyComplete: false };
  return {
    version: edition.bundleVersion,
    partyComplete: validateEditionForPublish(edition) === null,
  };
}

export async function fetchPublishedEdition(): Promise<AgreementEditionTexts | null> {
  const { data, error } = await supabase
    .from('student_agreement_editions')
    .select('*')
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  const row = data as StudentAgreementEdition;
  return {
    bundleVersion: row.bundle_version,
    ...fromRow(row),
  };
}

export async function fetchAgreementEditor(): Promise<AgreementEditorModel> {
  const { data, error } = await supabase.from('student_agreement_editions').select('*');
  if (error || !data || data.length === 0) return seedModel();
  const rows = data as StudentAgreementEdition[];
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
  model: Omit<AgreementEditorModel, 'draftVersion' | 'publishedVersion' | 'publishedAt'>,
  userId: string
) {
  const payload = {
    status,
    bundle_version: version,
    party: model.party,
    contrato_markdown: model.contrato,
    reglamento_markdown: model.reglamento,
    normas_markdown: model.normas,
    aviso_markdown: model.aviso,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  const { data: existing } = await supabase
    .from('student_agreement_editions')
    .select('id')
    .eq('status', status)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from('student_agreement_editions').update(payload).eq('id', existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('student_agreement_editions').insert(payload);
  if (error) throw error;
}

export async function saveAgreementDraft(
  model: Omit<AgreementEditorModel, 'draftVersion' | 'publishedVersion' | 'publishedAt'>,
  userId: string,
  currentDraftVersion: string | null
): Promise<void> {
  await upsertStatus('draft', currentDraftVersion ?? 'borrador', model, userId);
}

export async function publishAgreementEdition(
  model: Omit<AgreementEditorModel, 'draftVersion' | 'publishedVersion' | 'publishedAt'>,
  userId: string,
  currentPublishedVersion: string | null
): Promise<string> {
  const problem = validateEditionForPublish(model);
  if (problem) throw new Error(problem);
  const version = nextBundleVersion(currentPublishedVersion);
  await upsertStatus('published', version, model, userId);
  return version;
}

export function previewDocuments(model: AgreementEditorModel) {
  return documentsFromEdition({
    bundleVersion: model.publishedVersion ?? 'borrador',
    party: model.party,
    contrato: model.contrato,
    reglamento: model.reglamento,
    normas: model.normas,
    aviso: model.aviso,
  });
}
