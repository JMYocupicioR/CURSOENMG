import { describe, expect, it } from 'vitest';
import {
  documentsFromPhysicianEdition,
  emptyPhysicianParty,
  fillPhysicianSignerFields,
  isPhysicianPartyComplete,
  shouldRedirectToPhysicianAgreements,
  validatePhysicianAnnexFields,
  validatePhysicianEditionForPublish,
  type PhysicianParty,
} from './physicianAgreements';
import { nextBundleVersion } from './agreements';

const completeParty: PhysicianParty = {
  legalName: 'Acme Salud S.A. de C.V.',
  rfc: 'ACM010101AAA',
  address: 'Calle 1, Mérida',
  privacyEmail: 'privacidad@example.com',
  academicEmail: 'academia@example.com',
  city: 'Mérida',
  settlementEmail: 'liquidaciones@example.com',
};

const sample = `# Contrato

Versión 1.0

## Partes

El prestador es [RAZÓN SOCIAL].

## Texto de la casilla de aceptación

Acepto.
`;

const anexo = `# Anexo

## Médico

Nombre [NOMBRE], RFC [RFC DEL MÉDICO], CLABE [CLABE], banco [BANCO].

Generación [NOMBRE DE LA GENERACIÓN], edición [IDENTIFICADOR DE LA EDICIÓN], tasas [TASA DOCENCIA] [TASA OBRA] [TASA EDITORIAL].

## Papel

- [ ] Profesor. Abre docencia. Cierra obra y labor editorial.
- [ ] Editor. Abre obra y labor editorial. Cierra docencia.
- [ ] Profesor y editor. Abre las tres.

## Texto de la casilla de aceptación

Confirmo el papel.
`;

describe('physician party', () => {
  it('needs the settlement email on top of the prestador fields', () => {
    expect(isPhysicianPartyComplete(emptyPhysicianParty())).toBe(false);
    expect(isPhysicianPartyComplete({ ...completeParty, settlementEmail: '' })).toBe(false);
    expect(isPhysicianPartyComplete(completeParty)).toBe(true);
  });
});

describe('anexo signer fields', () => {
  it('rejects a short RFC or a CLABE that is not 18 digits', () => {
    expect(
      validatePhysicianAnnexFields({ rfc: 'ABC', clabe: '123', bank: 'BBVA', role: 'profesor' })
    ).toMatch(/RFC/);
    expect(
      validatePhysicianAnnexFields({
        rfc: 'GOMA800101XXX',
        clabe: '123456789012345678',
        bank: 'BBVA',
        role: 'profesor',
      })
    ).toBeNull();
  });

  it('marks the chosen paper and fills RFC, CLABE and bank', () => {
    const filled = fillPhysicianSignerFields(anexo, {
      fullName: 'Dra. Ana López',
      license: '1234567',
      email: 'ana@example.com',
      rfc: 'LOAA800101XXX',
      clabe: '012345678901234567',
      bank: 'BBVA',
      role: 'editor',
    });
    expect(filled).toContain('Dra. Ana López');
    expect(filled).toContain('LOAA800101XXX');
    expect(filled).toContain('[x] Editor.');
    expect(filled).toContain('[ ] Profesor. Abre docencia');
  });
});

describe('shouldRedirectToPhysicianAgreements', () => {
  const base = {
    email: 'editor@example.com',
    isCollaborator: true,
    bundleVersion: null as string | null,
    partyComplete: true,
    currentVersion: '1.0',
  };

  it('does not gate the CEO account', () => {
    expect(shouldRedirectToPhysicianAgreements({ ...base, email: 'jmyocupicior@gmail.com' })).toBe(false);
    expect(shouldRedirectToPhysicianAgreements({ ...base, email: 'JMYOCUPICIOR@GMAIL.COM' })).toBe(false);
  });

  it('does not gate a student without collaborator role', () => {
    expect(shouldRedirectToPhysicianAgreements({ ...base, isCollaborator: false })).toBe(false);
  });

  it('does not gate until the CEO publishes a complete party', () => {
    expect(shouldRedirectToPhysicianAgreements({ ...base, partyComplete: false })).toBe(false);
  });

  it('gates a collaborator who has not signed the published version', () => {
    expect(shouldRedirectToPhysicianAgreements(base)).toBe(true);
    expect(shouldRedirectToPhysicianAgreements({ ...base, bundleVersion: '1.0' })).toBe(false);
    expect(shouldRedirectToPhysicianAgreements({ ...base, bundleVersion: '1.0', currentVersion: '1.1' })).toBe(true);
  });
});

describe('physician edition publish', () => {
  it('bumps 1.0 to 1.1', () => {
    expect(nextBundleVersion(null)).toBe('1.0');
    expect(nextBundleVersion('1.0')).toBe('1.1');
  });

  it('refuses to publish an anexo that still has generation rates in brackets', () => {
    const problem = validatePhysicianEditionForPublish({
      party: completeParty,
      contrato: sample,
      anexo,
      reglamento: sample,
      aviso: '# Aviso\n\n## Datos\n\nContacto [CORREO DE LIQUIDACIONES].',
    });
    expect(problem).toMatch(/NOMBRE DE LA GENERACIÓN|anexo/i);
  });

  it('builds the contract with the privacy notice folded in', () => {
    const docs = documentsFromPhysicianEdition({
      bundleVersion: '1.0',
      party: completeParty,
      contrato: sample,
      anexo: anexo
        .replace('[NOMBRE DE LA GENERACIÓN]', 'G1')
        .replace('[IDENTIFICADOR DE LA EDICIÓN]', 'E1')
        .replace('[TASA DOCENCIA]', '15')
        .replace('[TASA OBRA]', '15')
        .replace('[TASA EDITORIAL]', '5'),
      reglamento: sample,
      aviso: '# Aviso\n\n## Datos\n\nContacto [CORREO DE LIQUIDACIONES].',
    });
    expect(docs.contrato.sections.some((section) => section.title === 'Aviso de privacidad')).toBe(true);
    expect(docs.contrato.sections.some((section) => section.content.includes('liquidaciones@example.com'))).toBe(true);
  });
});
