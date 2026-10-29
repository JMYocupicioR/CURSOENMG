import {
  fillPartyPlaceholders,
  mergePrivacyNotice,
  parseAgreementMarkdown,
  type ParsedAgreement,
  type StudentAgreementType,
} from './agreements';
import { LEGAL_PARTY } from './party';
import contratoMd from '../../../docs/legal/alumnos/contrato-prestacion-servicios-educativos.md?raw';
import reglamentoMd from '../../../docs/legal/alumnos/reglamento-academico.md?raw';
import normasMd from '../../../docs/legal/alumnos/normas-practica-confidencialidad.md?raw';
import avisoMd from '../../../docs/legal/alumnos/aviso-de-privacidad.md?raw';

export const AGREEMENT_SOURCE_MARKDOWN = {
  contrato: contratoMd,
  reglamento: reglamentoMd,
  normas: normasMd,
  aviso: avisoMd,
};

const RAW: Record<StudentAgreementType, string> = {
  contrato: contratoMd,
  reglamento: reglamentoMd,
  normas: normasMd,
};

export function getStudentAgreementDocument(
  type: StudentAgreementType,
  party = LEGAL_PARTY
): ParsedAgreement {
  const filled = fillPartyPlaceholders(RAW[type], party);
  const parsed = parseAgreementMarkdown(type, filled);
  if (type !== 'contrato') return parsed;
  return mergePrivacyNotice(parsed, fillPartyPlaceholders(avisoMd, party));
}
