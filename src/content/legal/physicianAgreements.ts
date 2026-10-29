import {
  fillPartyPlaceholders,
  hasUnresolvedPartyPlaceholders,
  isPartyComplete,
  parseAgreementMarkdown,
  type ParsedAgreement,
} from './agreements';
import { isCeoEmail } from './ceo';
import { partyFromRecord, type LegalParty } from './party';

export const PHYSICIAN_AGREEMENT_TYPES = ['contrato', 'anexo', 'reglamento'] as const;

export type PhysicianAgreementType = (typeof PHYSICIAN_AGREEMENT_TYPES)[number];

export type PhysicianMarkedRole = 'profesor' | 'editor' | 'ambos';

export interface PhysicianParty extends LegalParty {
  settlementEmail: string;
}

export const PHYSICIAN_AGREEMENT_META: Record<
  PhysicianAgreementType,
  { title: string; stepLabel: string; includesPrivacy: boolean }
> = {
  contrato: {
    title: 'Contrato de prestación de servicios profesionales independientes',
    stepLabel: 'Contrato',
    includesPrivacy: true,
  },
  anexo: {
    title: 'Anexo de participación',
    stepLabel: 'Anexo',
    includesPrivacy: false,
  },
  reglamento: {
    title: 'Reglamento editorial y del libro',
    stepLabel: 'Reglamento',
    includesPrivacy: false,
  },
};

export const PHYSICIAN_SIGN_PLACEHOLDERS = {
  name: '[NOMBRE]',
  license: '[CÉDULA]',
  rfc: '[RFC DEL MÉDICO]',
  email: '[CORREO]',
  clabe: '[CLABE]',
  bank: '[BANCO]',
} as const;

const REQUIRED_GENERATION_PLACEHOLDERS = [
  '[NOMBRE DE LA GENERACIÓN]',
  '[IDENTIFICADOR DE LA EDICIÓN]',
  '[TASA DOCENCIA]',
  '[TASA OBRA]',
  '[TASA EDITORIAL]',
] as const;

const ROLE_LINES: Record<PhysicianMarkedRole, { empty: string; marked: string; label: string }> = {
  profesor: {
    empty: '- [ ] Profesor. Abre docencia. Cierra obra y labor editorial.',
    marked: '- [x] Profesor. Abre docencia. Cierra obra y labor editorial.',
    label: 'Profesor',
  },
  editor: {
    empty: '- [ ] Editor. Abre obra y labor editorial. Cierra docencia.',
    marked: '- [x] Editor. Abre obra y labor editorial. Cierra docencia.',
    label: 'Editor',
  },
  ambos: {
    empty: '- [ ] Profesor y editor. Abre las tres.',
    marked: '- [x] Profesor y editor. Abre las tres.',
    label: 'Profesor y editor',
  },
};

export const PHYSICIAN_ROLE_OPTIONS: { id: PhysicianMarkedRole; label: string }[] = [
  { id: 'profesor', label: ROLE_LINES.profesor.label },
  { id: 'editor', label: ROLE_LINES.editor.label },
  { id: 'ambos', label: ROLE_LINES.ambos.label },
];

export interface PhysicianSignerFields {
  fullName: string;
  license: string;
  email: string;
  rfc: string;
  clabe: string;
  bank: string;
  role: PhysicianMarkedRole;
}

export interface PhysicianEditionTexts {
  bundleVersion: string;
  party: PhysicianParty;
  contrato: string;
  anexo: string;
  reglamento: string;
  aviso: string;
}

const CHECKBOX_HEADING = 'Texto de la casilla de aceptación';

export function emptyPhysicianParty(): PhysicianParty {
  return {
    legalName: '',
    rfc: '',
    address: '',
    privacyEmail: '',
    academicEmail: '',
    city: '',
    settlementEmail: '',
  };
}

export function physicianPartyFromRecord(value: unknown): PhysicianParty {
  const base = partyFromRecord(value);
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    ...base,
    settlementEmail: typeof row.settlementEmail === 'string' ? row.settlementEmail : '',
  };
}

export function isPhysicianPartyComplete(party: PhysicianParty): boolean {
  return isPartyComplete(party) && party.settlementEmail.trim().length > 0;
}

export function fillPhysicianPartyPlaceholders(markdown: string, party: PhysicianParty): string {
  const filled = fillPartyPlaceholders(markdown, party);
  return filled.split('[CORREO DE LIQUIDACIONES]').join(party.settlementEmail.trim());
}

export function hasUnresolvedPhysicianPartyPlaceholders(markdown: string): boolean {
  if (hasUnresolvedPartyPlaceholders(markdown)) return true;
  return markdown.includes('[CORREO DE LIQUIDACIONES]');
}

export function markPhysicianRole(markdown: string, role: PhysicianMarkedRole): string {
  let filled = markdown;
  for (const option of Object.keys(ROLE_LINES) as PhysicianMarkedRole[]) {
    filled = filled.split(ROLE_LINES[option].empty).join(
      option === role ? ROLE_LINES[option].marked : ROLE_LINES[option].empty
    );
  }
  return filled;
}

export function fillPhysicianSignerFields(markdown: string, fields: PhysicianSignerFields): string {
  let filled = markdown;
  filled = filled.split(PHYSICIAN_SIGN_PLACEHOLDERS.name).join(fields.fullName.trim());
  filled = filled.split(PHYSICIAN_SIGN_PLACEHOLDERS.license).join(fields.license.trim() || '—');
  filled = filled.split(PHYSICIAN_SIGN_PLACEHOLDERS.rfc).join(fields.rfc.trim());
  filled = filled.split(PHYSICIAN_SIGN_PLACEHOLDERS.email).join(fields.email.trim());
  filled = filled.split(PHYSICIAN_SIGN_PLACEHOLDERS.clabe).join(fields.clabe.trim());
  filled = filled.split(PHYSICIAN_SIGN_PLACEHOLDERS.bank).join(fields.bank.trim());
  return markPhysicianRole(filled, fields.role);
}

export function physicianRoleLabel(role: PhysicianMarkedRole | null | undefined): string {
  if (!role) return '';
  return ROLE_LINES[role].label;
}

export function isPhysicianMarkedRole(value: string | null | undefined): value is PhysicianMarkedRole {
  return value === 'profesor' || value === 'editor' || value === 'ambos';
}

const CLABE_PATTERN = /^\d{18}$/;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

export function validatePhysicianAnnexFields(fields: Pick<PhysicianSignerFields, 'rfc' | 'clabe' | 'bank' | 'role'>): string | null {
  if (!RFC_PATTERN.test(fields.rfc.trim())) {
    return 'Escribe un RFC de 12 o 13 caracteres.';
  }
  if (!CLABE_PATTERN.test(fields.clabe.trim())) {
    return 'La CLABE debe tener 18 dígitos.';
  }
  if (fields.bank.trim().length < 3) {
    return 'Escribe el banco de la cuenta.';
  }
  if (!isPhysicianMarkedRole(fields.role)) {
    return 'Marca el papel: profesor, editor, o ambos.';
  }
  return null;
}

export function mergePhysicianPrivacyNotice(contract: ParsedAgreement, privacyMarkdown: string): ParsedAgreement {
  const privacy = parseAgreementMarkdown('aviso', privacyMarkdown, 'Aviso de privacidad');
  return {
    ...contract,
    sections: [
      ...contract.sections,
      {
        title: 'Aviso de privacidad',
        content: `El Médico acepta el aviso de privacidad versión ${contract.version}, que forma parte de este contrato.`,
      },
      ...privacy.sections,
    ],
  };
}

export function documentsFromPhysicianEdition(
  edition: PhysicianEditionTexts,
  signer?: PhysicianSignerFields
): Record<PhysicianAgreementType, ParsedAgreement> {
  const built = {} as Record<PhysicianAgreementType, ParsedAgreement>;
  for (const type of PHYSICIAN_AGREEMENT_TYPES) {
    let source = fillPhysicianPartyPlaceholders(edition[type], edition.party);
    if (type === 'anexo' && signer) {
      source = fillPhysicianSignerFields(source, signer);
    }
    const parsed = {
      ...parseAgreementMarkdown(type, source, PHYSICIAN_AGREEMENT_META[type].title),
      version: edition.bundleVersion,
    };
    built[type] =
      type === 'contrato'
        ? mergePhysicianPrivacyNotice(
            parsed,
            fillPhysicianPartyPlaceholders(edition.aviso, edition.party)
          )
        : parsed;
  }
  return built;
}

export function validatePhysicianEditionForPublish(
  edition: Omit<PhysicianEditionTexts, 'bundleVersion'>
): string | null {
  if (!isPhysicianPartyComplete(edition.party)) {
    return 'Completa razón social, RFC, domicilio, correos, ciudad y correo de liquidaciones.';
  }
  for (const type of PHYSICIAN_AGREEMENT_TYPES) {
    const filled = fillPhysicianPartyPlaceholders(edition[type], edition.party);
    if (hasUnresolvedPhysicianPartyPlaceholders(filled)) {
      return `Quedó un corchete del prestador sin sustituir en ${PHYSICIAN_AGREEMENT_META[type].stepLabel}.`;
    }
    if (type === 'anexo') {
      const missingRate = REQUIRED_GENERATION_PLACEHOLDERS.find((token) => filled.includes(token));
      if (missingRate) {
        return `Sustituye ${missingRate} en el anexo antes de publicar.`;
      }
    }
    const parsed = parseAgreementMarkdown(type, filled, PHYSICIAN_AGREEMENT_META[type].title);
    if (parsed.sections.length === 0) {
      return `${PHYSICIAN_AGREEMENT_META[type].stepLabel} no tiene secciones. Usa títulos ##.`;
    }
    if (!parsed.checkboxText.trim()) {
      return `${PHYSICIAN_AGREEMENT_META[type].stepLabel} necesita la sección "${CHECKBOX_HEADING}".`;
    }
  }
  const aviso = fillPhysicianPartyPlaceholders(edition.aviso, edition.party);
  if (!aviso.trim()) return 'Falta el aviso de privacidad.';
  if (hasUnresolvedPhysicianPartyPlaceholders(aviso)) {
    return 'Quedó un corchete sin sustituir en el aviso de privacidad.';
  }
  return null;
}

export function shouldRedirectToPhysicianAgreements(input: {
  email: string | null | undefined;
  isCollaborator: boolean;
  bundleVersion: string | null | undefined;
  partyComplete: boolean;
  currentVersion?: string | null;
}): boolean {
  if (!input.partyComplete) return false;
  if (isCeoEmail(input.email)) return false;
  if (!input.isCollaborator) return false;
  if (!input.currentVersion) return false;
  return input.bundleVersion !== input.currentVersion;
}

export function physicianAgreementTypeLabel(type: PhysicianAgreementType): string {
  return PHYSICIAN_AGREEMENT_META[type].title;
}

export function physicianFolioPrefix(type: PhysicianAgreementType): string {
  if (type === 'contrato') return 'CON';
  if (type === 'anexo') return 'ANX';
  return 'REG';
}
