import { downloadOrSaveBlob } from './downloadBlob';

export const FESTIVAL_CREDIT_LINE = 'Built by AI Developer India: Aditya Nandagiri';
export const FESTIVAL_CREDIT_AFTER_LOGO = 'AI Developer India: Aditya Nandagiri';
const A_LOGO_SRC = '/A-logo.png';
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

function drawGlossBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bg = ctx.createLinearGradient(0, 0, width, height * 1.2);
  bg.addColorStop(0, '#E91E63');
  bg.addColorStop(0.25, '#D81B60');
  bg.addColorStop(0.5, '#E91E63');
  bg.addColorStop(0.75, '#D81B60');
  bg.addColorStop(1, '#C2185B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

/** Shared gold + white certificate border for devotee WhatsApp cards and organiser reports. */
function drawCertificateFrame(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const m1 = 22;
  const m2 = 34;
  const m3 = 46;
  const m4 = 56;

  // Outer gold band
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 10;
  ctx.strokeRect(m1, m1, width - m1 * 2, height - m1 * 2);

  // White band
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 5;
  ctx.strokeRect(m2, m2, width - m2 * 2, height - m2 * 2);

  // Inner gold line
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 3;
  ctx.strokeRect(m3, m3, width - m3 * 2, height - m3 * 2);

  // Fine inner white edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m4, m4, width - m4 * 2, height - m4 * 2);

  const cornerR = 9;
  const corners: Array<[number, number]> = [
    [m1 + 18, m1 + 18],
    [width - m1 - 18, m1 + 18],
    [m1 + 18, height - m1 - 18],
    [width - m1 - 18, height - m1 - 18],
  ];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.arc(x, y, cornerR, 0, Math.PI * 2);
    ctx.fillStyle = '#FBBF24';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, cornerR - 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
  }
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
  const height = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const logo = await loadImage(A_LOGO_SRC);
  drawGlossBackground(ctx, width, height);
  drawCertificateFrame(ctx, width, height);

  const font = '"Segoe UI", system-ui, sans-serif';
  const contentLeft = 84;
  const contentWidth = width - contentLeft * 2;
  let y = 118;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FBBF24';
  ctx.font = `800 44px Georgia, "Times New Roman", serif`;
  ctx.fillText('Certificate of Appreciation', width / 2, y);
  y += 40;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 26px ${font}`;
  ctx.fillText('JAPAM', width / 2, y);
  y += 36;

  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 30px Georgia, serif`;
  ctx.fillText('Ganeshotsav', width / 2, y);
  y += 40;

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `600 24px ${font}`;
  ctx.fillText(MANTRA_LINE, width / 2, y);
  y += 52;

  const name = (opts.devoteeName || 'Devotee').trim();
  const org = (opts.orgName || 'the organiser').trim();
  const appreciation =
    `This is to certify that ${name} has successfully participated and completed ${MANTRA_LINE} at Ganesh Utsav, organised by ${org}.`;

  ctx.fillStyle = '#fff';
  ctx.font = `600 27px ${font}`;
  ctx.textAlign = 'center';
  for (const line of wrapLines(ctx, appreciation, contentWidth)) {
    ctx.fillText(line, width / 2, y);
    y += 38;
  }

  y += 30;
  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 24px ${font}`;
  ctx.fillText(opts.dateLabel, width / 2, y);
  y += 52;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `600 24px ${font}`;
  for (const line of wrapLines(
    ctx,
    'Continue receiving the blessings of Lord Ganesha by practising Japa on the Japam Web App.',
    contentWidth,
  )) {
    ctx.fillText(line, width / 2, y);
    y += 34;
  }

  await drawFestivalCredit(ctx, width, height - 88, logo);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 18px ${font}`;
  ctx.fillText('www.japam.digital', width / 2, height - 48);

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
  const nameBlock = Math.max(opts.names.length, 1) * 36;
  const height = Math.max(1280, 520 + nameBlock + 180);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const logo = await loadImage(A_LOGO_SRC);
  drawGlossBackground(ctx, width, height);
  drawCertificateFrame(ctx, width, height);

  const font = '"Segoe UI", system-ui, sans-serif';
  const contentWidth = width - 168;
  let y = 118;

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
  ctx.fillText('Ganeshotsav', width / 2, y);
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
  } else {
    names.forEach((n, i) => {
      ctx.fillText(`${i + 1}. ${n}`, 88, y + i * 36);
    });
  }

  await drawFestivalCredit(ctx, width, height - 88, logo);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 18px ${font}`;
  ctx.fillText('www.japam.digital', width / 2, height - 48);
  return dataUrlToBlob(canvas.toDataURL('image/png'));
}

export function downloadBlobPng(blob: Blob, filename: string) {
  void downloadOrSaveBlob(blob, filename);
}

export async function downloadBlobPngAsync(blob: Blob, filename: string) {
  return downloadOrSaveBlob(blob, filename);
}
