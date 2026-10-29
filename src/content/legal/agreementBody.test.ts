import { describe, expect, it } from 'vitest';
import { agreementBodyPlain, parseAgreementBody } from './agreementBody';

const sample = `### 3. Admisión

La cuenta no equivale a la inscripción.

El Prestador se obliga a:

- Poner a disposición el temario.
- Registrar **asistencia**.

| Dato | Valor |
| --- | --- |
| Generación | G1 |
`;

describe('parseAgreementBody', () => {
  it('turns hashes, lists and tables into blocks without the markdown marks', () => {
    const blocks = parseAgreementBody(sample);
    expect(blocks[0]).toEqual({ type: 'heading', level: 3, text: '3. Admisión' });
    expect(blocks[1]).toEqual({
      type: 'paragraph',
      text: 'La cuenta no equivale a la inscripción.',
    });
    expect(blocks[3]).toEqual({
      type: 'list',
      items: ['Poner a disposición el temario.', 'Registrar **asistencia**.'],
    });
    expect(blocks[4]).toEqual({
      type: 'table',
      headers: ['Dato', 'Valor'],
      rows: [['Generación', 'G1']],
    });
    expect(agreementBodyPlain(sample)).not.toMatch(/#{2,}|^\| ---/m);
    expect(agreementBodyPlain(sample)).toContain('3. Admisión');
  });
});
