import PDFDocument from 'pdfkit';
import {
  BuildCertificatePdfInput,
  CERT_BRAND as BRAND,
  CERT_COLORS as COLORS,
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

function drawDoubleBorder(doc: PDFKit.PDFDocument) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const outer = 28;
  const gap = 6;

  doc
    .lineWidth(1.5)
    .strokeColor(COLORS.border)
    .rect(outer, outer, pageWidth - outer * 2, pageHeight - outer * 2)
    .stroke();

  doc
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .rect(outer + gap, outer + gap, pageWidth - (outer + gap) * 2, pageHeight - (outer + gap) * 2)
    .stroke();
}

/**
 * Header lockup:
 * [certificate.png] | Sustainability / Reporting / PROFESSIONAL
 * - large green S / R, rest grey
 * - PROFESSIONAL smaller
 * - equal gap both sides of divider, height == logo
 */
function drawBrandLockup(
  doc: PDFKit.PDFDocument,
  options: {
    top?: number;
    align?: 'center' | 'left';
    left?: number;
    width?: number;
    height?: number;
  } = {},
): number {
  const pageWidth = doc.page.width;
  const top = options.top ?? 48;
  const align = options.align || 'center';
  const logoHeight = options.height ?? 28;
  const markPath = resolveCertificateMarkPath();

  const logoWidth = Math.round(logoHeight * 2.9);
  const sideGap = Math.max(8, Math.round(logoHeight * 0.36));

  // Large initial S/R, smaller rest, PROFESSIONAL even smaller
  let initialSize = Math.max(8, Math.floor(logoHeight * 0.42));
  let restSize = Math.max(6, Math.floor(logoHeight * 0.28));
  let proSize = Math.max(4, Math.floor(logoHeight * 0.16));

  // Fit 3 lines into logo height
  while (initialSize * 2 + proSize + 2 > logoHeight && initialSize > 6) {
    initialSize -= 1;
    restSize = Math.max(5, Math.min(restSize, initialSize - 1));
    proSize = Math.max(4, Math.floor(initialSize * 0.4));
  }

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  const sW = doc.fontSize(initialSize).widthOfString('S');
  const rW = doc.fontSize(initialSize).widthOfString('R');
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  const sustainRestW = doc.fontSize(restSize).widthOfString('ustainability');
  const reportRestW = doc.fontSize(restSize).widthOfString('eporting');
  const proW = doc.fontSize(proSize).widthOfString('PROFESSIONAL');
  const textBoxWidth =
    Math.ceil(Math.max(sW + 1 + sustainRestW, rW + 1 + reportRestW, proW)) + 1;

  const totalWidth = logoWidth + sideGap + 2.5 + sideGap + textBoxWidth;
  const startX =
    align === 'left' && options.left != null
      ? options.left
      : (pageWidth - totalWidth) / 2;

  // Left logo
  if (markPath) {
    try {
      doc.image(markPath, startX, top, { fit: [logoWidth, logoHeight] });
    } catch {
      fontOrFallback(doc, 'CertSerif-Bold', 'Times-Bold');
      const size = Math.max(8, Math.round(logoHeight * 0.7));
      doc.fontSize(size).fillColor(BRAND.iscaRed).text('IS', startX, top + 2, { lineBreak: false });
      const isW = doc.widthOfString('IS');
      doc.fontSize(size).fillColor(BRAND.iscaBlue).text('CA', startX + isW, top + 2, { lineBreak: false });
    }
  }

  // Double divider (navy + green) — drawn lines, no image
  const dividerX = startX + logoWidth + sideGap;
  doc
    .moveTo(dividerX, top)
    .lineTo(dividerX, top + logoHeight)
    .strokeColor(BRAND.iscaBlue)
    .lineWidth(0.9)
    .stroke();
  doc
    .moveTo(dividerX + 2.5, top)
    .lineTo(dividerX + 2.5, top + logoHeight)
    .strokeColor(BRAND.srGreen)
    .lineWidth(0.9)
    .stroke();

  const textX = dividerX + 2.5 + sideGap;
  const gapY = Math.max(0, Math.floor((logoHeight - (initialSize + initialSize + proSize)) / 2));
  const line1Y = top + Math.min(1, gapY);
  const line2Y = line1Y + initialSize + Math.max(0, Math.floor(gapY / 2));
  const line3Y = top + logoHeight - proSize;

  // Sustainability — green S + grey rest
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc.fontSize(initialSize).fillColor(BRAND.srGreen).text('S', textX, line1Y, { lineBreak: false });
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(restSize)
    .fillColor(BRAND.srText)
    .text('ustainability', textX + sW + 1, line1Y + Math.max(0, Math.round((initialSize - restSize) / 2)), {
      lineBreak: false,
    });

  // Reporting — green R + grey rest
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc.fontSize(initialSize).fillColor(BRAND.srGreen).text('R', textX, line2Y, { lineBreak: false });
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(restSize)
    .fillColor(BRAND.srText)
    .text('eporting', textX + rW + 1, line2Y + Math.max(0, Math.round((initialSize - restSize) / 2)), {
      lineBreak: false,
    });

  // PROFESSIONAL — smaller green
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(proSize)
    .fillColor(BRAND.srGreen)
    .text('PROFESSIONAL', textX, line3Y, {
      lineBreak: false,
      characterSpacing: logoHeight >= 30 ? 0.5 : 0.1,
    });

  return top + logoHeight + 10;
}

/**
 * Exact ISCA certificate template layout (no SAMPLE watermark).
 * Upper content + footer spacing matched to official sample.
 */
function drawCertificatePage(doc: PDFKit.PDFDocument, input: BuildCertificatePdfInput) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentX = 50;
  const contentWidth = pageWidth - 100;

  drawDoubleBorder(doc);

  // Brand lockup
  let y = drawBrandLockup(doc, { top: 58, align: 'center', width: 170, height: 28 });
  // Extra space above CERTIFICATE OF / COMPLETION
  y += 54;

  // Title
  fontOrFallback(doc, 'CertSerif', 'Times-Roman');
  doc
    .fontSize(24)
    .fillColor('#1A1A1A')
    .text('CERTIFICATE OF', contentX, y, {
      width: contentWidth,
      align: 'center',
      characterSpacing: 4.5,
    });

  y += 26;
  doc
    .fontSize(26)
    .fillColor('#1A1A1A')
    .text('COMPLETION', contentX, y, {
      width: contentWidth,
      align: 'center',
      characterSpacing: 5.5,
    });

  y += 28;
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(10)
    .fillColor('#6B6B6B')
    .text('has been awarded to', contentX, y, {
      width: contentWidth,
      align: 'center',
      characterSpacing: 1.2,
    });

  // Name
  y += 52;
  const learnerName = String(input.learnerName || '').trim() || 'Full Name';
  fontOrFallback(doc, 'CertScript', 'Times-Italic');
  doc
    .fontSize(40)
    .fillColor(COLORS.nameGold)
    .text(learnerName, contentX, y, {
      width: contentWidth,
      align: 'center',
    });

  // Line close under name
  y += 34;
  const ruleInset = 70;
  doc
    .moveTo(contentX + ruleInset, y)
    .lineTo(contentX + contentWidth - ruleInset, y)
    .strokeColor(COLORS.line)
    .lineWidth(0.7)
    .stroke();

  // Medium gap then details (sample)
  y += 28;
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(11)
    .fillColor('#6B6B6B')
    .text('for completion of the', contentX, y, {
      width: contentWidth,
      align: 'center',
    });

  // Extra space after "for completion of the"
  y += 36;
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(15)
    .fillColor('#000000')
    .text('ISCA Sustainability', contentX, y, {
      width: contentWidth,
      align: 'center',
    });

  y += 20;
  doc
    .fontSize(15)
    .fillColor('#000000')
    .text('Professional Certification', contentX, y, {
      width: contentWidth,
      align: 'center',
    });

  // (e-Learning Modules) — no background color
  y += 20;
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(15)
    .fillColor('#000000')
    .text('(e-Learning Modules)', contentX, y, {
      width: contentWidth,
      align: 'center',
    });

  y += 30;
  const completedAt = formatCompletedDate(input.completedAt);
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(11)
    .fillColor('#6B6B6B')
    .text(completedAt ? `on ${completedAt}` : '', contentX, y, {
      width: contentWidth,
      align: 'center',
    });

  // Footer signature — bottom pe, sample jaisa proper breathing space upar se
  const signY = pageHeight - 110;
  const signLineWidth = 130;
  doc
    .moveTo((pageWidth - signLineWidth) / 2, signY)
    .lineTo((pageWidth + signLineWidth) / 2, signY)
    .strokeColor('#555555')
    .lineWidth(0.9)
    .stroke();

  const signatoryName = String(input.signatoryName || 'Fann Kor').trim() || 'Fann Kor';
  const signatoryTitle = String(input.signatoryTitle || 'CEO').trim() || 'CEO';

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(12)
    .fillColor('#000000')
    .text(signatoryName, contentX, signY + 8, {
      width: contentWidth,
      align: 'center',
    });

  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc
    .fontSize(10)
    .fillColor('#6B6B6B')
    .text(signatoryTitle, contentX, signY + 26, {
      width: contentWidth,
      align: 'center',
    });
}

export async function buildCourseCertificatePdf(
  input: BuildCertificatePdfInput,
): Promise<{ filename: string; buffer: Buffer }> {
  // Certificate page — A4 width, slightly shorter height; footer bottom pe sample jaisa
  const certificatePageSize: [number, number] = [595.28, 780];
  const doc = new PDFDocument({ size: certificatePageSize, margin: 40, autoFirstPage: true });
  registerCertificateFonts(doc);

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    // Official pages only — no SAMPLE watermark
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
