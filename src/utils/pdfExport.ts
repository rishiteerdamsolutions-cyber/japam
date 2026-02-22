import { jsPDF } from 'jspdf';

export function downloadMantraPdf(mantra: string, count: number, deityName: string) {
  if (count <= 0) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const lineHeight = 8;
  const fontSize = 5;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');

  const mantraRepeated = Array(count).fill(mantra).join(' ');
  const words = mantraRepeated.split(' ');
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let x = margin;
  let y = margin;
  const maxY = doc.internal.pageSize.getHeight() - margin;

  doc.text(`${deityName} - ${count} Japas`, margin, y);
  y += lineHeight * 2;

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
