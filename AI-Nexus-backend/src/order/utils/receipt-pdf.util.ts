import PDFDocument from 'pdfkit';
import { OrderEntity } from '../order.entity';
import { join } from 'path';

type BuildReceiptOptions = {
  logoUrl?: string | null;
};

export async function buildOrderReceiptPdf(
  order: OrderEntity,
  options: BuildReceiptOptions = {},
): Promise<{ filename: string; buffer: Buffer }> {
  const formatInvoiceDate = (date: Date): string =>
    date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const PRIMARY = '#1C4270';
  const ACCENT = '#E32B24';
  const TEXT_MUTED = '#5F6673';
  const BORDER = '#D9DCE3';
  const BG_SOFT = '#1C4270';

  const items = Array.isArray(order.items) ? order.items : [];
  const currency = order.currency || 'SGD';
  const amount = Number(order.totalAmount || 0).toFixed(2);
  const createdAt = order.createdAt ? formatInvoiceDate(order.createdAt) : 'N/A';
  const clientReferenceId = order.clientReferenceId || 'N/A';
  const wooshpaySessionId = order.wooshpaySessionId || 'N/A';
  const paymentMethod = 'WooshPay Speedy Card';
  const trackingNo = wooshpaySessionId || 'N/A';
  const customerName = order.user
    ? `${(order.user as any).firstname ?? ''} ${(order.user as any).lastname ?? ''}`.trim() || (order.user as any).email
    : 'N/A';
  const customerEmail = order.user ? (order.user as any).email || 'N/A' : 'N/A';

  // Use dynamic page height to avoid large empty space at the bottom.
  const infoRows = 6;
  const itemRows = items.length > 0 ? items.length : Math.max(String(order.courseIds || '').split(',').filter(Boolean).length, 1);
  const estimatedTableStartY = 120 + 22 + infoRows * 16 + 14;
  const estimatedItemsEndY = estimatedTableStartY + 50 + itemRows * 26;
  const estimatedTotalEndY = estimatedItemsEndY + 10 + 60;
  const dynamicPageHeight = Math.max(600, Math.min(842, estimatedTotalEndY + 130));

  const doc = new PDFDocument({ size: [595.28, dynamicPageHeight], margin: 40 });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;

    // Top stripe
    doc.rect(0, 0, pageWidth, 14).fill(PRIMARY);

    // Dynamic logo
    const logoUrl = options.logoUrl || null;
    let logoRendered = false;
    if (logoUrl && logoUrl.startsWith('/uploads/')) {
      const logoAbsolutePath = join(process.cwd(), 'public', logoUrl.replace('/uploads/', 'uploads/'));
      try {
        doc.image(logoAbsolutePath, margin, 30, { fit: [120, 45] });
        logoRendered = true;
      } catch {
        logoRendered = false;
      }
    }
    if (!logoRendered) {
      doc
        .fontSize(14)
        .fillColor(PRIMARY)
        .font('Helvetica-Bold')
        .text('AI-NEXUS', margin, 36);
    }

    // Title centered on logo line
    doc
      .font('Helvetica-Bold')
      .fontSize(34)
      .fillColor(PRIMARY)
      .text('INVOICE', 0, 38, { width: pageWidth, align: 'center' });

    // Inline sections: Order info (left), Customer info at right-end
    const blockTop = 120;
    const sectionGap = 24;
    const sectionW = (pageWidth - margin * 2 - sectionGap) / 2;
    const leftBlockX = margin;
    const rightBlockX = leftBlockX + sectionW + sectionGap;

    // Order information (left)
    const infoX = leftBlockX;
    const infoY = blockTop;

    const fields: Array<{ label: string; value: string }> = [
      { label: 'Tracking No.', value: trackingNo },
      { label: 'Client Reference ID', value: clientReferenceId },
      { label: 'Payment Method', value: paymentMethod },
      { label: 'Payment Status', value: String(order.paymentStatus || 'paid') },
      { label: 'Ship by', value: 'WooshPay' },
      { label: 'Created At', value: createdAt },
    ];

    doc.font('Helvetica-Bold').fontSize(14).fillColor(PRIMARY).text('Order Information', infoX, infoY);
    const labelWidth = 104;
    const valueX = infoX + labelWidth + 6;
    const valueWidth = sectionW - labelWidth - 6;
    fields.forEach((field, index) => {
      const y = infoY + 22 + index * 16;
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#111827')
        .text(`${field.label}:`, infoX, y, { width: labelWidth, lineBreak: false });
      if (field.label === 'Payment Status') {
        const status = String(field.value || '').toLowerCase();
        const isPositive = status === 'paid' || status === 'completed' || status === 'success';
        const bg = isPositive ? '#E8F7EF' : '#FDECEC';
        const fg = isPositive ? '#0F8A43' : '#B42318';
        doc.roundedRect(valueX, y - 1, 64, 13, 3).fillColor(bg).fill();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(fg).text(`${field.value}`, valueX + 7, y + 2, {
          width: 50,
          lineBreak: false,
        });
      } else if (field.label === 'Tracking No.') {
        doc.roundedRect(valueX, y - 1, valueWidth, 13, 3).fillColor('#EAF0FB').fill();
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1C4270').text(`${field.value}`, valueX + 6, y + 2, {
          width: valueWidth - 10,
          lineBreak: false,
          ellipsis: true,
        });
      } else {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(TEXT_MUTED)
          .text(`${field.value}`, valueX, y, { width: valueWidth, lineBreak: false });
      }
    });

    // Customer information (right, same top line as order section)
    const customerTop = infoY;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(PRIMARY).text('Customer Information', rightBlockX, customerTop, { width: sectionW });
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#111827')
      .text(customerName || 'Customer', rightBlockX, customerTop + 22, { width: sectionW });
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT_MUTED)
      .text(customerEmail || 'N/A', rightBlockX, customerTop + 42, { width: sectionW });

    // Table header
    const tableX = margin;
    const tableY = infoY + 22 + fields.length * 16 + 14;
    const tableW = pageWidth - margin * 2;
    const colItem = tableX + 14;
    const colQty = tableX + tableW - 240;
    const colPrice = tableX + tableW - 160;
    const colAmount = tableX + tableW - 70;

    doc.roundedRect(tableX, tableY, tableW, 36, 2).fill(BG_SOFT);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('Item', colItem, tableY + 12);
    doc.text('Qty', colQty, tableY + 12, { width: 40, align: 'right' });
    doc.text('Price', colPrice, tableY + 12, { width: 60, align: 'right' });
    doc.text('Amount', colAmount, tableY + 12, { width: 60, align: 'right' });

    let y = tableY + 50;
    doc.font('Helvetica').fontSize(11).fillColor('#111827');

    if (items.length > 0) {
      items.forEach((item, index) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0).toFixed(2);
        const lineTotal = (Number(item.price || 0) * qty).toFixed(2);
        doc.text(item.name || `Course ${index + 1}`, colItem, y, { width: tableW - 280 });
        doc.text(String(qty), colQty, y, { width: 40, align: 'right' });
        doc.text(`${currency} ${price}`, colPrice, y, { width: 60, align: 'right' });
        doc.text(`${currency} ${lineTotal}`, colAmount, y, { width: 60, align: 'right' });
        y += 26;
      });
    } else {
      const ids = String(order.courseIds || '')
        .split(',')
        .filter(Boolean);
      if (ids.length === 0) {
        doc.text('No line items recorded.', colItem, y);
        y += 26;
      } else {
        ids.forEach((courseId) => {
          doc.text(`Course ID: ${courseId}`, colItem, y, { width: tableW - 280 });
          doc.text('1', colQty, y, { width: 40, align: 'right' });
          doc.text(`${currency} 0.00`, colPrice, y, { width: 60, align: 'right' });
          doc.text(`${currency} 0.00`, colAmount, y, { width: 60, align: 'right' });
          y += 26;
        });
      }
    }

    // Total section
    const totalBoxY = y + 10;
    doc.moveTo(tableX, totalBoxY).lineTo(tableX + tableW, totalBoxY).strokeColor(BORDER).stroke();
    doc.font('Helvetica-Bold').fontSize(13).fillColor(PRIMARY).text('Total', colPrice - 20, totalBoxY + 12, { width: 80, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(ACCENT).text(`${currency} ${amount}`, colAmount - 4, totalBoxY + 10, {
      width: 90,
      align: 'right',
    });

    doc.font('Helvetica').fontSize(10).fillColor(TEXT_MUTED).text(`Payment method: ${paymentMethod}`, margin, totalBoxY + 44);
    doc.text('Note: Thank you for choosing us!', margin, totalBoxY + 60);

    // Decorative bottom waves (dynamic position to avoid large empty gap)
    const waveY = Math.min(pageHeight - 120, Math.max(totalBoxY + 70, 500));
    doc
      .moveTo(0, waveY)
      .bezierCurveTo(pageWidth * 0.25, waveY - 40, pageWidth * 0.55, waveY + 30, pageWidth, waveY - 20)
      .lineTo(pageWidth, pageHeight)
      .lineTo(0, pageHeight)
      .closePath()
      .fillOpacity(0.9)
      .fill(ACCENT);

    doc
      .moveTo(0, waveY + 35)
      .bezierCurveTo(pageWidth * 0.35, waveY - 5, pageWidth * 0.7, waveY + 45, pageWidth, waveY + 10)
      .lineTo(pageWidth, pageHeight)
      .lineTo(0, pageHeight)
      .closePath()
      .fillOpacity(0.9)
      .fill(PRIMARY);

    doc.fillOpacity(1);
    doc.end();
  });

  return {
    filename: `receipt-${order.id.slice(0, 8)}.pdf`,
    buffer: Buffer.concat(chunks),
  };
}
