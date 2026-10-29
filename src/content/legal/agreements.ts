import {
  LEGAL_PARTY,
  PARTY_KEYS,
  PARTY_PLACEHOLDERS,
  type LegalParty,
} from './party';

export const STUDENT_AGREEMENT_BUNDLE_VERSION = '1.0';

export const STUDENT_AGREEMENT_TYPES = ['contrato', 'reglamento', 'normas'] as const;

export type StudentAgreementType = (typeof STUDENT_AGREEMENT_TYPES)[number];

export interface AgreementSection {
  title: string;
  content: string;
}

export interface ParsedAgreement {
  type: string;
  title: string;
  version: string;
  sections: AgreementSection[];
  checkboxText: string;
}

export const STUDENT_AGREEMENT_META: Record<
  StudentAgreementType,
  { title: string; stepLabel: string; fileName: string; includesPrivacy: boolean }
> = {
  contrato: {
    title: 'Contrato de prestación de servicios educativos',
    stepLabel: 'Contrato',
    fileName: 'contrato-prestacion-servicios-educativos.md',
    includesPrivacy: true,
  },
  reglamento: {
    title: 'Reglamento académico',
    stepLabel: 'Reglamento',
    fileName: 'reglamento-academico.md',
    includesPrivacy: false,
  },
  normas: {
    title: 'Normas de práctica, bioseguridad y confidencialidad',
    stepLabel: 'Normas clínicas',
    fileName: 'normas-practica-confidencialidad.md',
    includesPrivacy: false,
  },
};

export function isPartyComplete(party: LegalParty = LEGAL_PARTY): boolean {
  return PARTY_KEYS.every((key) => party[key].trim().length > 0);
}

export function fillPartyPlaceholders(markdown: string, party: LegalParty = LEGAL_PARTY): string {
  let filled = markdown;
  for (const key of PARTY_KEYS) {
    filled = filled.split(PARTY_PLACEHOLDERS[key]).join(party[key].trim());
  }
  return filled;
}

export function hasUnresolvedPartyPlaceholders(markdown: string): boolean {
  return PARTY_KEYS.some((key) => markdown.includes(PARTY_PLACEHOLDERS[key]));
}

const CHECKBOX_HEADING = 'Texto de la casilla de aceptación';

export function parseAgreementMarkdown(
  type: string,
  markdown: string,
  fallbackTitle = ''
): ParsedAgreement {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const titleMatch = normalized.match(/^#\s+(.+)$/m);
  const versionMatch = normalized.match(/^Versión\s+(.+)$/m);
  const parts = normalized.split(/^## /m).slice(1);

  const sections: AgreementSection[] = [];
  let checkboxText = '';

  for (const part of parts) {
    const newline = part.indexOf('\n');
    const heading = (newline === -1 ? part : part.slice(0, newline)).trim();
    const body = (newline === -1 ? '' : part.slice(newline + 1)).trim();
    if (heading === CHECKBOX_HEADING) {
      checkboxText = body;
      continue;
    }
    sections.push({ title: heading, content: body });
  }

  const studentTitle = STUDENT_AGREEMENT_META[type as StudentAgreementType]?.title;

  return {
    type,
    title: titleMatch?.[1]?.trim() || studentTitle || fallbackTitle,
    version: versionMatch?.[1]?.trim() || STUDENT_AGREEMENT_BUNDLE_VERSION,
    sections,
    checkboxText,
  };
}

export function mergePrivacyNotice(contract: ParsedAgreement, privacyMarkdown: string): ParsedAgreement {
  const privacy = parseAgreementMarkdown('contrato', privacyMarkdown);
  return {
    ...contract,
    sections: [
      ...contract.sections,
      {
        title: 'Aviso de privacidad',
        content: `El alumno acepta el aviso de privacidad versión ${contract.version}, que forma parte de este contrato.`,
      },
      ...privacy.sections,
    ],
  };
}

export function nextBundleVersion(current: string | null | undefined): string {
  if (!current || !/^\d+\.\d+$/.test(current)) return '1.0';
  const [major, minor] = current.split('.').map(Number);
  return `${major}.${minor + 1}`;
}

export interface AgreementEditionTexts {
  bundleVersion: string;
  party: LegalParty;
  contrato: string;
  reglamento: string;
  normas: string;
  aviso: string;
}

export function documentsFromEdition(
  edition: AgreementEditionTexts
): Record<StudentAgreementType, ParsedAgreement> {
  const built = {} as Record<StudentAgreementType, ParsedAgreement>;
  for (const type of STUDENT_AGREEMENT_TYPES) {
    const filled = fillPartyPlaceholders(edition[type], edition.party);
    const parsed = { ...parseAgreementMarkdown(type, filled), version: edition.bundleVersion };
    built[type] =
      type === 'contrato'
        ? mergePrivacyNotice(parsed, fillPartyPlaceholders(edition.aviso, edition.party))
        : parsed;
  }
  return built;
}

export function validateEditionForPublish(edition: Omit<AgreementEditionTexts, 'bundleVersion'>): string | null {
  if (!isPartyComplete(edition.party)) {
    return 'Completa razón social, RFC, domicilio, correos y ciudad.';
  }
  for (const type of STUDENT_AGREEMENT_TYPES) {
    const filled = fillPartyPlaceholders(edition[type], edition.party);
    if (hasUnresolvedPartyPlaceholders(filled)) {
      return `Quedó un corchete sin sustituir en ${STUDENT_AGREEMENT_META[type].stepLabel}.`;
    }
    const parsed = parseAgreementMarkdown(type, filled);
    if (parsed.sections.length === 0) {
      return `${STUDENT_AGREEMENT_META[type].stepLabel} no tiene secciones. Usa títulos ##.`;
    }
    if (!parsed.checkboxText.trim()) {
      return `${STUDENT_AGREEMENT_META[type].stepLabel} necesita la sección "${CHECKBOX_HEADING}".`;
    }
  }
  const aviso = fillPartyPlaceholders(edition.aviso, edition.party);
  if (!aviso.trim()) return 'Falta el aviso de privacidad.';
  if (hasUnresolvedPartyPlaceholders(aviso)) return 'Quedó un corchete sin sustituir en el aviso de privacidad.';
  return null;
}

export function isBundleComplete(
  signedTypes: readonly string[],
  signedVersion: string | null | undefined,
  currentVersion = STUDENT_AGREEMENT_BUNDLE_VERSION,
  requiredTypes: readonly StudentAgreementType[] = STUDENT_AGREEMENT_TYPES
): boolean {
  if (signedVersion !== currentVersion) return false;
  return requiredTypes.every((type) => signedTypes.includes(type));
}

export function shouldRedirectToAgreements(input: {
  isStaff: boolean;
  isPendingOrRejected: boolean;
  isApprovedStudent: boolean;
  bundleVersion: string | null | undefined;
  partyComplete: boolean;
  currentVersion?: string;
}): boolean {
  if (!input.partyComplete) return false;
  if (input.isStaff) return false;
  if (input.isPendingOrRejected) return false;
  if (!input.isApprovedStudent) return false;
  return input.bundleVersion !== (input.currentVersion ?? STUDENT_AGREEMENT_BUNDLE_VERSION);
}

export function agreementTypeLabel(type: StudentAgreementType): string {
  return STUDENT_AGREEMENT_META[type].title;
}

export function folioPrefix(type: StudentAgreementType): string {
  if (type === 'contrato') return 'CON';
  if (type === 'reglamento') return 'REG';
  return 'NOR';
}
