import { downloadOrSaveBlob } from './downloadBlob';

export const FESTIVAL_CREDIT_LINE = 'Built by AI Developer India: Aditya Nandagiri';
export const FESTIVAL_CREDIT_AFTER_LOGO = 'AI Developer India: Aditya Nandagiri';
const A_LOGO_SRC = '/A-logo.png';
const A_LOGO_FALLBACK_SRC = '/images/A-logo.png';
const JAPAM_LOGO_SRC = '/images/logo.png';
const BOARD_DEMO_SRC = encodeURI('/JAPAM DEMO BOARD.jpeg');
const MANTRA_LINE = '108 Om Ganeshaya Namaha Japam';

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0] || '';
    const base64 = parts.slice(1).join(',');
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mime = mimeMatch?.[1] || 'image/png';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
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
  const appreciation =
    `This is to certify that ${name} has successfully participated and completed ${MANTRA_LINE} at Ganesha Utsav, organised by ${org}.`;
  const blessing =
    'Continue receiving the blessings of Lord Ganesha by practising Japa on the Japam Web App.';

  mctx.font = `600 24px ${font}`;
  const appreciationLines = wrapLines(mctx, appreciation, contentWidth);
  mctx.font = `600 22px ${font}`;
  const blessingLines = wrapLines(mctx, blessing, contentWidth);

  let y = 132;
  y += 34; // title
  y += 30; // JAPAM
  y += 34; // Ganesha Utsav
  y += 36; // mantra
  y += appreciationLines.length * 34;
  y += 22;
  y += 28; // date
  y += 22;
  y += blessingLines.length * 30;
  y += 22;

  let boardH = 0;
  if (boardDemo) {
    const aspect = boardDemo.naturalWidth / Math.max(1, boardDemo.naturalHeight);
    const boardW = contentWidth;
    boardH = boardW / aspect;
    y += boardH + 16;
  }

  const height = Math.ceil(y + footerReserve);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `600 22px ${font}`;
  ctx.fillText(MANTRA_LINE, width / 2, drawY);
  drawY += 36;

  ctx.fillStyle = '#fff';
  ctx.font = `600 24px ${font}`;
  for (const line of appreciationLines) {
    ctx.fillText(line, width / 2, drawY);
    drawY += 34;
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

  return dataUrlToBlob(canvas.toDataURL('image/png'));
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
    ? contentWidth / (boardDemo.naturalWidth / Math.max(1, boardDemo.naturalHeight))
    : 0;
  const nameBlock = Math.max(opts.names.length, 1) * 36;
  const height = Math.max(1280, 520 + nameBlock + 180 + (boardH ? boardH + 48 : 0));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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

  ctx.fillStyle = '#fff';
  ctx.font = `700 26px ${font}`;
  ctx.fillText(MANTRA_LINE, width / 2, y);
  y += 40;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `600 24px ${font}`;
  for (const line of wrapLines(ctx, opts.eventName || 'Satsang report', contentWidth)) {
    ctx.fillText(line, width / 2, y);
    y += 32;
  }

  ctx.font = `600 22px ${font}`;
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
  return dataUrlToBlob(canvas.toDataURL('image/png'));
}

export function downloadBlobPng(blob: Blob, filename: string) {
  void downloadOrSaveBlob(blob, filename);
}

export async function downloadBlobPngAsync(blob: Blob, filename: string) {
  return downloadOrSaveBlob(blob, filename);
}
