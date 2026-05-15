export type WeeklyStreakProgressDay = {
  weekdayLabel: string;
  deityName: string;
  done: boolean;
};

export interface RenderWeeklyStreakProgressCardOptions {
  headerName: string;
  weekMondayIst: string;
  days: WeeklyStreakProgressDay[];
  footerLine?: string;
}

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

  const radialTop = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width * 0.9);
  radialTop.addColorStop(0, 'rgba(255, 120, 160, 0.4)');
  radialTop.addColorStop(0.5, 'rgba(255, 120, 160, 0.1)');
  radialTop.addColorStop(1, 'transparent');
  ctx.fillStyle = radialTop;
  ctx.fillRect(0, 0, width, height * 0.5);

  const radialBot = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, height * 0.8);
  radialBot.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
  radialBot.addColorStop(1, 'transparent');
  ctx.fillStyle = radialBot;
  ctx.fillRect(0, 0, width, height);

  const shine = ctx.createLinearGradient(0, 0, width, height);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0)');
  shine.addColorStop(0.48, 'rgba(255,255,255,0.18)');
  shine.addColorStop(0.52, 'rgba(255,255,255,0.22)');
  shine.addColorStop(0.65, 'rgba(255,255,255,0)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, width, height);
}

function drawCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(2.5, size * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.28, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.06, cy + size * 0.26);
  ctx.lineTo(cx + size * 0.32, cy - size * 0.22);
  ctx.stroke();
}

/** Rank-card visual style; Mon–Sun timeline with ticks (no leaderboard). */
export async function renderWeeklyStreakProgressCardBlob(
  opts: RenderWeeklyStreakProgressCardOptions,
): Promise<Blob | null> {
  try {
    const width = 720;
    const height = 1280;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pad = 32;
    const fontFamily = '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    const centerX = width / 2;
    const maxW = width - pad * 4;

    drawGlossBackground(ctx, width, height);

    const truncate = (text: string, maxWidth: number, font: string) => {
      let t = String(text || '');
      ctx.font = font;
      if (ctx.measureText(t).width <= maxWidth) return t;
      while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
      return `${t}…`;
    };

    const wrapAndDraw = (
      text: string,
      fontSize: number,
      weight: string,
      color: string,
      startY: number,
      lineSpacing = 4,
      font = fontFamily,
    ): number => {
      const raw = String(text || '').trim();
      if (!raw) return 0;
      ctx.font = `${weight} ${fontSize}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const words = raw.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width <= maxW) line = test;
        else {
          if (line) lines.push(line);
          line = ctx.measureText(w).width <= maxW ? w : truncate(w, maxW, ctx.font);
        }
      }
      if (line) lines.push(line);
      const lineH = fontSize + lineSpacing;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillStyle = color;
        ctx.fillText(lines[i]!, centerX, startY + i * lineH);
      }
      return lines.length * lineH;
    };

    let y = pad + 24;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 18px ${fontFamily}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
    ctx.fillText('WEEKLY STREAK', centerX, y);
    y += 38;

    const headerName = String(opts.headerName || 'Your streak').trim();
    const headerH = wrapAndDraw(headerName, 40, '700', '#FFFFFF', y, 6);
    y += (headerH || 46) + 10;

    const subH = wrapAndDraw(
      `IST week from Mon ${opts.weekMondayIst}`,
      22,
      '500',
      'rgba(253, 230, 138, 0.95)',
      y,
      4,
    );
    y += (subH || 26) + 8;

    const doneCount = opts.days.filter((d) => d.done).length;
    const sumH = wrapAndDraw(
      `${doneCount} of 7 days · 108 japas each`,
      20,
      '600',
      'rgba(255, 255, 255, 0.9)',
      y,
      4,
    );
    y += (sumH || 24) + 24;

    ctx.font = `600 22px ${fontFamily}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.fillText('Your week', centerX, y);
    y += 44;

    const cardX = pad;
    const cardW = width - pad * 2;
    const cardY = y;
    const cardH = 420;
    const r = 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.moveTo(cardX + r, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, r);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, r);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY, r);
    ctx.arcTo(cardX, cardY, cardX + cardW, cardY, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const days = opts.days.slice(0, 7);
    const n = days.length || 7;
    const innerPad = 28;
    const timelineY = cardY + 72;
    const startX = cardX + innerPad;
    const endX = cardX + cardW - innerPad;
    const step = n > 1 ? (endX - startX) / (n - 1) : 0;
    const pointR = 16;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, timelineY);
    ctx.lineTo(endX, timelineY);
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const day = days[i]!;
      const cx = n > 1 ? startX + step * i : centerX;
      const done = day.done;

      if (done) {
        ctx.beginPath();
        ctx.arc(cx, timelineY, pointR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        drawCheck(ctx, cx, timelineY, pointR);
      } else {
        ctx.beginPath();
        ctx.arc(cx, timelineY, pointR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const colW = n > 1 ? step : cardW - innerPad * 2;
      const labelMaxW = Math.min(colW + 8, 88);
      const labelX = cx;

      ctx.textAlign = 'center';
      ctx.font = `700 13px ${fontFamily}`;
      ctx.fillStyle = done ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255,255,255,0.55)';
      ctx.fillText(day.weekdayLabel, labelX, timelineY + 32);

      ctx.font = `600 11px ${fontFamily}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(truncate(day.deityName, labelMaxW, ctx.font), labelX, timelineY + 52);

      ctx.font = `500 10px ${fontFamily}`;
      ctx.fillStyle = done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)';
      ctx.fillText(done ? '108 japas' : '—', labelX, timelineY + 70);
    }

    y = cardY + cardH + 48;

    const footerFont = 'Georgia, "Times New Roman", serif';
    ctx.font = '700 36px ' + footerFont;
    ctx.fillStyle = '#FBBF24';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 8;
    ctx.fillText('JAPAM', centerX, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    y += 64;

    const footerLine =
      opts.footerLine?.trim() ||
      'Seven IST days · one Devatā per day · 108 japas on the board.';
    const ctaH = wrapAndDraw(footerLine, 24, '600', 'rgba(255,255,255,0.9)', y, 6, footerFont);
    y += (ctaH || 30) + 16;

    ctx.font = `700 44px ${footerFont}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.98)';
    ctx.fillText('www.japam.digital', centerX, y);

    return dataUrlToBlob(canvas.toDataURL('image/png'));
  } catch {
    return null;
  }
}

export function downloadWeeklyStreakProgressCard(blob: Blob, weekMondayIst: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `japam-weekly-streak-progress-${weekMondayIst}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
