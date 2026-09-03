import { downloadOrSaveBlob } from './downloadBlob';

export const FESTIVAL_CREDIT_LINE = 'Built by AI Developer India: Aditya Nandagiri';
export const FESTIVAL_CREDIT_AFTER_LOGO = 'AI Developer India: Aditya Nandagiri';
const A_LOGO_SRC = '/A-logo.png';
const A_LOGO_FALLBACK_SRC = '/images/A-logo.png';
const JAPAM_LOGO_SRC = '/images/logo.png';
const BOARD_DEMO_SRC = encodeURI('/JAPAM DEMO BOARD.jpeg');
const MANTRA_QUOTED = '"108 Om Ganeshaya Namaha"';
/** Logical layout size × this = pixel size. Keeps text sharp after WhatsApp downscales. */
const CERT_EXPORT_SCALE = 3;
/** iOS Safari canvas area limit (approx); dial scale down if needed. */
const MAX_CANVAS_PIXELS = 16_777_216;
/** Cap board height so the card isn’t a tall strip (WhatsApp scales by longest side). */
const BOARD_MAX_H = 300;

function exportScaleFor(logicalW: number, logicalH: number): number {
  const pixelsAtWanted = logicalW * logicalH * CERT_EXPORT_SCALE * CERT_EXPORT_SCALE;
  if (pixelsAtWanted <= MAX_CANVAS_PIXELS) return CERT_EXPORT_SCALE;
  return Math.max(2, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, logicalW * logicalH)));
}

function prepareHdCanvas(
  logicalW: number,
  logicalH: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const scale = exportScaleFor(logicalW, logicalH);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(logicalW * scale));
  canvas.height = Math.max(1, Math.round(logicalH * scale));
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function canvasToShareBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    // JPEG survives WhatsApp photo compression better than PNG→JPEG conversion.
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadImageWithFallback(src: string, fallback?: string): Promise<HTMLImageElement | null> {
  const first = await loadImage(src);
  if (first) return first;
  if (fallback) return loadImage(fallback);
  return null;
}

function drawContainedRoundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  y: number,
  maxW: number,
  maxH: number,
  r = 18,
): number {
  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  const x = centerX - w / 2;
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
  ctx.lineWidth = 3;
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
  return h;
}

function drawGlossBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bg = ctx.createLinearGradient(0, 0, width, height * 1.2);
  // Brown / certificate-like palette (replaces the older pink gloss).
  bg.addColorStop(0, '#8B5E3C');
  bg.addColorStop(0.25, '#7A4A2A');
  bg.addColorStop(0.5, '#8B5E3C');
  bg.addColorStop(0.75, '#6B3F2A');
  bg.addColorStop(1, '#5B321F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.floor(Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Shared smooth gold + white certificate border for WhatsApp cards and organiser reports. */
function drawCertificateFrame(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const rOuter = 26;
  const rMid = 20;
  const rInner = 16;

  // Outer gold band
  ctx.save();
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 10;
  roundedRectPath(ctx, 14, 14, width - 28, height - 28, rOuter);
  ctx.stroke();

  // White band
  ctx.strokeStyle = 'rgba(255,255,255,0.96)';
  ctx.lineWidth = 6;
  roundedRectPath(ctx, 30, 30, width - 60, height - 60, rMid);
  ctx.stroke();

  // Inner gold line
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 3;
  roundedRectPath(ctx, 46, 46, width - 92, height - 92, rInner);
  ctx.stroke();
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

type CertSpanKind = 'plain' | 'name' | 'mantra' | 'event' | 'org';
type CertSpan = { text: string; kind: CertSpanKind };

function gradientForKind(
  ctx: CanvasRenderingContext2D,
  kind: CertSpanKind,
  x: number,
  y: number,
  w: number,
): CanvasGradient | string {
  const g = ctx.createLinearGradient(x, y - 22, x + Math.max(w, 8), y + 6);
  if (kind === 'name') {
    g.addColorStop(0, '#FED7AA');
    g.addColorStop(0.45, '#FB923C');
    g.addColorStop(1, '#EA580C');
    return g;
  }
  if (kind === 'mantra') {
    g.addColorStop(0, '#BBF7D0');
    g.addColorStop(0.45, '#4ADE80');
    g.addColorStop(1, '#15803D');
    return g;
  }
  if (kind === 'event') {
    g.addColorStop(0, '#BFDBFE');
    g.addColorStop(0.45, '#3B82F6');
    g.addColorStop(1, '#1D4ED8');
    return g;
  }
  if (kind === 'org') {
    g.addColorStop(0, '#FDE68A');
    g.addColorStop(0.4, '#F59E0B');
    g.addColorStop(0.75, '#E11D48');
    g.addColorStop(1, '#9F1239');
    return g;
  }
  return 'rgba(255,255,255,0.96)';
}

function wrapSpans(ctx: CanvasRenderingContext2D, spans: CertSpan[], maxWidth: number): CertSpan[][] {
  const lines: CertSpan[][] = [];
  let line: CertSpan[] = [];
  let lineW = 0;

  const pushPiece = (text: string, kind: CertSpanKind) => {
    if (!text) return;
    const w = ctx.measureText(text).width;
    if (lineW + w > maxWidth && line.length) {
      lines.push(line);
      line = [];
      lineW = 0;
    }
    line.push({ text, kind });
    lineW += w;
  };

  for (const span of spans) {
    const wholeW = ctx.measureText(span.text).width;
    if (span.kind !== 'plain' && wholeW <= maxWidth) {
      if (lineW + wholeW > maxWidth && line.length) {
        lines.push(line);
        line = [];
        lineW = 0;
      }
      line.push(span);
      lineW += wholeW;
      continue;
    }
    const parts = span.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (ctx.measureText(part).width > maxWidth) {
        let chunk = '';
        for (const ch of part) {
          const next = chunk + ch;
          if (ctx.measureText(next).width > maxWidth && chunk) {
            pushPiece(chunk, span.kind);
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        if (chunk) pushPiece(chunk, span.kind);
      } else {
        pushPiece(part, span.kind);
      }
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawCenteredSpans(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  spans: CertSpan[],
) {
  const total = spans.reduce((sum, s) => sum + ctx.measureText(s.text).width, 0);
  let x = centerX - total / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const span of spans) {
    const w = ctx.measureText(span.text).width;
    ctx.fillStyle = gradientForKind(ctx, span.kind, x, y, w);
    ctx.fillText(span.text, x, y);
    if (span.kind === 'name' && span.text.trim()) {
      ctx.save();
      ctx.strokeStyle = gradientForKind(ctx, 'name', x, y, w);
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x + w, y + 6);
      ctx.stroke();
      ctx.restore();
    }
    x += w;
  }
  ctx.textAlign = 'center';
}

async function drawFestivalCredit(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  logo: HTMLImageElement | null,
) {
  const mark = 28;
  const gap = 10;
  const before = 'Built by ';
  const after = FESTIVAL_CREDIT_AFTER_LOGO;
  ctx.font = '600 17px "Segoe UI", system-ui, sans-serif';
  const beforeW = ctx.measureText(before).width;
  const afterW = ctx.measureText(after).width;
  const logoW = logo ? mark : 0;
  const total = beforeW + logoW + (logo ? gap : 0) + afterW;
  let x = (width - total) / 2;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(before, x, y);
  x += beforeW;

  if (logo) {
    ctx.drawImage(logo, x, y - mark / 2, mark, mark);
    x += mark + gap;
  }

  ctx.fillText(after, x, y);
}

export async function renderSatsangDevoteeCardBlob(opts: {
  orgName: string;
  eventName: string;
  devoteeName: string;
  dateLabel: string;
}): Promise<Blob | null> {
  const width = 720;
  const measure = document.createElement('canvas');
  const mctx = measure.getContext('2d');
  if (!mctx) return null;

  const logo = await loadImageWithFallback(A_LOGO_SRC, A_LOGO_FALLBACK_SRC);
  const japamLogo = await loadImage(JAPAM_LOGO_SRC);
  const boardDemo = await loadImage(BOARD_DEMO_SRC);

  const font = '"Segoe UI", system-ui, sans-serif';
  const contentLeft = 84;
  const contentWidth = width - contentLeft * 2;
  const footerReserve = 128;
  const name = (opts.devoteeName || 'Devotee').trim();
  const org = (opts.orgName || 'the organiser').trim();
  const eventName = (opts.eventName || 'Ganesha Utsav').trim();
  const blessing =
    'Continue receiving the blessings of Lord Ganesha by practising Japa on the Japam Web App.';

  const bodyFont = `600 24px ${font}`;
  mctx.font = bodyFont;
  const bodySpans: CertSpan[] = [
    { text: 'This is to certify that ', kind: 'plain' },
    { text: name, kind: 'name' },
    { text: ' has successfully participated and completed ', kind: 'plain' },
    { text: MANTRA_QUOTED, kind: 'mantra' },
    { text: ' Japam at ', kind: 'plain' },
    { text: eventName, kind: 'event' },
    { text: ', organised by ', kind: 'plain' },
    { text: org, kind: 'org' },
    { text: '.', kind: 'plain' },
  ];
  const bodyLines = wrapSpans(mctx, bodySpans, contentWidth);
  mctx.font = `600 22px ${font}`;
  const blessingLines = wrapLines(mctx, blessing, contentWidth);

  let y = 132;
  y += 34; // title
  y += 30; // JAPAM
  y += 34; // Ganesha Utsav
  y += 36; // mantra
  y += bodyLines.length * 38;
  y += 22;
  y += 28; // date
  y += 22;
  y += blessingLines.length * 30;
  y += 22;

  let boardH = 0;
  if (boardDemo) {
    const aspect = boardDemo.naturalWidth / Math.max(1, boardDemo.naturalHeight);
    const boardW = contentWidth;
    boardH = Math.min(boardW / aspect, BOARD_MAX_H);
    y += boardH + 16;
  }

  const height = Math.ceil(y + footerReserve);
  const prepared = prepareHdCanvas(width, height);
  if (!prepared) return null;
  const { canvas, ctx } = prepared;

  drawGlossBackground(ctx, width, height);
  drawCertificateFrame(ctx, width, height);

  let drawY = 132;
  if (japamLogo) {
    const logoSize = 72;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(japamLogo, width / 2 - logoSize / 2, 42, logoSize, logoSize);
    ctx.restore();
    drawY = 128;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FBBF24';
  ctx.font = `800 38px Georgia, "Times New Roman", serif`;
  ctx.fillText('Certificate of Appreciation', width / 2, drawY);
  drawY += 34;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 24px ${font}`;
  ctx.fillText('JAPAM', width / 2, drawY);
  drawY += 30;

  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 28px Georgia, serif`;
  ctx.fillText('Ganesha Utsav', width / 2, drawY);
  drawY += 34;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 22px ${font}`;
  ctx.fillText(MANTRA_QUOTED, width / 2, drawY);
  drawY += 36;

  ctx.font = bodyFont;
  for (const line of bodyLines) {
    drawCenteredSpans(ctx, width / 2, drawY, line);
    drawY += 38;
  }

  drawY += 18;
  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 22px ${font}`;
  ctx.fillText(opts.dateLabel, width / 2, drawY);
  drawY += 28;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `600 22px ${font}`;
  for (const line of blessingLines) {
    ctx.fillText(line, width / 2, drawY);
    drawY += 30;
  }

  drawY += 20;
  if (boardDemo) {
    drawContainedRoundedImage(ctx, boardDemo, width / 2, drawY, contentWidth, boardH + 4, 18);
  }

  await drawFestivalCredit(ctx, width, height - 104, logo);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 18px ${font}`;
  ctx.fillText('www.japam.digital', width / 2, height - 60);

  return canvasToShareBlob(canvas);
}

export async function renderSatsangReportCardBlob(opts: {
  orgName: string;
  eventName: string;
  dateLabel: string;
  names: string[];
  participantCount: number;
  cap: number;
}): Promise<Blob | null> {
  const width = 720;
  const boardDemo = await loadImage(BOARD_DEMO_SRC);
  const contentWidth = width - 168;
  const boardH = boardDemo
    ? Math.min(
        contentWidth / (boardDemo.naturalWidth / Math.max(1, boardDemo.naturalHeight)),
        BOARD_MAX_H,
      )
    : 0;
  const nameBlock = Math.max(opts.names.length, 1) * 36;
  const height = Math.max(1280, 520 + nameBlock + 180 + (boardH ? boardH + 48 : 0));
  const prepared = prepareHdCanvas(width, height);
  if (!prepared) return null;
  const { canvas, ctx } = prepared;

  const logo = await loadImageWithFallback(A_LOGO_SRC, A_LOGO_FALLBACK_SRC);
  const japamLogo = await loadImage(JAPAM_LOGO_SRC);
  drawGlossBackground(ctx, width, height);
  drawCertificateFrame(ctx, width, height);

  const font = '"Segoe UI", system-ui, sans-serif';
  let y = 150;

  if (japamLogo) {
    const logoSize = 86;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(japamLogo, width / 2 - logoSize / 2, 38, logoSize, logoSize);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FBBF24';
  ctx.font = `800 42px Georgia, serif`;
  ctx.fillText('JAPAM', width / 2, y);
  y += 38;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `600 20px ${font}`;
  ctx.fillText('japam.digital', width / 2, y);
  y += 44;

  ctx.fillStyle = '#FBBF24';
  ctx.font = `800 34px Georgia, serif`;
  ctx.fillText('Ganesha Utsav', width / 2, y);
  y += 40;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 26px ${font}`;
  ctx.fillText(MANTRA_QUOTED, width / 2, y);
  y += 40;

  ctx.fillStyle = '#FBBF24';
  ctx.font = `600 24px ${font}`;
  for (const line of wrapLines(ctx, opts.eventName || 'Satsang report', contentWidth)) {
    ctx.fillText(line, width / 2, y);
    y += 32;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 22px ${font}`;
  for (const line of wrapLines(ctx, opts.orgName, contentWidth)) {
    ctx.fillText(line, width / 2, y);
    y += 30;
  }

  ctx.font = `500 20px ${font}`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(opts.dateLabel, width / 2, y + 8);
  y += 48;

  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 26px ${font}`;
  ctx.fillText(`${opts.participantCount} / ${opts.cap} participants`, width / 2, y);
  y += 42;

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `600 22px ${font}`;
  const names = opts.names.slice(0, opts.cap);
  if (names.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillText('No participants yet', width / 2, y + 20);
    y += 56;
  } else {
    names.forEach((n, i) => {
      ctx.fillText(`${i + 1}. ${n}`, 88, y + i * 36);
    });
    y += names.length * 36;
  }

  if (boardDemo) {
    y += 24;
    ctx.textAlign = 'center';
    drawContainedRoundedImage(ctx, boardDemo, width / 2, y, contentWidth, boardH + 4, 18);
  }

  await drawFestivalCredit(ctx, width, height - 104, logo);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 18px ${font}`;
  ctx.fillText('www.japam.digital', width / 2, height - 60);
  return canvasToShareBlob(canvas);
}

export function downloadBlobPng(blob: Blob, filename: string) {
  void downloadOrSaveBlob(blob, filename);
}

export async function downloadBlobPngAsync(blob: Blob, filename: string) {
  return downloadOrSaveBlob(blob, filename);
}
