import {
  BuildCertificatePdfInput,
  CERT_COLORS,
  CERT_CONTACT,
  flattenTranscriptModules,
  fontOrFallback,
  formatCompletedDate,
  resolveCertificateMarkPath,
} from './certificate-pdf-shared.util';

const HEADER_BLUE = '#003366';

/**
 * ISCA transcript letterhead:
 * Left  — logo + 4-line org name (bold, left-aligned)
 * Right — org title bold + address regular (left-aligned text, block flush to right end)
 */
function drawTranscriptHeader(doc: PDFKit.PDFDocument): number {
  const pageWidth = doc.page.width;
  const margin = 50;
  const top = margin;
  const markPath = resolveCertificateMarkPath();

  const logoHeight = 34;
  const logoWidth = Math.round(logoHeight * 2.9);
  let cursorX = margin;

  if (markPath) {
    try {
      doc.image(markPath, cursorX, top, { fit: [logoWidth, logoHeight] });
      cursorX += logoWidth + 6;
    } catch {
      // continue with text-only org name
    }
  }

  // Left: stacked org name — bold, dark blue, left-aligned (exact sample lines)
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  const leftLines = ['INSTITUTE OF', 'SINGAPORE', 'CHARTERED', 'ACCOUNTANTS'];
  let orgY = top + 1;
  leftLines.forEach((line) => {
    doc
      .fontSize(7.5)
      .fillColor(HEADER_BLUE)
      .text(line, cursorX, orgY, { lineBreak: false });
    orgY += 9;
  });

  // Right block: text left-aligned, but block itself flush to page end
  const titleLines = ['INSTITUTE OF SINGAPORE', 'CHARTERED ACCOUNTANTS'];
  const addressLines = [
    CERT_CONTACT.address1,
    CERT_CONTACT.address2,
    CERT_CONTACT.tel,
    CERT_CONTACT.web,
  ];

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc.fontSize(7.5);
  let rightWidth = Math.max(...titleLines.map((line) => doc.widthOfString(line)));
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc.fontSize(7.5);
  rightWidth = Math.max(rightWidth, ...addressLines.map((line) => doc.widthOfString(line)));
  rightWidth = Math.ceil(rightWidth) + 2;
  const rightX = pageWidth - margin - rightWidth;

  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  titleLines.forEach((line, i) => {
    doc
      .fontSize(7.5)
      .fillColor(HEADER_BLUE)
      .text(line, rightX, top + i * 10, {
        width: rightWidth,
        align: 'left',
        lineBreak: false,
      });
  });

  fontOrFallback(doc, 'CertSans', 'Helvetica');
  let addrY = top + 22;
  addressLines.forEach((line) => {
    doc
      .fontSize(7.5)
      .fillColor(HEADER_BLUE)
      .text(line, rightX, addrY, {
        width: rightWidth,
        align: 'left',
        lineBreak: false,
      });
    addrY += 10;
  });

  return Math.max(orgY, addrY) + 28;
}

function drawTableHeaders(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: {
    margin: number;
    pageWidth: number;
    colModule: number;
    colDate: number;
    colCpe: number;
    moduleWidth: number;
    dateWidth: number;
    cpeWidth: number;
  },
): number {
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc.fontSize(11).fillColor('#000000');
  doc.text('Module(s)', cols.colModule, y, { width: cols.moduleWidth });
  doc.text('Date of Completion', cols.colDate, y, { width: cols.dateWidth });
  doc.text('CPE Hours Awarded', cols.colCpe, y, {
    width: cols.cpeWidth,
    align: 'right',
  });
  y += 16;

  doc
    .moveTo(cols.margin, y)
    .lineTo(cols.pageWidth - cols.margin, y)
    .strokeColor(CERT_COLORS.line)
    .lineWidth(0.6)
    .stroke();

  return y + 14;
}

/**
 * Official ISCA transcript page layout (sample match).
 * Logo kept; header/contact/fields/table/footer fixed to template.
 */
export function drawTranscriptPage(
  doc: PDFKit.PDFDocument,
  input: BuildCertificatePdfInput,
): void {
  doc.addPage({ size: 'A4', margin: 50 });
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let y = drawTranscriptHeader(doc);

  const learnerName = String(input.learnerName || '').trim() || 'Learner';
  const completedAt = formatCompletedDate(input.completedAt);
  const programmeName = String(input.courseTitle || '').trim() || 'Programme';

  // Learner / programme fields — sample style (left-aligned labels)
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc.fontSize(11).fillColor('#000000');
  doc.text(`Name:  ${learnerName}`, margin, y, { width: contentWidth });
  y += 22;
  doc.text(`Date:  ${completedAt || ''}`, margin, y, { width: contentWidth });
  y += 22;
  doc.text(`Programme Name:  ${programmeName}`, margin, y, { width: contentWidth });
  y += 44;

  const cols = {
    margin,
    pageWidth,
    colModule: margin,
    colDate: margin + contentWidth * 0.5,
    colCpe: margin + contentWidth * 0.76,
    moduleWidth: contentWidth * 0.46,
    dateWidth: contentWidth * 0.24,
    cpeWidth: contentWidth * 0.24,
  };

  y = drawTableHeaders(doc, y, cols);

  const rows = flattenTranscriptModules(input.transcript || []);
  fontOrFallback(doc, 'CertSans', 'Helvetica');
  doc.fontSize(10).fillColor('#000000');

  if (!rows.length) {
    doc.text('', margin, y, { width: contentWidth });
  } else {
    rows.forEach((row) => {
      if (y > pageHeight - 90) {
        doc.addPage({ size: 'A4', margin: 50 });
        y = drawTranscriptHeader(doc);
        y = drawTableHeaders(doc, y, cols);
        fontOrFallback(doc, 'CertSans', 'Helvetica');
        doc.fontSize(10).fillColor('#000000');
      }

      if (row.isCourseHeader) {
        y += 8;
        fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
        doc
          .fontSize(10)
          .fillColor(HEADER_BLUE)
          .text(row.title, cols.colModule, y, {
            width: cols.moduleWidth,
            lineBreak: false,
          });
        if (row.completedAt) {
          doc
            .fontSize(10)
            .fillColor(HEADER_BLUE)
            .text(row.completedAt, cols.colDate, y, {
              width: cols.dateWidth,
              lineBreak: false,
            });
        }
        y += 14;
        doc
          .moveTo(cols.margin, y)
          .lineTo(cols.pageWidth - cols.margin, y)
          .strokeColor(HEADER_BLUE)
          .lineWidth(0.9)
          .stroke();
        y += 10;
        fontOrFallback(doc, 'CertSans', 'Helvetica');
        doc.fontSize(10).fillColor('#000000');
        return;
      }

      const rowHeight = doc.heightOfString(row.title, { width: cols.moduleWidth });
      doc.text(row.title, cols.colModule, y, { width: cols.moduleWidth });
      doc.text(row.completedAt || '', cols.colDate, y, { width: cols.dateWidth });
      doc.text(row.cpeHours || '', cols.colCpe, y, {
        width: cols.cpeWidth,
        align: 'right',
        lineBreak: false,
      });
      y += Math.max(rowHeight, 14) + 10;
    });
  }

  // Pin near page bottom, but stay above PDFKit bottom margin (avoids auto page-break)
  fontOrFallback(doc, 'CertSans-Bold', 'Helvetica-Bold');
  doc
    .fontSize(11)
    .fillColor('#000000')
    .text('End of Transcript', margin, pageHeight - margin - 18, {
      width: contentWidth,
      align: 'center',
      lineBreak: false,
    });
}
