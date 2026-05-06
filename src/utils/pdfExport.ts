import { jsPDF } from 'jspdf';

export interface PdfDetails {
  name: string;
  gotram: string;
  mobileNumber: string;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('Failed to read image'));
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Composites a transparent image onto white and exports as JPEG.
 * Opaque JPEG avoids PDF viewer issues with transparent PNGs (e.g. colored boxes).
 */
async function compositeOnWhiteAsJpeg(dataUrl: string): Promise<string> {
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
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Get image dimensions from data URL.
 */
function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Adds handwritten nama images to the PDF in horizontal rows, one after the other.
 * Nama size matches Name/Gotram/Mobile text (headingSize 10pt). Layout: left-to-right.
 */
async function addHandwrittenJapasToPdf(
  doc: jsPDF,
  imageDataUrl: string,
  count: number,
  startY: number,
  contentTopY: number,
  contentBottomY: number,
  margin: number,
  headingSize: number
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - margin * 2;

  const { w: imgW, h: imgH } = await getImageDimensions(imageDataUrl);
  const imgAspect = imgW / imgH;

  // Nama height = same as Name/Gotram/Mobile font size (headingSize)
  const cellHeight = headingSize;
  let cellWidth = cellHeight * imgAspect;
  cellWidth = Math.min(usableWidth, Math.max(12, cellWidth));

  const cellPadding = 3;
  const cols = Math.max(1, Math.floor((usableWidth + cellPadding) / (cellWidth + cellPadding)));
  const rowHeight = cellHeight + cellPadding;
  const imageFormat = imageDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';

  let y = startY;
  let x = margin;
  let col = 0;

  for (let i = 0; i < count; i++) {
    if (y + cellHeight > contentBottomY) {
      doc.addPage();
      y = contentTopY;
      x = margin;
      col = 0;
    }
    // Preserve aspect ratio: fit image inside cell
    const cellAspect = cellWidth / cellHeight;
    let drawW = cellWidth;
    let drawH = cellHeight;
    if (imgAspect > cellAspect) {
      drawH = cellWidth / imgAspect;
    } else {
      drawW = cellHeight * imgAspect;
    }
    const offsetX = (cellWidth - drawW) / 2;
    const offsetY = (cellHeight - drawH) / 2;
    doc.addImage(
      imageDataUrl,
      imageFormat,
      x + offsetX,
      y + offsetY,
      drawW,
      drawH,
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

export interface MantraPdfOptions {
  /** e.g. "3-gem line" — included in the summary line and suggested filename. */
  matchTierNote?: string;
  /** Base filename without `.pdf` (ASCII-safe recommended). */
  fileStem?: string;
}

function safePdfFileStem(stem: string): string {
  return stem.replace(/[^\w\-.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'japam-japa';
}

export async function downloadMantraPdf(
  mantra: string,
  count: number,
  deityName: string,
  details?: PdfDetails,
  handwritingImageDataUrl?: string | null,
  options?: MantraPdfOptions
) {
  if (count <= 0) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const lineHeight = 8;
  const fontSize = 5;
  const titleSize = 16;
  const headingSize = 10;
  doc.setFont('helvetica', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentTopY = margin + 58;
  const contentBottomY = pageHeight - margin - 28;

  const logoDataUrl = await fetchImageAsDataUrl('/images/favicon.png');
  const logoSize = 22;

  const drawChromeForPage = (pageNumber: number, totalPages: number) => {
    // Top-right page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const pn = `${pageNumber} / ${totalPages}`;
    doc.text(pn, pageWidth - margin, margin - 10, { align: 'right' });

    // Header: logo + JAPAM centered
    const headerY = margin;
    const centerX = pageWidth / 2;
    if (logoDataUrl) {
      try {
        const fmt = logoDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        doc.addImage(logoDataUrl, fmt, centerX - logoSize / 2, headerY - 2, logoSize, logoSize, undefined, 'FAST');
      } catch {
        // ignore logo draw failures; keep PDF functional
      }
    }
    doc.setFontSize(titleSize);
    doc.setFont('times', 'bold');
    doc.setTextColor(251, 191, 36); // amber-400 #FBBF24
    doc.text('JAPAM', centerX, headerY + 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Footer: website centered
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text('www.japam.digital', centerX, pageHeight - 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  let y = contentTopY;

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

  // Deity, count, optional match-tier note
  doc.setFontSize(fontSize);
  const summaryLine = options?.matchTierNote
    ? `${deityName} - ${count} Japas (${options.matchTierNote})`
    : `${deityName} - ${count} Japas`;
  doc.text(summaryLine, margin, y);
  y += lineHeight * 2;

  if (handwritingImageDataUrl) {
    // Use handwriting as-is (background already removed); composite on white for PDF compatibility
    const opaqueImageDataUrl = await compositeOnWhiteAsJpeg(handwritingImageDataUrl);
    await addHandwrittenJapasToPdf(doc, opaqueImageDataUrl, count, y, contentTopY, contentBottomY, margin, headingSize);
  } else {
    // Default: text-based japas
    const mantraRepeated = Array(count).fill(mantra).join(' ');
    const words = mantraRepeated.split(' ');
    const usableTextWidth = pageWidth - margin * 2;
    const x = margin;
    const maxY = contentBottomY;

    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const textWidth = doc.getTextWidth(testLine);
      if (textWidth > usableTextWidth && line) {
        doc.text(line, x, y);
        y += lineHeight;
        line = word;
        if (y > maxY) {
          doc.addPage();
          y = contentTopY;
        }
      } else {
        line = testLine;
      }
    }
    if (line) doc.text(line, x, y);
  }

  // Draw header/footer/page numbers on every page (after content, so numbering is correct).
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawChromeForPage(i, totalPages);
  }

  const defaultStem = `${deityName}-${count}-japas`;
  const stem = options?.fileStem ?? defaultStem;
  doc.save(`${safePdfFileStem(stem)}.pdf`);
}
