import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyLessonExpansions, findTopicInTree } from '../../services/contentMerge';
import { module01 } from '../../content/modules/module-01-fundamentals';
import { RichContent } from './RichContent';

const EXPANSION_SNIPPET = `La unidad motora es la unidad funcional básica del sistema neuromuscular.

## Objetivos
- Describir el fundamento fisiológico de composición: motoneurona + axón + unm + fibras musculares.
- Aplicar la técnica de registro o el razonamiento diagnóstico correspondiente en el laboratorio de EMG/NCS.

## Explicación clínica
Unidad motora = motoneurona α + axón + unión neuromuscular + fibras musculares.

## Técnica
1. Verifique temperatura cutánea (32–34 °C en mano/pie) y consentimiento.
2. Optimice impedancia (<5 kΩ) y orientación cátodo/ánodo.

## Bibliografía
- [AANEM practice guidelines](https://www.aanem.org/)
`;

function html(text: string, headingLevel?: 2 | 3 | 4 | 5) {
  return renderToStaticMarkup(<RichContent text={text} headingLevel={headingLevel} />);
}

describe('RichContent', () => {
  it('renders markdown headings instead of literal ##', () => {
    const markup = html(EXPANSION_SNIPPET);
    expect(markup).toContain('<h2');
    expect(markup).toContain('Objetivos');
    expect(markup).toContain('Explicación clínica');
    expect(markup).toContain('Técnica');
    expect(markup).not.toContain('## Objetivos');
    expect(markup).not.toContain('## Técnica');
  });

  it('keeps a heading and its following bullets as separate elements', () => {
    const markup = html(EXPANSION_SNIPPET);
    expect(markup).toMatch(/<h2[^>]*>Objetivos<\/h2>/);
    expect(markup).toContain('<ul');
    expect(markup).toContain('Describir el fundamento fisiológico');
    expect(markup).not.toMatch(/Objetivos\s*-\s*Describir/);
  });

  it('renders numbered lists as ordered lists', () => {
    const markup = html(EXPANSION_SNIPPET);
    expect(markup).toContain('<ol');
    expect(markup).toContain('Verifique temperatura cutánea');
    expect(markup).not.toMatch(/Técnica\s*1\.\s*Verifique/);
  });

  it('maps ## to a nested heading level when the topic already has an h2/h3', () => {
    const markup = html('## Objetivos\n- Item', 4);
    expect(markup).toContain('<h4');
    expect(markup).not.toContain('<h2');
  });

  it('still renders bold, links, tables and clinical values', () => {
    const markup = html(
      'Latencia **distal** de 3.2 ms.\n\n[Preston](https://example.com)\n\n| Nervio | Latencia |\n|---|---|\n| Mediano | 3.5 ms |',
    );
    expect(markup).toContain('<strong');
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain('<table');
    expect(markup).toContain('3.2 ms');
    expect(markup).toContain('3.5 ms');
  });

  it('splits an intro line from bullets in the same block', () => {
    const markup = html('**Relación diámetro-velocidad:**\n• 20 µm → ~120 m/s\n• 12 µm → ~70 m/s');
    expect(markup).toContain('<strong');
    expect(markup).toContain('<ul');
    expect(markup).toContain('20 µm');
    expect(markup).not.toMatch(/velocidad:<\/strong>\s*•/);
  });

  it('wraps a search query in mark tags without changing the lesson when empty', () => {
    const marked = renderToStaticMarkup(
      <RichContent text="La gran mayoría son neuropraxia con buen pronóstico." highlightQuery="neuropraxía" />,
    );
    expect(marked).toContain('data-search-hit');
    expect(marked).toContain('neuropraxia');

    const plain = html('La gran mayoría son neuropraxia con buen pronóstico.');
    expect(plain).not.toContain('data-search-hit');
  });

  it('prints without dark-mode utility classes', () => {
    const markup = renderToStaticMarkup(
      <RichContent
        text="Latencia **distal** de 3.2 ms.\n\n[Preston](https://example.com)"
        tone="print"
      />,
    );
    expect(markup).toContain('text-slate-800');
    expect(markup).not.toContain('dark:');
  });

  it('renders a real lesson expansion without leftover markdown hashes', () => {
    const expanded = applyLessonExpansions(module01);
    const topic = findTopicInTree(expanded.topics, 'motor-unit-composition');
    expect(topic?.content).toBeTruthy();
    const markup = html(topic!.content!, 4);
    expect(markup).toContain('<h4');
    expect(markup).toContain('Objetivos');
    expect(markup).toContain('<ol');
    expect(markup).not.toContain('## ');
  });
});
