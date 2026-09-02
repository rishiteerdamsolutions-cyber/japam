export const FESTIVAL_CREDIT_LINE = 'Built by AI Developer India : Aditya Nandagiri';

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

function drawAMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#FBBF24';
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `700 ${Math.round(size * 0.62)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', x, y + 1);
}

function drawFestivalCredit(ctx: CanvasRenderingContext2D, width: number, y: number) {
  const mark = 22;
  const text = FESTIVAL_CREDIT_LINE;
  ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  const total = mark + 10 + tw;
  const start = (width - total) / 2;
  drawAMark(ctx, start + mark / 2, y, mark);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, start + mark + 10, y);
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
  drawGlossBackground(ctx, width, height);
  const font = '"Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FBBF24';
  ctx.font = `800 42px Georgia, serif`;
  ctx.fillText('JAPAM', width / 2, 88);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 18px ${font}`;
  ctx.fillText('japam.digital', width / 2, 122);

  ctx.fillStyle = '#fff';
  ctx.font = `700 34px ${font}`;
  ctx.fillText('Ganeshotsav Japa Yagna (1080)', width / 2, 210);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `600 22px ${font}`;
  const orgLines = wrapLines(ctx, opts.orgName, width - 80);
  let y = 270;
  for (const line of orgLines) {
    ctx.fillText(line, width / 2, y);
    y += 30;
  }
  ctx.font = `500 20px ${font}`;
  for (const line of wrapLines(ctx, opts.eventName, width - 80)) {
    ctx.fillText(line, width / 2, y);
    y += 28;
  }

  y += 40;
  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 28px ${font}`;
  ctx.fillText('108 Ganesh japas complete', width / 2, y);
  y += 56;
  ctx.fillStyle = '#fff';
  ctx.font = `700 32px ${font}`;
  ctx.fillText(opts.devoteeName || 'Devotee', width / 2, y);
  y += 40;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `500 18px ${font}`;
  ctx.fillText(opts.dateLabel, width / 2, y);

  drawFestivalCredit(ctx, width, height - 72);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 16px ${font}`;
  ctx.fillText('www.japam.digital', width / 2, height - 36);

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
  const nameBlock = Math.max(opts.names.length, 1) * 34;
  const height = Math.max(1280, 420 + nameBlock + 160);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawGlossBackground(ctx, width, height);
  const font = '"Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FBBF24';
  ctx.font = `800 42px Georgia, serif`;
  ctx.fillText('JAPAM', width / 2, 80);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 18px ${font}`;
  ctx.fillText('japam.digital', width / 2, 112);

  ctx.fillStyle = '#fff';
  ctx.font = `700 30px ${font}`;
  let y = 180;
  for (const line of wrapLines(ctx, opts.eventName, width - 80)) {
    ctx.fillText(line, width / 2, y);
    y += 36;
  }
  ctx.font = `600 22px ${font}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const line of wrapLines(ctx, opts.orgName, width - 80)) {
    ctx.fillText(line, width / 2, y);
    y += 30;
  }
  ctx.font = `500 18px ${font}`;
  ctx.fillText(opts.dateLabel, width / 2, y + 8);
  y += 48;
  ctx.fillStyle = '#FBBF24';
  ctx.font = `700 24px ${font}`;
  ctx.fillText(`${opts.participantCount} / ${opts.cap} participants`, width / 2, y);
  y += 36;

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `500 20px ${font}`;
  const names = opts.names.slice(0, opts.cap);
  if (names.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillText('No participants yet', width / 2, y + 20);
  } else {
    names.forEach((n, i) => {
      ctx.fillText(`${i + 1}. ${n}`, 64, y + i * 34);
    });
  }

  drawFestivalCredit(ctx, width, height - 72);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 16px ${font}`;
  ctx.fillText('www.japam.digital', width / 2, height - 36);
  return dataUrlToBlob(canvas.toDataURL('image/png'));
}

export function downloadBlobPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
