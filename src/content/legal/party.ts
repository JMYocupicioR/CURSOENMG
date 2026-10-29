export interface LegalParty {
  legalName: string;
  rfc: string;
  address: string;
  privacyEmail: string;
  academicEmail: string;
  city: string;
}

/** Datos del prestador. Vacío a propósito: el candado no se activa hasta llenarlos. */
export const LEGAL_PARTY: LegalParty = {
  legalName: '',
  rfc: '',
  address: '',
  privacyEmail: '',
  academicEmail: '',
  city: '',
};

export const PARTY_PLACEHOLDERS: Record<keyof LegalParty, string> = {
  legalName: '[RAZÓN SOCIAL]',
  rfc: '[RFC]',
  address: '[DOMICILIO]',
  privacyEmail: '[CORREO DE PRIVACIDAD]',
  academicEmail: '[CORREO ACADÉMICO]',
  city: '[CIUDAD]',
};

export const PARTY_KEYS = Object.keys(PARTY_PLACEHOLDERS) as Array<keyof LegalParty>;

export function partyFromRecord(value: unknown): LegalParty {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    legalName: typeof row.legalName === 'string' ? row.legalName : '',
    rfc: typeof row.rfc === 'string' ? row.rfc : '',
    address: typeof row.address === 'string' ? row.address : '',
    privacyEmail: typeof row.privacyEmail === 'string' ? row.privacyEmail : '',
    academicEmail: typeof row.academicEmail === 'string' ? row.academicEmail : '',
    city: typeof row.city === 'string' ? row.city : '',
  };
}
