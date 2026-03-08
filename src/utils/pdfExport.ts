import { jsPDF } from 'jspdf';

export interface PdfDetails {
  name: string;
  gotram: string;
  mobileNumber: string;
}

/**
 * Colorizes an image (dark-on-transparent) to blue ink using canvas.
 * Used in-memory only; image is never persisted.
 */
async function colorizeImageToBlue(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!dataUrl.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]!;
        if (alpha > 0) {
          data[i] = 37;     // R for #2563eb
          data[i + 1] = 99; // G
          data[i + 2] = 235; // B
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Adds tiled handwritten images to the PDF.
 * Cell size matches the text-based layout: fontSize 5pt, lineHeight 8pt.
 */
function addHandwrittenJapasToPdf(
  doc: jsPDF,
  imageDataUrl: string,
  count: number,
  startY: number,
  margin: number,
  lineHeight: number,
  fontSize: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  // Match text-based layout: each handwritten nama same size as mantra text
  const cellHeight = lineHeight; // 8pt - same as text line height
  const cellWidth = fontSize * 12; // ~60pt - approx width of a mantra at 5pt
  const cellPadding = 2;
  const cols = Math.max(1, Math.floor((usableWidth + cellPadding) / (cellWidth + cellPadding)));
  const rowHeight = cellHeight + cellPadding;

  let y = startY;
  let x = margin;
  let col = 0;

  for (let i = 0; i < count; i++) {
    if (y + cellHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      x = margin;
      col = 0;
    }
    doc.addImage(
      imageDataUrl,
      'PNG',
      x,
      y,
      cellWidth,
      cellHeight,
      undefined,
      'FAST'
    );
    col++;
    if (col >= cols) {
      col = 0;
      x = margin;
      y += rowHeight;
    } else {
      x += cellWidth + cellPadding;
    }
  }
}

export async function downloadMantraPdf(
  mantra: string,
  count: number,
  deityName: string,
  details?: PdfDetails,
  handwritingImageDataUrl?: string | null
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

  if (handwritingImageDataUrl) {
    const blueImageDataUrl = await colorizeImageToBlue(handwritingImageDataUrl);
    addHandwrittenJapasToPdf(doc, blueImageDataUrl, count, y, margin, lineHeight, fontSize);
  } else {
    // Default: text-based japas
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
  }

  doc.save(`${deityName}-${count}-japas.pdf`);
}
