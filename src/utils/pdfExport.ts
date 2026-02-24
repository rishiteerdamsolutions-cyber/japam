import { jsPDF } from 'jspdf';

export interface PdfDetails {
  name: string;
  gotram: string;
  mobileNumber: string;
}

export function downloadMantraPdf(
  mantra: string,
  count: number,
  deityName: string,
  details?: PdfDetails
) {
  if (count <= 0) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const lineHeight = 8;
  const fontSize = 5;
  const titleSize = 16;
  const headingSize = 10;
  doc.setFont('helvetica', 'normal');

  let y = margin;

  // Heading: JAPAM
  doc.setFontSize(titleSize);
  doc.setFont('helvetica', 'bold');
  doc.text('JAPAM', margin, y);
  y += lineHeight * 2.5;

  // User details if provided
  if (details?.name || details?.gotram || details?.mobileNumber) {
    doc.setFontSize(headingSize);
    doc.setFont('helvetica', 'normal');
    if (details.name) {
      doc.text(`Name: ${details.name}`, margin, y);
      y += lineHeight * 1.5;
    }
    if (details.gotram) {
      doc.text(`Gotram: ${details.gotram}`, margin, y);
      y += lineHeight * 1.5;
    }
    if (details.mobileNumber) {
      doc.text(`Mobile: ${details.mobileNumber}`, margin, y);
      y += lineHeight * 1.5;
    }
    y += lineHeight;
  }

  // Deity and count
  doc.setFontSize(fontSize);
  doc.text(`${deityName} - ${count} Japas`, margin, y);
  y += lineHeight * 2;

  const mantraRepeated = Array(count).fill(mantra).join(' ');
  const words = mantraRepeated.split(' ');
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let x = margin;
  const maxY = doc.internal.pageSize.getHeight() - margin;

  let line = '';
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const textWidth = doc.getTextWidth(testLine);
    if (textWidth > pageWidth && line) {
      doc.text(line, x, y);
      y += lineHeight;
      line = word;
      if (y > maxY) {
        doc.addPage();
        y = margin;
      }
    } else {
      line = testLine;
    }
  }
  if (line) doc.text(line, x, y);

  doc.save(`${deityName}-${count}-japas.pdf`);
}
