import { describe, expect, it } from 'vitest';
import {
  fillPartyPlaceholders,
  hasUnresolvedPartyPlaceholders,
  isBundleComplete,
  isPartyComplete,
  nextBundleVersion,
  parseAgreementMarkdown,
  shouldRedirectToAgreements,
  STUDENT_AGREEMENT_BUNDLE_VERSION,
  validateEditionForPublish,
} from './agreements';
import type { LegalParty } from './party';
import { PARTY_PLACEHOLDERS } from './party';

const completeParty: LegalParty = {
  legalName: 'Acme Salud S.A. de C.V.',
  rfc: 'ACM010101AAA',
  address: 'Calle 1, Mérida',
  privacyEmail: 'privacidad@example.com',
  academicEmail: 'academia@example.com',
  city: 'Mérida',
};

const emptyParty: LegalParty = {
  legalName: '',
  rfc: '',
  address: '',
  privacyEmail: '',
  academicEmail: '',
  city: '',
};

const sampleMarkdown = `# Contrato

Versión 1.0

## Partes

El prestador es ${PARTY_PLACEHOLDERS.legalName}, RFC ${PARTY_PLACEHOLDERS.rfc}.

## Texto de la casilla de aceptación

Acepto el contrato.
`;

describe('legal party placeholders', () => {
  it('is incomplete until every field has a value', () => {
    expect(isPartyComplete(emptyParty)).toBe(false);
    expect(isPartyComplete(completeParty)).toBe(true);
    expect(isPartyComplete({ ...completeParty, city: '  ' })).toBe(false);
  });

  it('replaces every institutional bracket', () => {
    const filled = fillPartyPlaceholders(sampleMarkdown, completeParty);
    expect(hasUnresolvedPartyPlaceholders(filled)).toBe(false);
    expect(filled).toContain('Acme Salud S.A. de C.V.');
    expect(filled).toContain('ACM010101AAA');
    expect(hasUnresolvedPartyPlaceholders(sampleMarkdown)).toBe(true);
  });
});

describe('parseAgreementMarkdown', () => {
  it('keeps the checkbox text apart from the body', () => {
    const parsed = parseAgreementMarkdown('contrato', fillPartyPlaceholders(sampleMarkdown, completeParty));
    expect(parsed.title).toBe('Contrato');
    expect(parsed.version).toBe('1.0');
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].title).toBe('Partes');
    expect(parsed.checkboxText).toBe('Acepto el contrato.');
  });
});

describe('isBundleComplete', () => {
  it('needs the three current types and the current version', () => {
    expect(isBundleComplete(['contrato', 'reglamento', 'normas'], '1.0')).toBe(true);
    expect(isBundleComplete(['contrato', 'reglamento'], '1.0')).toBe(false);
    expect(isBundleComplete(['contrato', 'reglamento', 'normas'], '0.9')).toBe(false);
    expect(isBundleComplete(['contrato', 'reglamento', 'normas'], STUDENT_AGREEMENT_BUNDLE_VERSION)).toBe(true);
  });
});

describe('shouldRedirectToAgreements', () => {
  const base = {
    isStaff: false,
    isPendingOrRejected: false,
    isApprovedStudent: true,
    bundleVersion: null as string | null,
    partyComplete: true,
  };

  it('does not gate staff', () => {
    expect(shouldRedirectToAgreements({ ...base, isStaff: true })).toBe(false);
  });

  it('does not gate pending or rejected accounts', () => {
    expect(shouldRedirectToAgreements({ ...base, isPendingOrRejected: true })).toBe(false);
  });

  it('gates an admitted student who has not signed', () => {
    expect(shouldRedirectToAgreements(base)).toBe(true);
  });

  it('gates an admitted student on an old bundle version', () => {
    expect(shouldRedirectToAgreements({ ...base, bundleVersion: '0.9' })).toBe(true);
  });

  it('lets through an admitted student on the current version', () => {
    expect(shouldRedirectToAgreements({ ...base, bundleVersion: '1.0' })).toBe(false);
  });

  it('does not gate when the institutional party is incomplete', () => {
    expect(shouldRedirectToAgreements({ ...base, partyComplete: false })).toBe(false);
  });

  it('uses a published version different from the default', () => {
    expect(shouldRedirectToAgreements({ ...base, bundleVersion: '1.0', currentVersion: '1.1' })).toBe(true);
    expect(shouldRedirectToAgreements({ ...base, bundleVersion: '1.1', currentVersion: '1.1' })).toBe(false);
  });
});

describe('agreement editions', () => {
  it('starts at 1.0 and then bumps the minor version', () => {
    expect(nextBundleVersion(null)).toBe('1.0');
    expect(nextBundleVersion('1.0')).toBe('1.1');
    expect(nextBundleVersion('borrador')).toBe('1.0');
  });

  it('refuses to publish without the acceptance checkbox', () => {
    const problem = validateEditionForPublish({
      party: completeParty,
      contrato: '# Contrato\n\n## Partes\n\nTexto.',
      reglamento: sampleMarkdown,
      normas: sampleMarkdown,
      aviso: '# Aviso\n\n## Datos\n\nTexto.',
    });
    expect(problem).toMatch(/Contrato/);
  });
});
