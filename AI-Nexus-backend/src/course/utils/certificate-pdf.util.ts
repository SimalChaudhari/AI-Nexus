import PDFDocument from 'pdfkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  PDFDocument as PdfLibDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import {
  BuildCertificatePdfInput,
  CERTIFICATE_CENTER_LOGO_FILE,
  CERTIFICATE_CENTER_LOGO_INDEX,
  CERTIFICATE_TEMPLATE_DEFAULTS,
  formatCompletedDate,
  formatCpeSectionHeading,
  readRasterImageSize,
  registerCertificateFonts,
  resolveCertificateCpeHours,
  resolveFontPath,
  resolvePublicCertificateAsset,
  resolveUploadAssetPath,
} from './certificate-pdf-shared.util';
import { drawTranscriptPage } from './transcript-pdf.util';

export type {
  BuildCertificatePdfInput,
  CertificatePdfTranscriptModule,
  CertificatePdfTranscriptSection,
} from './certificate-pdf-shared.util';

/** Exact COA palette from official ISCA sample. */
const COA = {
  navy: '#1A4A82',
  navyDeep: '#0E3A6E',
  lightBlue: '#1A4A82',
  midBlue: '#1A4A82',
  gold: '#C5A24A',
  certNo: '#6B6B6B',
};

function resolveAsset(...parts: string[]): string | null {
  const path = join(process.cwd(), ...parts);
  return existsSync(path) ? path : null;
}

function resolveBlankCertificatePdfPath(): string | null {
  return (
    resolveAsset('public', 'certificate', 'certificate-singapore.pdf') ||
    resolveAsset('public', 'certificate', 'certificate.pdf') ||
    resolveAsset('assets', 'certificate', 'certificate-singapore.pdf') ||
    resolveAsset('assets', 'certificate', 'certificate.pdf') ||
    resolveAsset('public', 'uploads', 'certificate', 'certificate.pdf')
  );
}

function resolveSignaturePath(signatureUrl?: string | null): string | null {
  const uploaded = resolveUploadAssetPath(signatureUrl);
  if (uploaded) return uploaded;
  return (
    resolveAsset('public', 'certificate', 'signature.png') ||
    resolveAsset('public', 'uploads', 'certificate', 'signature.png')
  );
}

/** A4 reference height — scale footer/header for letter-sized templates. */
const REF_PAGE_H = 842.28;

async function embedRasterImage(pdf: PdfLibDocument, filePath: string) {
  const bytes = readFileSync(filePath);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return pdf.embedJpg(bytes);
  }
  return pdf.embedPng(bytes);
}

/** Center header logo only — same placement as `drawTripleLogoHeader` (top 52, height 38). */
async function drawTripleLogoHeaderPdfLib(
  pdf: PdfLibDocument,
  page: PDFPage,
  pageWidth: number,
  pageHeight: number,
  logoUrls?: (string | null | undefined)[],
): Promise<void> {
  const scale = pageHeight / REF_PAGE_H;
  const logoHeight = 38 * scale;
  const topFromPageTop = 52 * scale;
  const customPath = resolveUploadAssetPath(logoUrls?.[CERTIFICATE_CENTER_LOGO_INDEX]);
  const path = customPath || resolvePublicCertificateAsset(CERTIFICATE_CENTER_LOGO_FILE);
  if (!path) return;

  const size = readRasterImageSize(path);
  if (!size?.height) return;

  let image: Awaited<ReturnType<typeof embedRasterImage>>;
  try {
    image = await embedRasterImage(pdf, path);
  } catch {
    return;
  }

  const logoWidth = (size.width / size.height) * logoHeight;
  const drawLogoY = pageHeight - topFromPageTop - logoHeight;
  const maskPadX = 6 * scale;
  const maskPadY = 4 * scale;
  const lockupX = (pageWidth - logoWidth) / 2;

  page.drawRectangle({
    x: lockupX - maskPadX,
    y: drawLogoY - maskPadY,
    width: logoWidth + maskPadX * 2,
    height: logoHeight + maskPadY * 2,
    color: rgb(1, 1, 1),
  });

  page.drawImage(image, { x: lockupX, y: drawLogoY, width: logoWidth, height: logoHeight });
}

function drawCenteredInBand(
  page: PDFPage,
  text: string,
  bandX: number,
  bandWidth: number,
  yBottom: number,
  size: number,
  font: PDFFont,
  color: RGB,
  spacing = 0,
) {
  const textWidth =
    spacing > 0
      ? spacedWidth(font, text, size, spacing)
      : font.widthOfTextAtSize(text, size);
  const x = bandX + (bandWidth - textWidth) / 2;
  if (spacing > 0) {
    drawSpacedText(page, text, x, yBottom, size, font, color, spacing);
  } else {
    page.drawText(text, { x, y: yBottom, size, font, color });
  }
}

async function drawDynamicSignatoryFooter(
  pdf: PdfLibDocument,
  page: PDFPage,
  pageWidth: number,
  pageHeight: number,
  input: BuildCertificatePdfInput,
  sans: PDFFont,
): Promise<void> {
  const scale = pageHeight / REF_PAGE_H;
  const navy = hexRgb(COA.navy);

  const signatoryTitle =
    String(input.signatoryTitle || CERTIFICATE_TEMPLATE_DEFAULTS.signatoryTitle).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.signatoryTitle;
  const issuerName =
    String(input.issuerName || CERTIFICATE_TEMPLATE_DEFAULTS.issuerName).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.issuerName;
  const certNo = String(input.certificateNo || '').trim();
  const certNoLabel = certNo ? `CERTIFICATE NO: ${certNo}` : 'CERTIFICATE NO:';

  const smallSize = 9 * scale;
  const certSpacing = 0.8;
  const sigW = 120 * scale;
  const sigH = 38 * scale;

  const certNoY = 68 * scale;
  const lift = 14 * scale;
  const issuerY = certNoY + 26 * scale + lift;
  // Extra whitespace between issuer and signatory title.
  const titleY = issuerY + 18 * scale;
  // Signature above title — no signatory name text
  const sigY = titleY + 6 * scale + sigH;

  const lockupWidth = Math.max(
    sigW,
    sans.widthOfTextAtSize(signatoryTitle, smallSize),
    sans.widthOfTextAtSize(issuerName, smallSize),
    spacedWidth(sans, certNoLabel, smallSize, certSpacing),
  );
  const lockupX = (pageWidth - lockupWidth) / 2;

  const signaturePath = resolveSignaturePath(input.signatureUrl);
  if (signaturePath) {
    try {
      const sigImage = await embedRasterImage(pdf, signaturePath);
      page.drawImage(sigImage, {
        x: lockupX + (lockupWidth - sigW) / 2,
        y: sigY,
        width: sigW,
        height: sigH,
      });
    } catch {
      // skip
    }
  }

  drawCenteredInBand(page, signatoryTitle, lockupX, lockupWidth, titleY, smallSize, sans, navy);
  drawCenteredInBand(page, issuerName, lockupX, lockupWidth, issuerY, smallSize, sans, navy);
  drawCenteredInBand(
    page,
    certNoLabel,
    lockupX,
    lockupWidth,
    certNoY,
    smallSize,
    sans,
    navy,
    certSpacing,
  );
}

function hexRgb(hex: string): RGB {
  const raw = hex.replace('#', '');
  const n = parseInt(raw, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function hasCjk(text: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(text);
}

async function embedFontFile(
  pdf: PdfLibDocument,
  fileName: string,
  fallback: StandardFonts,
): Promise<PDFFont> {
  const path = resolveFontPath(fileName);
  if (path) {
    try {
      return await pdf.embedFont(readFileSync(path), { subset: true });
    } catch {
      // fall through
    }
  }
  return pdf.embedFont(fallback);
}

function spacedWidth(font: PDFFont, text: string, size: number, spacing: number): number {
  let w = 0;
  for (let i = 0; i < text.length; i += 1) {
    w += font.widthOfTextAtSize(text[i], size);
    if (i < text.length - 1) w += spacing;
  }
  return w;
}

function drawSpacedText(
  page: PDFPage,
  text: string,
  x: number,
  yBottom: number,
  size: number,
  font: PDFFont,
  color: RGB,
  spacing: number,
): number[] {
  const xs: number[] = [];
  let cursor = x;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    xs.push(cursor);
    page.drawText(ch, { x: cursor, y: yBottom, size, font, color });
    cursor += font.widthOfTextAtSize(ch, size) + (i < text.length - 1 ? spacing : 0);
  }
  return xs;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  pageWidth: number,
  yBottom: number,
  size: number,
  font: PDFFont,
  color: RGB,
  spacing = 0,
) {
  const width =
    spacing > 0
      ? spacedWidth(font, text, size, spacing)
      : font.widthOfTextAtSize(text, size);
  const x = (pageWidth - width) / 2;
  if (spacing > 0) {
    drawSpacedText(page, text, x, yBottom, size, font, color, spacing);
  } else {
    page.drawText(text, { x, y: yBottom, size, font, color });
  }
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = String(text || '')
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [];

  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * Stamp dynamic fields onto blank `certificate.pdf` template.
 * Template already has: logo, vertical Certificate, deco, signature block.
 * Fonts + spacing match the previous pdfkit COA layout.
 */
async function stampCertificateTemplate(
  input: BuildCertificatePdfInput,
): Promise<Uint8Array> {
  const templatePath = resolveBlankCertificatePdfPath();
  if (!templatePath) {
    throw new Error('Blank certificate template not found: public/certificate/certificate.pdf');
  }

  const pdf = await PdfLibDocument.load(readFileSync(templatePath));
  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();
  const scale = height / REF_PAGE_H;

  const serifBold = await embedFontFile(pdf, 'CrimsonPro-Bold.ttf', StandardFonts.TimesRomanBold);
  const sans = await embedFontFile(pdf, 'OpenSans-Regular.ttf', StandardFonts.Helvetica);
  const sansBold = await embedFontFile(pdf, 'OpenSans-Bold.ttf', StandardFonts.HelveticaBold);
  const script = await embedFontFile(pdf, 'Amithen.ttf', StandardFonts.TimesRomanItalic);

  const navy = hexRgb(COA.navy);
  const navyDeep = hexRgb(COA.navyDeep);
  const gold = hexRgb(COA.gold);

  await drawTripleLogoHeaderPdfLib(pdf, page, width, height, input.logoUrls);

  // Top-down Y (same as previous pdfkit layout); pdf-lib draws from bottom
  const toY = (topY: number, size: number) => height - topY - size;

  let top = 112 * scale;
  const contentPad = 70 * scale;
  const contentWidth = width - contentPad * 2;

  const titleLine1 =
    String(input.titleLine1 || CERTIFICATE_TEMPLATE_DEFAULTS.titleLine1).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.titleLine1;
  const titleLine2Left =
    String(input.titleLine2Left || CERTIFICATE_TEMPLATE_DEFAULTS.titleLine2Left).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.titleLine2Left;
  const titleLine2Right =
    String(input.titleLine2Right || CERTIFICATE_TEMPLATE_DEFAULTS.titleLine2Right).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.titleLine2Right;
  const awardedToLabel =
    String(input.awardedToLabel || CERTIFICATE_TEMPLATE_DEFAULTS.awardedToLabel).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.awardedToLabel;
  const sessionLabel =
    String(input.sessionLabel || CERTIFICATE_TEMPLATE_DEFAULTS.sessionLabel).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.sessionLabel;
  const cpeSectionLabel =
    String(input.cpeSectionLabel || CERTIFICATE_TEMPLATE_DEFAULTS.cpeSectionLabel).trim() ||
    CERTIFICATE_TEMPLATE_DEFAULTS.cpeSectionLabel;

  // Title lockup — Crimson Pro Bold, size 28, letterSpacing 6
  const titleSize = 28;
  const letterSpacing = 6;
  const line1 = titleLine1;
  const line1W = spacedWidth(serifBold, line1, titleSize, letterSpacing);
  const startX = (width - line1W) / 2;
  const xs = drawSpacedText(
    page,
    line1,
    startX,
    toY(top, titleSize),
    titleSize,
    serifBold,
    navyDeep,
    letterSpacing,
  );
  top += titleSize + 6;

  const underE = xs[1] ?? startX;
  const ofWord = titleLine2Left;
  const attendanceWord = titleLine2Right;
  const ofW = spacedWidth(serifBold, ofWord, titleSize, letterSpacing);
  const gapAfterOf = letterSpacing * 2.5;
  const ofX = underE - gapAfterOf - ofW;
  drawSpacedText(
    page,
    ofWord,
    ofX,
    toY(top, titleSize),
    titleSize,
    serifBold,
    navyDeep,
    letterSpacing,
  );
  drawSpacedText(
    page,
    attendanceWord,
    underE,
    toY(top, titleSize),
    titleSize,
    serifBold,
    navyDeep,
    letterSpacing,
  );

  // Previous: y += 48 after title block return (second line baseline)
  top += 48;

  drawCenteredText(
    page,
    awardedToLabel,
    width,
    toY(top, 11),
    11,
    sans,
    navy,
    2.5,
  );

  top += 14;
  const learnerName = String(input.learnerName || '').trim() || 'Full Name';
  const nameSize = hasCjk(learnerName) ? 30 : 40;
  const nameFont = hasCjk(learnerName) ? sansBold : script;
  drawCenteredText(page, learnerName, width, toY(top, nameSize), nameSize, nameFont, gold);

  top += nameSize * 0.72 + 14;
  drawCenteredText(
    page,
    sessionLabel,
    width,
    toY(top, 11),
    11,
    sans,
    navy,
    2.5,
  );

  top += 26;
  const programme =
    String(input.courseTitle || '').trim() ||
    'ISCA Sustainability Professional Certification (e-Learning Modules)';
  const programmeLines = wrapLines(programme, sansBold, 13, contentWidth);
  for (const line of programmeLines) {
    drawCenteredText(page, line, width, toY(top, 13), 13, sansBold, navyDeep);
    top += 16;
  }
  // Previous: pull "on" up tight under programme (doc.y - 2)
  top -= 2;

  drawCenteredText(page, 'on', width, toY(top, 10), 10, sans, navy, 5);
  top += 16;

  const completedAt = formatCompletedDate(input.completedAt);
  if (completedAt) {
    drawCenteredText(page, completedAt, width, toY(top, 11), 11, sans, navy);
  }

  top += 34;
  const cpeHeading = formatCpeSectionHeading(
    cpeSectionLabel,
    resolveCertificateCpeHours(input),
  );
  drawCenteredText(
    page,
    cpeHeading,
    width,
    toY(top, 11),
    11,
    sans,
    navy,
    0.8,
  );

  await drawDynamicSignatoryFooter(pdf, page, width, height, input, sans);

  return pdf.save();
}

/** Transcript pages only — no blank auto-first page. */
async function buildTranscriptPdfBuffer(
  input: BuildCertificatePdfInput,
  pageSize: { width: number; height: number },
): Promise<Buffer | null> {
  const hasRows = Array.isArray(input.transcript) && input.transcript.length > 0;
  if (!hasRows) return null;

  const doc = new PDFDocument({
    size: [pageSize.width, pageSize.height],
    margin: 50,
    autoFirstPage: false,
  });
  registerCertificateFonts(doc);
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve());
    doc.on('error', reject);
    drawTranscriptPage(doc, input, pageSize);
    doc.end();
  });

  return Buffer.concat(chunks);
}

export async function buildCourseCertificatePdf(
  input: BuildCertificatePdfInput,
): Promise<{ filename: string; buffer: Buffer }> {
  const stamped = await stampCertificateTemplate(input);
  const out = await PdfLibDocument.load(stamped);
  const certPage = out.getPages()[0];
  const { width: certWidth, height: certHeight } = certPage.getSize();

  try {
    const transcriptBuf = await buildTranscriptPdfBuffer(input, {
      width: certWidth,
      height: certHeight,
    });
    if (transcriptBuf && transcriptBuf.length > 0) {
      const transcriptPdf = await PdfLibDocument.load(transcriptBuf);
      const pages = await out.copyPages(transcriptPdf, transcriptPdf.getPageIndices());
      pages.forEach((p:any) => out.addPage(p));
    }
  } catch {
    // transcript optional — certificate page still returned
  }

  const bytes = await out.save();
  const safeNo = String(input.certificateNo || 'certificate')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 60);

  return {
    filename: `Certificate-${safeNo}.pdf`,
    buffer: Buffer.from(bytes),
  };
}
