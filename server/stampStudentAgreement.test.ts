import { describe, expect, it } from 'vitest';
import { stampStudentAgreement } from './stampStudentAgreement';

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('stampStudentAgreement', () => {
  it('builds a pdf with spanish punctuation without throwing', async () => {
    const { pdf, sha256 } = await stampStudentAgreement({
      agreement: {
        type: 'contrato',
        title: 'Contrato de prestación de servicios educativos',
        version: '1.0',
        checkboxText: 'Acepto',
        sections: [
          {
            title: 'Partes',
            content: 'El “Prestador” declara —según el artículo 89— que opera ElectroDx.',
          },
        ],
      },
      signaturePng: MIN_PNG,
      signerName: 'Dra. María Pérez',
      professionalLicense: '1234567',
      signedAtIso: '2026-10-29T12:00:00.000Z',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      verificationFolio: 'AGR-CON-TEST01',
      appBaseUrl: 'http://localhost:5173',
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
