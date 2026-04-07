import { jsPDF } from 'jspdf';

export function downloadOccasionSummaryPdf(opts: {
  title: string;
  lines: string[];
  footer?: string;
}): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;
  doc.setFontSize(16);
  doc.setTextColor(180, 120, 40);
  doc.text(opts.title, margin, y);
  y += 28;
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  for (const line of opts.lines) {
    const parts = doc.splitTextToSize(line, 520);
    for (const p of parts) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text(p, margin, y);
      y += 16;
    }
  }
  if (opts.footer) {
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const fparts = doc.splitTextToSize(opts.footer, 520);
    for (const p of fparts) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text(p, margin, y);
      y += 14;
    }
  }
  doc.save(`japam-${opts.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function downloadAnniversaryReportPdf(opts: {
  title: string;
  husbandJapas: number;
  wifeJapas: number;
  yourRoleLabel?: string;
  yourJapas?: number;
  footer?: string;
}): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background (rank-card inspired): deep pink + dark translucent card + amber border.
  doc.setFillColor(194, 24, 91);
  doc.rect(0, 0, W, H, 'F');

  const pad = 48;
  const cardX = pad;
  const cardY = 84;
  const cardW = W - pad * 2;
  const cardH = H - cardY - 92;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(cardX, cardY, cardW, cardH, 18, 18, 'F');

  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(2);
  doc.roundedRect(cardX, cardY, cardW, cardH, 18, 18, 'S');

  let y = cardY + 46;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(253, 230, 138);
  doc.text(opts.title, cardX + 28, y);
  y += 30;

  const coupleTotal = Math.max(0, Math.round(opts.husbandJapas ?? 0)) + Math.max(0, Math.round(opts.wifeJapas ?? 0));

  // Couple total
  doc.setFont('times', 'bold');
  doc.setFontSize(44);
  doc.setTextColor(251, 191, 36);
  doc.text(String(coupleTotal), cardX + 28, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Couple japas (this session)', cardX + 28, y + 54);
  y += 92;

  // Stats rows
  const sharedToWife = Math.ceil((opts.husbandJapas ?? 0) / 2);
  const wifeTotal = (opts.wifeJapas ?? 0) + sharedToWife;
  const lines = [
    [`Husband japas`, String(opts.husbandJapas ?? 0)],
    [`Wife japas`, String(opts.wifeJapas ?? 0)],
    [`Shared to wife`, String(sharedToWife)],
    [`Wife total punya`, String(wifeTotal)],
  ] as const;

  const rowX = cardX + 28;
  const rowW = cardW - 56;
  for (const [label, value] of lines) {
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(rowX, y, rowW, 44, 12, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(253, 230, 138);
    doc.text(label, rowX + 14, y + 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(value, rowX + rowW - 14, y + 28, { align: 'right' });
    y += 54;
  }

  if (typeof opts.yourJapas === 'number' && opts.yourRoleLabel) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(253, 230, 138);
    doc.text(`Your japas (${opts.yourRoleLabel})`, rowX + 2, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(String(opts.yourJapas), rowX + rowW - 14, y + 16, { align: 'right' });
    y += 34;
  }

  if (opts.footer) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const parts = doc.splitTextToSize(opts.footer, rowW);
    doc.text(parts, rowX, cardY + cardH - 26);
  }

  doc.save(`japam-${opts.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
