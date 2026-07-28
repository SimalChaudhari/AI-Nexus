import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  BuildCertificatePdfInput,
  CERT_BRAND as BRAND,
  CERT_CONTACT,
  fontOrFallback,
  formatCompletedDate,
  registerCertificateFonts,
  resolveCertificateMarkPath,
} from './certificate-pdf-shared.util';
import { drawTranscriptPage } from './transcript-pdf.util';

export type {
  BuildCertificatePdfInput,
  CertificatePdfTranscriptModule,
  CertificatePdfTranscriptSection,
} from './certificate-pdf-shared.util';

/** Exact COA palette from CPDCOACert chinese sample */
const COA = {
  navy: '#1A4A82',
  navyDeep: '#0E3A6E',
  lightBlue: '#6FA0C8',
  midBlue: '#4A7EAF',
  gold: '#C5A24A',
  deco: '#C8C8C8',
  script: '#2A2A2A',
  line: '#1A4A82',
};

function resolveAsset(...parts: string[]): string | null {
  const path = join(process.cwd(), ...parts);
  return existsSync(path) ? path : null;
}

function resolveSignaturePath(): string | null {
  return (
    resolveAsset('public', 'certificate', 'signature.png') ||
    resolveAsset('public', 'uploads', 'certificate', 'signature.png')
  );
}

function registerCjkFont(doc: PDFKit.PDFDocument) {
  const candidates = [
    'C:/Windows/Fonts/simsunb.ttf',
    'C:/Windows/Fonts/msyh.ttc',
    'C:/Windows/Fonts/simsun.ttc',
    join(process.cwd(), 'assets', 'fonts', 'NotoSansSC-Regular.otf'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      doc.registerFont('CertCJK', path);
      return;
    } catch {
      // next
    }
  }
}

function hasCjk(text: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(text);
}

function drawDecorations(doc: PDFKit.PDFDocument) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const tl = resolveAsset('public', 'certificate', 'coa-deco-tl.png');
  const br = resolveAsset('public', 'certificate', 'coa-deco-br.png');

  if (tl) {
    try {
      doc.image(tl, 0, 0, { width: 170, height: 140 });
    } catch {
      // ignore
    }
  } else {
    drawGuillocheCorner(doc, 0, 0, 200, 170, 'tl');
  }

  if (br) {
    try {
      doc.image(br, pageWidth - 130, pageHeight - 130, { width: 130, height: 130 });
    } catch {
      // ignore
    }
  } else {
    drawGuillocheCorner(doc, pageWidth - 180, pageHeight - 180, 180, 180, 'br');
  }
}

function drawGuillocheCorner(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  corner: 'tl' | 'br',
) {
  doc.save();
  doc.strokeColor(COA.deco).lineWidth(0.55);
  for (let i = 0; i < 14; i += 1) {
    const t = i / 14;
    if (corner === 'tl') {
      doc
        .moveTo(x, y + h * (0.15 + t * 0.85))
        .bezierCurveTo(
          x + w * (0.25 + t * 0.2),
          y + h * (0.05 + t * 0.15),
          x + w * (0.55 + t * 0.2),
          y + h * (0.35 - t * 0.2),
          x + w * (0.75 + t * 0.25),
          y,
        )
        .stroke();
    } else {
      doc
        .moveTo(x + w, y + h * (0.85 - t * 0.85))
        .bezierCurveTo(
          x + w * (0.75 - t * 0.2),
          y + h * (0.95 - t * 0.15),
          x + w * (0.45 - t * 0.2),
          y + h * (0.65 + t * 0.2),
          x + w * (0.25 - t * 0.25),
          y + h,
        )
        .stroke();
    }
  }
  doc.restore();
}

/**
 * Vertical "certificate" — ISCA COA thin calligraphy style (French Script MT).
 */
function drawVerticalCertificateWord(doc: PDFKit.PDFDocument) {
  const pageHeight = doc.page.height;

  doc.save();
  // Official-feel thin calligraphy (closest system match to COA sample)
  const scriptFonts = [
    'C:/Windows/Fonts/FRSCRIPT.TTF', // French Script MT
    'C:/Windows/Fonts/KUNSTLER.TTF', // Kunstler Script
    'C:/Windows/Fonts/segoesc.ttf', // Segoe Script
    'C:/Windows/Fonts/VIVALDII.TTF',
  ];
  let loaded = false;
  for (const path of scriptFonts) {
    if (!existsSync(path)) continue;
    try {
      doc.registerFont('CertCoaScript', path);
      doc.font('CertCoaScript');
      loaded = true;
      break;
    } catch {
      // try next
    }
  }
  if (!loaded) {
    fontOrFallback(doc, 'CertScript', 'Times-Italic');
  }

  const fontSize = 56;
  doc.fontSize(fontSize).fillColor('#6A6A6A');
  // Measure stretched word length, then center it vertically on the left
  const word = 'certificate';
  const wordWidth =
    doc.widthOfString(word) + Math.max(0, word.length - 1) * 14;
  const startY = (pageHeight + wordWidth) / 2;
  doc.translate(fontSize + 18, startY);
  doc.rotate(-90);
  doc.text(word, 0, 0, { lineBreak: false, characterSpacing: 14 });
  doc.restore();
}

function drawCoaHeaderLockup(doc: PDFKit.PDFDocument, top = 52): number {
  const pageWidth = doc.page.width;
  const markPath = resolveCertificateMarkPath();
  const logoHeight = 30;
  const logoWidth = Math.round(logoHeight * 2.55);
  const gap = 6;

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc.fontSize(6.5);
  const orgLines = [...CERT_CONTACT.orgLines];
  const textWidth = Math.max(...orgLines.map((line) => doc.widthOfString(line)));
  const totalWidth = logoWidth + gap + textWidth;
  let x = (pageWidth - totalWidth) / 2;

  if (markPath) {
    try {
      doc.image(markPath, x, top, { fit: [logoWidth, logoHeight] });
    } catch {
      // fallback mark text
      fontOrFallback(doc, 'CertSerif-Bold', 'Times-Bold');
      doc.fontSize(16).fillColor(BRAND.iscaRed).text('IS', x, top + 4, { lineBreak: false });
      const isW = doc.widthOfString('IS');
      doc.fillColor(BRAND.iscaBlue).text('CA', x + isW, top + 4, { lineBreak: false });
    }
  }
  x += logoWidth + gap;

  let orgY = top + 1;
  orgLines.forEach((line) => {
    fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
    doc
      .fontSize(6.5)
      .fillColor(COA.navy)
      .text(line, x, orgY, { lineBreak: false });
    orgY += 8;
  });

  return Math.max(top + logoHeight, orgY) + 48;
}

function drawCentered(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number,
  opts: {
    size: number;
    color: string;
    bold?: boolean;
    spacing?: number;
    width?: number;
    x?: number;
    font?: 'serif' | 'sans' | 'script' | 'cjk';
  },
) {
  const pageWidth = doc.page.width;
  const contentX = opts.x ?? 70;
  const contentWidth = opts.width ?? pageWidth - contentX * 2;

  if (opts.font === 'cjk') {
    try {
      doc.font('CertCJK');
    } catch {
      fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
    }
  } else if (opts.font === 'script') {
    fontOrFallback(doc, 'CertScript', 'Times-Italic');
  } else if (opts.font === 'serif') {
    fontOrFallback(doc, opts.bold ? 'CertSerif-Bold' : 'CertSerif', opts.bold ? 'Times-Bold' : 'Times-Roman');
  } else {
    fontOrFallback(
      doc,
      opts.bold ? 'CertSans-Bold' : 'CertSans',
      opts.bold ? 'Helvetica-Bold' : 'Helvetica',
    );
  }

  doc
    .fontSize(opts.size)
    .fillColor(opts.color)
    .text(text, contentX, y, {
      width: contentWidth,
      align: 'center',
      characterSpacing: opts.spacing ?? 0,
      lineBreak: false,
    });
}

/**
 * Exact layout from CPDCOACert chinese 1.pdf / official ISCA COA sample.
 */
function drawCertificatePage(doc: PDFKit.PDFDocument, input: BuildCertificatePdfInput) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentX = 70;
  const contentWidth = pageWidth - contentX * 2;

  // No border — decorations + vertical script like sample
  drawDecorations(doc);
  drawVerticalCertificateWord(doc);

  let y = drawCoaHeaderLockup(doc, 50);
  // Extra breathing room above CERTIFICATE OF ATTENDANCE
  y += 18;

  // Title — two lines, navy, wide tracking (sample) — slightly larger
  drawCentered(doc, 'CERTIFICATE', y, {
    size: 34,
    color: COA.navyDeep,
    bold: true,
    spacing: 6,
    font: 'sans',
  });
  y += 36;
  drawCentered(doc, 'OF ATTENDANCE', y, {
    size: 34,
    color: COA.navyDeep,
    bold: true,
    spacing: 4.5,
    font: 'sans',
  });

  y += 40;
  drawCentered(doc, 'has been awarded to', y, {
    size: 11,
    color: COA.lightBlue,
    spacing: 1.8,
    font: 'sans',
  });

  y += 34;
  const learnerName = String(input.learnerName || '').trim() || 'Full Name';
  drawCentered(doc, learnerName, y, {
    size: hasCjk(learnerName) ? 30 : 32,
    color: COA.gold,
    bold: true,
    font: hasCjk(learnerName) ? 'cjk' : 'sans',
  });

  y += 62;
  drawCentered(doc, 'for attending of the session', y, {
    size: 11,
    color: COA.lightBlue,
    spacing: 1.6,
    font: 'sans',
  });

  y += 26;
  const programme =
    String(input.courseTitle || '').trim() ||
    'ISCA Sustainability Professional Certification (e-Learning Modules)';
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(13)
    .fillColor(COA.navyDeep)
    .text(programme, contentX, y, {
      width: contentWidth,
      align: 'center',
      lineGap: 3,
    });
  y = doc.y + 14;

  drawCentered(doc, 'on', y, {
    size: 10,
    color: COA.lightBlue,
    spacing: 2.5,
    font: 'sans',
  });

  y += 16;
  const completedAt = formatCompletedDate(input.completedAt);
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(11)
    .fillColor(COA.lightBlue)
    .text(completedAt || '', contentX, y, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });

  y += 34;
  drawCentered(doc, 'Total CPE Hours and Pillar:', y, {
    size: 11,
    color: COA.midBlue,
    spacing: 0.8,
    font: 'sans',
  });

  y += 18;
  const pillarRows =
    Array.isArray(input.pillarCpeHours) && input.pillarCpeHours.length > 0
      ? [...input.pillarCpeHours].sort((a, b) => a.pillarIndex - b.pillarIndex)
      : [
          {
            pillarIndex: 1,
            earnedCpeHours:
              input.earnedCpeHours != null && Number.isFinite(Number(input.earnedCpeHours))
                ? Math.max(0, Number(input.earnedCpeHours))
                : 0,
          },
        ];

  const cpeLines = pillarRows.map((pillar) => {
    const hours = Math.max(0, Number(pillar.earnedCpeHours) || 0);
    return `Pillar ${pillar.pillarIndex} - ${hours.toFixed(2)} Hours`;
  });

  fontOrFallback(doc, 'CertSans', 'Helvetica');
  cpeLines.forEach((line) => {
    doc
      .fontSize(11)
      .fillColor(COA.midBlue)
      .text(line, contentX, y, {
        width: contentWidth,
        align: 'center',
        lineBreak: false,
      });
    y += 15;
  });

  // Signature block — signature image, navy line, then name/title (exact sample order)
  const signatoryName =
    String(input.signatoryName || 'QUEK MU LIM').trim() || 'QUEK MU LIM';
  const signatoryTitle =
    String(input.signatoryTitle || 'CHIEF EXECUTIVE OFFICER').trim() ||
    'CHIEF EXECUTIVE OFFICER';
  const issuerName =
    String(input.issuerName || 'ISCA ACADEMY PTE LTD').trim() || 'ISCA ACADEMY PTE LTD';

  // Keep footer fully on-page (avoid bottom clip)
  const certNoY = pageHeight - 58;
  const issuerY = certNoY - 24;
  const titleY = issuerY - 13;
  const nameY = titleY - 15;
  const lineY = nameY - 12;
  const sigY = lineY - 40;
  const signaturePath = resolveSignaturePath();

  if (signaturePath) {
    try {
      const sigW = 120;
      const sigH = 34;
      doc.image(signaturePath, (pageWidth - sigW) / 2, sigY, { fit: [sigW, sigH] });
    } catch {
      // skip
    }
  }

  const lineW = 150;
  doc
    .moveTo((pageWidth - lineW) / 2, lineY)
    .lineTo((pageWidth + lineW) / 2, lineY)
    .strokeColor(COA.line)
    .lineWidth(0.9)
    .stroke();

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(12)
    .fillColor(COA.navyDeep)
    .text(signatoryName, contentX, nameY, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });

  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(9)
    .fillColor(COA.navy)
    .text(signatoryTitle, contentX, titleY, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .fillColor(COA.navy)
    .text(issuerName, contentX, issuerY, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });

  const certNo = String(input.certificateNo || '').trim();
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(9)
    .fillColor(COA.lightBlue)
    .text(certNo ? `CERTIFICATE NO: ${certNo}` : 'CERTIFICATE NO:', contentX, certNoY, {
      width: contentWidth,
      align: 'center',
      characterSpacing: 0.8,
      lineBreak: false,
    });
}

export async function buildCourseCertificatePdf(
  input: BuildCertificatePdfInput,
): Promise<{ filename: string; buffer: Buffer }> {
  const certificatePageSize: [number, number] = [595.28, 841.89];
  const doc = new PDFDocument({ size: certificatePageSize, margin: 36, autoFirstPage: true });
  registerCertificateFonts(doc);
  registerCjkFont(doc);

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    drawCertificatePage(doc, input);
    drawTranscriptPage(doc, input);
    doc.end();
  });

  const safeNo = String(input.certificateNo || 'certificate')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 60);

  return {
    filename: `Certificate-${safeNo}.pdf`,
    buffer: Buffer.concat(chunks),
  };
}
