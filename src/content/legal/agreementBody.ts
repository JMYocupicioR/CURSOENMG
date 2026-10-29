export type AgreementBlock =
  | { type: 'heading'; level: 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

function isHeading(line: string): boolean {
  return /^#{2,4}\s+\S/.test(line.trim());
}

function isListItem(line: string): boolean {
  return /^[-*]\s+\S/.test(line.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|');
}

function stripCheckbox(text: string): string {
  return text.replace(/\[( |x|X)\]\s*/g, '').trim();
}

function stripBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

function parseTable(lines: string[]): AgreementBlock | null {
  const cells = lines
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => stripBold(stripCheckbox(cell)))
    )
    .filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, ''))));
  if (cells.length === 0) return null;
  const [headers, ...rows] = cells;
  return { type: 'table', headers, rows };
}

export function parseAgreementBody(source: string): AgreementBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: AgreementBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length >= 4 ? 4 : 3;
      blocks.push({ type: 'heading', level, text: stripBold(stripCheckbox(heading[2])) });
      index += 1;
      continue;
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const table = parseTable(tableLines);
      if (table) blocks.push(table);
      continue;
    }

    if (isListItem(line)) {
      const items: string[] = [];
      while (index < lines.length && isListItem(lines[index])) {
        items.push(stripCheckbox(lines[index].trim().replace(/^[-*]\s+/, '')));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isHeading(lines[index]) &&
      !isListItem(lines[index]) &&
      !isTableRow(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: stripCheckbox(paragraph.join(' ')) });
  }

  return blocks;
}

export function agreementBodyPlain(source: string): string {
  return parseAgreementBody(source)
    .map((block) => {
      if (block.type === 'heading' || block.type === 'paragraph') return block.text;
      if (block.type === 'list') return block.items.map((item) => `• ${item}`).join('\n');
      const header = block.headers.join(' | ');
      const rows = block.rows.map((row) => row.join(' | '));
      return [header, ...rows].join('\n');
    })
    .join('\n\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}
