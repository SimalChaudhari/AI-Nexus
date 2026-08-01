import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  BuildCertificatePdfInput,
  drawTripleLogoHeader,
  fontOrFallback,
  formatCompletedDate,
  registerCertificateFonts,
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
  lightBlue: '#000000',
  midBlue: '#000000',
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

function drawDecorations(_doc: PDFKit.PDFDocument) {
  // Corner ribbon / patti decorations removed
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
  return drawTripleLogoHeader(doc, top, 38);
}

function drawCentered(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number,
  opts: {
    size: number;
    color: string;
    bold?: boolean;
    /** Approximate CSS font-weight (Crimson Pro uses stroke for 500/600). */
    weight?: 400 | 500 | 600 | 700;
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
    const useBoldFace = opts.bold || opts.weight === 700;
    fontOrFallback(
      doc,
      useBoldFace ? 'CertSerif-Bold' : 'CertSerif',
      useBoldFace ? 'Times-Bold' : 'Times-Roman',
    );
  } else {
    fontOrFallback(
      doc,
      opts.bold ? 'CertSans-Bold' : 'CertSans',
      opts.bold ? 'Helvetica-Bold' : 'Helvetica',
    );
  }

  doc.fontSize(opts.size).fillColor(opts.color);

  // Crimson Pro file is variable (embeds at 400). Stroke approximates heavier weight.
  const strokeWeight =
    opts.font === 'serif' && opts.weight != null && opts.weight >= 500 ? opts.weight : null;
  if (strokeWeight != null) {
    const lineWidth =
      strokeWeight >= 700 ? 0.6 : strokeWeight >= 600 ? 0.45 : 0.28;
    doc.strokeColor(opts.color).lineWidth(lineWidth);
  }

  doc.text(text, contentX, y, {
    width: contentWidth,
    align: 'center',
    characterSpacing: opts.spacing ?? 0,
    lineBreak: false,
    fill: true,
    stroke: strokeWeight != null,
  });
}

/**
 * Exact layout from CPDCOACert chinese 1.pdf / official ISCA COA sample.
 */
function drawCertificatePage(doc: PDFKit.PDFDocument, input: BuildCertificatePdfInput) {
  const pageWidth = doc.page.width;
  const contentX = 70;
  const contentWidth = pageWidth - contentX * 2;

  // No border — decorations + vertical script like sample
  drawDecorations(doc);
  drawVerticalCertificateWord(doc);

  let y = drawCoaHeaderLockup(doc, 40);
  // Title block sits higher + smaller than body
  y += 6;

  drawCentered(doc, 'CERTIFICATE', y, {
    size: 28,
    color: COA.navyDeep,
    weight: 700,
    spacing: 8,
    font: 'serif',
  });
  y += 28;
  drawCentered(doc, 'OF ATTENDANCE', y, {
    size: 28,
    color: COA.navyDeep,
    weight: 700,
    spacing: 5.5,
    font: 'serif',
  });

  y += 36;
  drawCentered(doc, 'has been awarded to', y, {
    size: 10,
    color: COA.lightBlue,
    spacing: 1.5,
    font: 'sans',
  });

  y += 22;
  const learnerName = String(input.learnerName || '').trim() || 'Full Name';
  // Learner name — Amithen (script); CJK keeps CertCJK
  drawCentered(doc, learnerName, y, {
    size: hasCjk(learnerName) ? 30 : 42,
    color: COA.gold,
    font: hasCjk(learnerName) ? 'cjk' : 'script',
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

  y += 20;
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

  // Signature block — flows under content so page height can auto-fit
  const signatoryName =
    String(input.signatoryName || 'QUEK MU LIM').trim() || 'QUEK MU LIM';
  const signatoryTitle =
    String(input.signatoryTitle || 'CHIEF EXECUTIVE OFFICER').trim() ||
    'CHIEF EXECUTIVE OFFICER';
  const issuerName =
    String(input.issuerName || 'ISCA ACADEMY PTE LTD').trim() || 'ISCA ACADEMY PTE LTD';

  const sigY = y + 28;
  const lineY = sigY + 40;
  const nameY = lineY + 12;
  const titleY = nameY + 18;
  const issuerY = titleY + 16;
  const certNoY = issuerY + 28;
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

/** A4 width; height is measured from content so page 1 auto-fits. */
const CERT_PAGE_WIDTH = 595.28;
const CERT_PAGE_MIN_HEIGHT = 720;
const CERT_PAGE_MAX_HEIGHT = 1200;

/**
 * Measure certificate page height by running the same layout Y math (no output).
 */
function measureCertificatePageHeight(input: BuildCertificatePdfInput): number {
  const measure = new PDFDocument({
    size: [CERT_PAGE_WIDTH, CERT_PAGE_MAX_HEIGHT],
    margin: 36,
    autoFirstPage: true,
  });
  registerCertificateFonts(measure);
  registerCjkFont(measure);

  const contentX = 70;
  const contentWidth = CERT_PAGE_WIDTH - contentX * 2;

  // Match drawCoaHeaderLockup return: top 40, logo ~38, +28
  let y = Math.max(40 + 38, 40 + 1 + 4 * 8) + 28;
  y += 6;
  y += 28; // CERTIFICATE
  y += 28; // OF ATTENDANCE
  y += 36; // has been awarded to
  y += 22; // name start
  y += 62; // after name
  y += 26; // after "for attending…"

  const programme =
    String(input.courseTitle || '').trim() ||
    'ISCA Sustainability Professional Certification (e-Learning Modules)';
  fontOrFallback(measure, 'CertSans-Bold', 'Helvetica-Bold');
  measure.fontSize(13);
  const programmeH = measure.heightOfString(programme, {
    width: contentWidth,
    lineGap: 3,
  });
  y += programmeH + 14;
  y += 20; // on + date
  y += 34; // CPE heading
  y += 18;

  const pillarCount =
    Array.isArray(input.pillarCpeHours) && input.pillarCpeHours.length > 0
      ? input.pillarCpeHours.length
      : 1;
  y += pillarCount * 15;

  // Footer stack (sig → cert no) + bottom margin — same as drawCertificatePage
  y += 28 + 40 + 12 + 18 + 16 + 28 + 48;

  measure.on('data', () => undefined);
  measure.end();

  return Math.min(
    CERT_PAGE_MAX_HEIGHT,
    Math.max(CERT_PAGE_MIN_HEIGHT, Math.ceil(y)),
  );
}

export async function buildCourseCertificatePdf(
  input: BuildCertificatePdfInput,
): Promise<{ filename: string; buffer: Buffer }> {
  const pageHeight = measureCertificatePageHeight(input);
  const certificatePageSize: [number, number] = [CERT_PAGE_WIDTH, pageHeight];
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
