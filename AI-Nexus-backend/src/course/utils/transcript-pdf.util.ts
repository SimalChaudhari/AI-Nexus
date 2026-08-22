import {
  BuildCertificatePdfInput,
  drawTripleLogoHeader,
  flattenTranscriptModules,
  fontOrFallback,
} from './certificate-pdf-shared.util';

const TITLE_NAVY = '#0E3A6E';
const BODY_BLUE = '#1A4A82';
const LINE_BLUE = '#1A4A82';

const PROGRAMME_SUBTITLE =
  'A programme under the GovernWell Series by the Charity Council of Singapore';

/**
 * Transcript letterhead — same triple logo lockup as certificate page.
 */
function drawTranscriptHeader(doc: PDFKit.PDFDocument): number {
  return drawTripleLogoHeader(doc, 42, 36);
}

/** Fixed sample title + programme subtitle (Crimson Pro / Open Sans). */
function drawProgrammeTitleBlock(doc: PDFKit.PDFDocument, y: number, contentWidth: number, margin: number): number {
  // Same faux-bold as certificate “CERTIFICATE OF ATTENDANCE” (stroke + fill)
  fontOrFallback(doc, 'CertSerif-Bold', 'Times-Bold');
  doc
    .fontSize(20)
    .fillColor(TITLE_NAVY)
    .strokeColor(TITLE_NAVY)
    .lineWidth(0.55);

  doc.text('FINANCIAL STEWARDSHIP', margin, y, {
    width: contentWidth,
    align: 'center',
    characterSpacing: 1.8,
    lineBreak: false,
    fill: true,
    stroke: true,
  });
  y += 26;
  doc.text('FOR CHARITIES', margin, y, {
    width: contentWidth,
    align: 'center',
    characterSpacing: 1.8,
    lineBreak: false,
    fill: true,
    stroke: true,
  });
  y += 26;

  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc.fontSize(10).fillColor(BODY_BLUE);
  doc.text(PROGRAMME_SUBTITLE, margin, y, {
    width: contentWidth,
    align: 'center',
  });
  y = doc.y + 34;

  return y;
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
 * Transcript page — GovernWell / Financial Stewardship sample layout + certificate fonts.
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

  let y = drawTranscriptHeader(doc);
  y = drawProgrammeTitleBlock(doc, y, contentWidth, margin);

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
        y = drawTranscriptHeader(doc);
        y = drawProgrammeTitleBlock(doc, y, contentWidth, margin);
        y = drawTableHeaders(doc, y, cols);
        fontOrFallback(doc, 'CertSans', 'Helvetica');
        doc.fontSize(9.5).fillColor(BODY_BLUE);
      }

      if (row.isCourseHeader) {
        y += 6;
        fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
        doc
          .fontSize(10)
          .fillColor(TITLE_NAVY)
          .text(row.title, cols.colModule, y, {
            width: contentWidth,
            lineBreak: false,
          });
        y += 16;
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
