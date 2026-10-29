import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { agreementBodyPlain } from '../src/content/legal/agreementBody';
import type { ParsedAgreement } from '../src/content/legal/agreements';

export interface StampStudentAgreementInput {
  agreement: ParsedAgreement;
  signaturePng: Buffer;
  signerName: string;
  professionalLicense?: string | null;
  extraSignerLines?: string[];
  signedAtIso: string;
  ipAddress: string;
  userAgent: string;
  verificationFolio: string;
  appBaseUrl: string;
  verificationPath?: string;
}

function toWinAnsi(text: string): string {
  return text
    .replace(/[—–−]/g, '-')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, ' ');
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = toWinAnsi(text).replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawLines(
  page: PDFPage,
  lines: string[],
  opts: { x: number; y: number; font: PDFFont; size: number; color: ReturnType<typeof rgb>; gap: number }
): number {
  let y = opts.y;
  for (const line of lines) {
    if (line) {
      page.drawText(line, {
        x: opts.x,
        y,
        size: opts.size,
        font: opts.font,
        color: opts.color,
      });
    }
    y -= opts.gap;
  }
  return y;
}

export async function stampStudentAgreement(input: StampStudentAgreementInput): Promise<{
  pdf: Buffer;
  sha256: string;
}> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const ink = rgb(0.07, 0.09, 0.15);
  const muted = rgb(0.32, 0.36, 0.42);

  const addPage = () => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    return { page, y: pageHeight - 56 };
  };

  let { page, y } = addPage();

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      const next = addPage();
      page = next.page;
      y = next.y;
    }
  };

  page.drawText('ElectroDx Diplomado', {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.35, 0.72),
  });
  y -= 18;
  const titleLines = wrapText(input.agreement.title, bold, 14, maxWidth);
  y = drawLines(page, titleLines, { x: margin, y, font: bold, size: 14, color: ink, gap: 18 });
  y -= 4;
  page.drawText(`Versión ${input.agreement.version}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: muted,
  });
  y -= 22;

  for (const section of input.agreement.sections) {
    ensureSpace(48);
    const heading = wrapText(section.title, bold, 11, maxWidth);
    y = drawLines(page, heading, { x: margin, y, font: bold, size: 11, color: ink, gap: 14 });
    y -= 4;
    const body = wrapText(agreementBodyPlain(section.content), font, 9, maxWidth);
    for (const line of body) {
      ensureSpace(14);
      if (line) {
        page.drawText(line, { x: margin, y, size: 9, font, color: muted });
      }
      y -= 12;
    }
    y -= 8;
  }

  const signatureImage = await pdf.embedPng(input.signaturePng);
  const verifyPath = input.verificationPath || '/verificar-acuerdo';
  const verificationUrl = `${input.appBaseUrl.replace(/\/$/, '')}${verifyPath}?folio=${encodeURIComponent(input.verificationFolio)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 160 });
  const qrImage = await pdf.embedPng(Buffer.from(qrDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64'));

  ensureSpace(250);
  const boxX = 45;
  const boxY = Math.max(48, y - 230);
  const boxW = pageWidth - boxX * 2;
  const boxH = 220;

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.15, 0.35, 0.72),
    borderWidth: 1.2,
    color: rgb(0.97, 0.98, 1),
  });
  page.drawRectangle({
    x: boxX,
    y: boxY + boxH - 24,
    width: boxW,
    height: 24,
    color: rgb(0.15, 0.35, 0.72),
  });
  page.drawText('CONSTANCIA DE ACEPTACIÓN — FIRMA ELECTRÓNICA SIMPLE', {
    x: boxX + 10,
    y: boxY + boxH - 16,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
  });

  const sigW = 210;
  const sigH = 70;
  const scale = Math.min(sigW / signatureImage.width, sigH / signatureImage.height);
  page.drawImage(signatureImage, {
    x: boxX + 16,
    y: boxY + 88,
    width: signatureImage.width * scale,
    height: signatureImage.height * scale,
  });
  page.drawLine({
    start: { x: boxX + 16, y: boxY + 82 },
    end: { x: boxX + 230, y: boxY + 82 },
    thickness: 0.7,
    color: rgb(0.4, 0.4, 0.45),
  });
  page.drawText(toWinAnsi(input.signerName.toUpperCase()), {
    x: boxX + 16,
    y: boxY + 68,
    size: 9,
    font: bold,
    color: ink,
  });
  if (input.professionalLicense) {
    page.drawText(toWinAnsi(`Cedula: ${input.professionalLicense}`), {
      x: boxX + 16,
      y: boxY + 56,
      size: 8,
      font,
      color: muted,
    });
  }
  const extraLines = (input.extraSignerLines ?? []).filter((line) => line.trim());
  let extraY = input.professionalLicense ? boxY + 46 : boxY + 56;
  for (const line of extraLines.slice(0, 3)) {
    extraY -= 8;
    page.drawText(toWinAnsi(line), {
      x: boxX + 16,
      y: extraY,
      size: 7,
      font,
      color: muted,
    });
  }

  const disclaimer =
    'El firmante acepta este instrumento con una firma electrónica simple. Produce efectos entre las partes conforme a los artículos 89, 90, 93 y 97 del Código de Comercio. No es la e.firma ni una firma electrónica avanzada.';
  let discY = extraLines.length ? extraY - 10 : input.professionalLicense ? boxY + 42 : boxY + 54;
  for (const line of wrapText(disclaimer, italic, 6, 230)) {
    page.drawText(line, { x: boxX + 16, y: discY, size: 6, font: italic, color: muted });
    discY -= 8;
  }

  const qrSize = 58;
  page.drawImage(qrImage, {
    x: boxX + boxW - qrSize - 14,
    y: boxY + boxH - 26 - qrSize - 10,
    width: qrSize,
    height: qrSize,
  });

  const signedAt = new Date(input.signedAtIso);
  const cdmx = signedAt.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const meta: Array<[string, string]> = [
    ['Folio', input.verificationFolio],
    ['Fecha CDMX', `${cdmx} hrs`],
    ['UTC', signedAt.toISOString()],
    ['IP', input.ipAddress],
    ['Estado', 'Aceptado'],
    [
      'Navegador',
      input.userAgent.length > 42 ? `${input.userAgent.slice(0, 40)}…` : input.userAgent,
    ],
  ];
  let metaY = boxY + boxH - 42;
  for (const [label, value] of meta) {
    page.drawText(toWinAnsi(label), { x: boxX + 250, y: metaY, size: 7, font: bold, color: ink });
    page.drawText(toWinAnsi(value), { x: boxX + 318, y: metaY, size: 7, font, color: muted });
    metaY -= 12;
  }

  const pdfBytes = await pdf.save();
  const stamped = Buffer.from(pdfBytes);
  return {
    pdf: stamped,
    sha256: createHash('sha256').update(stamped).digest('hex'),
  };
}
