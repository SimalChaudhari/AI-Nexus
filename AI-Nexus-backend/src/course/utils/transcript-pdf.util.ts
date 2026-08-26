import {
  BuildCertificatePdfInput,
  CERTIFICATE_TEMPLATE_DEFAULTS,
  drawTripleLogoHeader,
  flattenTranscriptModules,
  fontOrFallback,
} from './certificate-pdf-shared.util';

const TITLE_NAVY = '#0E3A6E';
const BODY_BLUE = '#1A4A82';
const LINE_BLUE = '#1A4A82';

function pickTranscriptText(
  value: string | null | undefined,
  fallback: string,
): string {
  const cleaned = String(value ?? '').trim();
  return cleaned || fallback;
}

function splitTitleLines(title: string): string[] {
  return String(title || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Transcript letterhead — same center logo as certificate page.
 */
function drawTranscriptHeader(
  doc: PDFKit.PDFDocument,
  logoUrls?: (string | null | undefined)[],
): number {
  return drawTripleLogoHeader(doc, 42, 36, logoUrls);
}

/** Programme title (Crimson Pro). */
function drawProgrammeTitleBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  contentWidth: number,
  margin: number,
  title: string,
): number {
  // Same faux-bold as certificate “CERTIFICATE OF ATTENDANCE” (stroke + fill)
  fontOrFallback(doc, 'CertSerif-Bold', 'Times-Bold');
  doc
    .fontSize(20)
    .fillColor(TITLE_NAVY)
    .strokeColor(TITLE_NAVY)
    .lineWidth(0.55);

  const titleLines = splitTitleLines(title);
  for (const line of titleLines) {
    doc.text(line, margin, y, {
      width: contentWidth,
      align: 'center',
      characterSpacing: 1.8,
      lineBreak: false,
      fill: true,
      stroke: true,
    });
    y += 26;
  }

  return y + 20;
}

function drawTableHeaders(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: {
    margin: number;
    pageWidth: number;
    colModule: number;
    colCategory: number;
    colHours: number;
    colDate: number;
    moduleWidth: number;
    categoryWidth: number;
    hoursWidth: number;
    dateWidth: number;
  },
): number {
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc.fontSize(10).fillColor(BODY_BLUE);
  doc.text('Modules', cols.colModule, y, { width: cols.moduleWidth, lineBreak: false });
  doc.text('CPE Category', cols.colCategory, y, { width: cols.categoryWidth, lineBreak: false });
  doc.text('Hour(s)', cols.colHours, y, {
    width: cols.hoursWidth,
    align: 'right',
    lineBreak: false,
  });
  doc.text('Date of Completion', cols.colDate, y, {
    width: cols.dateWidth,
    align: 'right',
    lineBreak: false,
  });
  y += 14;

  doc
    .moveTo(cols.margin, y)
    .lineTo(cols.pageWidth - cols.margin, y)
    .strokeColor(LINE_BLUE)
    .lineWidth(1.4)
    .stroke();

  return y + 12;
}

function formatCpeCategory(pillarIndex: number | null | undefined): string {
  if (pillarIndex != null && pillarIndex > 0) return `Category ${pillarIndex}`;
  return '';
}

/**
 * Transcript page — AI Fluency layout + certificate fonts.
 * Page size should match the certificate template (e.g. letter 612×792 or A4).
 */
export function drawTranscriptPage(
  doc: PDFKit.PDFDocument,
  input: BuildCertificatePdfInput,
  pageSize?: { width: number; height: number },
): void {
  const pageWidth = pageSize?.width ?? 595.28;
  const pageHeight = pageSize?.height ?? 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const pageSpec = { size: [pageWidth, pageHeight] as [number, number], margin };

  doc.addPage(pageSpec);

  const transcriptTitle = pickTranscriptText(
    input.transcriptTitle,
    CERTIFICATE_TEMPLATE_DEFAULTS.transcriptTitle,
  );

  let y = drawTranscriptHeader(doc, input.logoUrls);
  y = drawProgrammeTitleBlock(doc, y, contentWidth, margin, transcriptTitle);

  const cols = {
    margin,
    pageWidth,
    colModule: margin,
    colCategory: margin + contentWidth * 0.42,
    colHours: margin + contentWidth * 0.58,
    colDate: margin + contentWidth * 0.72,
    moduleWidth: contentWidth * 0.4,
    categoryWidth: contentWidth * 0.15,
    hoursWidth: contentWidth * 0.12,
    dateWidth: contentWidth * 0.28,
  };

  y = drawTableHeaders(doc, y, cols);

  const rows = flattenTranscriptModules(input.transcript || []);
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc.fontSize(9.5).fillColor(BODY_BLUE);

  if (rows.length) {
    rows.forEach((row) => {
      if (y > pageHeight - 90) {
        doc.addPage(pageSpec);
        y = drawTranscriptHeader(doc, input.logoUrls);
        y = drawProgrammeTitleBlock(doc, y, contentWidth, margin, transcriptTitle);
        y = drawTableHeaders(doc, y, cols);
        fontOrFallback(doc, 'CertSans', 'Helvetica');
        doc.fontSize(9.5).fillColor(BODY_BLUE);
      }

      if (row.isCourseHeader) {
        y += 6;
        fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
        doc.fontSize(10).fillColor(TITLE_NAVY);
        // Long titles (e.g. "Pillar 1 — AI Fluency (AI+Accountancy)") wrap; fixed +16 caused overlap.
        const headerHeight = Math.max(
          12,
          doc.heightOfString(row.title, { width: cols.moduleWidth }),
        );
        doc.text(row.title, cols.colModule, y, {
          width: cols.moduleWidth,
        });
        y += headerHeight + 10;
        fontOrFallback(doc, 'CertSans', 'Helvetica');
        doc.fontSize(9.5).fillColor(BODY_BLUE);
        return;
      }

      const rowHeight = doc.heightOfString(row.title, { width: cols.moduleWidth });
      doc.text(row.title, cols.colModule, y, { width: cols.moduleWidth });
      doc.text(formatCpeCategory(row.pillarIndex), cols.colCategory, y, {
        width: cols.categoryWidth,
        lineBreak: false,
      });
      const hours =
        row.cpeHours && row.cpeHours !== '—'
          ? String(row.cpeHours).replace(/\s*h$/i, '')
          : '';
      doc.text(hours, cols.colHours, y, {
        width: cols.hoursWidth,
        align: 'right',
        lineBreak: false,
      });
      doc.text(row.completedAt || '', cols.colDate, y, {
        width: cols.dateWidth,
        align: 'right',
        lineBreak: false,
      });
      y += Math.max(rowHeight, 12) + 8;
    });
  }

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(11)
    .fillColor(TITLE_NAVY)
    .text('End of Transcript', margin, pageHeight - margin - 18, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });
}
