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
