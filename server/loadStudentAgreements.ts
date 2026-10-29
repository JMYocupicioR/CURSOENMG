import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fillPartyPlaceholders,
  mergePrivacyNotice,
  parseAgreementMarkdown,
  STUDENT_AGREEMENT_META,
  type ParsedAgreement,
  type StudentAgreementType,
} from '../src/content/legal/agreements';
import { LEGAL_PARTY, type LegalParty } from '../src/content/legal/party';

const FILE_NAMES: Record<StudentAgreementType | 'aviso', string> = {
  contrato: STUDENT_AGREEMENT_META.contrato.fileName,
  reglamento: STUDENT_AGREEMENT_META.reglamento.fileName,
  normas: STUDENT_AGREEMENT_META.normas.fileName,
  aviso: 'aviso-de-privacidad.md',
};

function candidateDirs(): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(process.cwd(), 'docs', 'legal', 'alumnos'),
    join(here, '..', 'docs', 'legal', 'alumnos'),
    join(here, '../../docs/legal/alumnos'),
  ];
}

function readMarkdown(fileName: string): string {
  const errors: string[] = [];
  for (const dir of candidateDirs()) {
    try {
      return readFileSync(join(dir, fileName), 'utf8');
    } catch (error) {
      errors.push(`${join(dir, fileName)}: ${error instanceof Error ? error.message : 'error'}`);
    }
  }
  throw new Error(`No se encontró ${fileName}. ${errors.join(' | ')}`);
}

export function loadStudentAgreementDocument(
  type: StudentAgreementType,
  party: LegalParty = LEGAL_PARTY
): ParsedAgreement {
  const filled = fillPartyPlaceholders(readMarkdown(FILE_NAMES[type]), party);
  const parsed = parseAgreementMarkdown(type, filled);
  if (type !== 'contrato') return parsed;
  return mergePrivacyNotice(parsed, fillPartyPlaceholders(readMarkdown(FILE_NAMES.aviso), party));
}
