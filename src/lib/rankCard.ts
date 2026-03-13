export type LeaderboardEntry = { rank: number; uid: string; name: string; japasCount: number };

export function paddedLeaderboard(lb?: LeaderboardEntry[]): LeaderboardEntry[] {
  const list = Array.isArray(lb) ? lb.slice(0, 10) : [];
  const out = [...list];
  for (let i = out.length; i < 10; i++) {
    out.push({ rank: i + 1, uid: '', name: 'Vacant', japasCount: 0 });
  }
  return out;
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

export interface RenderRankCardOptions {
  title: string;
  headerName: string;
  deityName: string;
  leaderboard: LeaderboardEntry[];
  currentUserUid: string;
  /** Use this for current user's japas when fresher than leaderboard (fixes stale count) */
  currentUserJapasOverride?: number;
}

export async function renderRankCardBlob(opts: RenderRankCardOptions): Promise<Blob | null> {
  try {
    const width = 720;
    const height = 1400; // extra space for wrapped text and larger footer
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pad = 32;
    const fontFamily = '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

    // ——— Glossy pink background (matches bg-gloss-bubblegum) ———
    const bg = ctx.createLinearGradient(0, 0, width, height * 1.2);
    bg.addColorStop(0, '#E91E63');
    bg.addColorStop(0.25, '#D81B60');
    bg.addColorStop(0.5, '#E91E63');
    bg.addColorStop(0.75, '#D81B60');
    bg.addColorStop(1, '#C2185B');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Radial highlight (top glow)
    const radialTop = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width * 0.9);
    radialTop.addColorStop(0, 'rgba(255, 120, 160, 0.4)');
    radialTop.addColorStop(0.5, 'rgba(255, 120, 160, 0.1)');
    radialTop.addColorStop(1, 'transparent');
    ctx.fillStyle = radialTop;
    ctx.fillRect(0, 0, width, height * 0.5);

    // Subtle bottom vignette
    const radialBot = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, height * 0.8);
    radialBot.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    radialBot.addColorStop(1, 'transparent');
    ctx.fillStyle = radialBot;
    ctx.fillRect(0, 0, width, height);

    // Shine overlay (diagonal highlight)
    const shine = ctx.createLinearGradient(0, 0, width, height);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.35, 'rgba(255,255,255,0)');
    shine.addColorStop(0.48, 'rgba(255,255,255,0.18)');
    shine.addColorStop(0.52, 'rgba(255,255,255,0.22)');
    shine.addColorStop(0.65, 'rgba(255,255,255,0)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, width, height);

    const truncate = (text: string, maxW: number) => {
      let t = String(text || '');
      if (ctx.measureText(t).width <= maxW) return t;
      while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
      return `${t}…`;
    };

    /** Wrap long text into lines that fit maxW; draw centered; return total height. */
    const wrapAndDraw = (text: string, maxW: number, fontSize: number, weight: string, color: string, startY: number, lineSpacing = 4, font = fontFamily): number => {
      const raw = String(text || '').trim();
      if (!raw) return 0;
      ctx.font = `${weight} ${fontSize}px ${font}`;
      const words = raw.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width <= maxW) line = test;
        else {
          if (line) lines.push(line);
          line = ctx.measureText(w).width <= maxW ? w : truncate(w, maxW);
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

    const fitFont = (weight: string, maxPx: number, text: string, maxW: number) => {
      let px = maxPx;
      while (px > 12) {
        ctx.font = `${weight} ${px}px ${fontFamily}`;
        if (ctx.measureText(text).width <= maxW) return px;
        px -= 2;
      }
      return px;
    };

    const centerX = width / 2;
    const maxW = width - pad * 4; // extra side padding for long names

    // ——— Header ———
    let y = pad + 24;
    const titleText = (opts.title || 'MAHA JAPA YAGNA').toUpperCase();
    const titlePx = fitFont('600', 18, titleText, maxW);
    ctx.font = `600 ${titlePx}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
    ctx.fillText(titleText, centerX, y);
    y += titlePx + 20;

    // Header name: wrap to multiple lines if long, centered, clean
    const headerName = String(opts.headerName || 'Yagna').trim();
    const headerPx = 40;
    const headerH = wrapAndDraw(headerName, maxW, headerPx, '700', '#FFFFFF', y, 6);
    y += (headerH || headerPx + 6) + 12;

    // Deity line: wrap if long
    const deityLine = `${opts.deityName || ''} Japa`.trim();
    const deityPx = 26;
    const deityH = wrapAndDraw(deityLine, maxW, deityPx, '500', 'rgba(253, 230, 138, 0.95)', y, 4);
    y += (deityH || deityPx + 4) + 36;

    // ——— "Top participants" label ———
    ctx.font = `600 22px ${fontFamily}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.fillText('Top participants', centerX, y);
    y += 40;

    // ——— Leaderboard card (bg-black/30, amber border style) ———
    const entries = paddedLeaderboard(opts.leaderboard).slice(0, 5);
    const curUid = opts.currentUserUid;
    const rowH = 88;
    const cardH = entries.length * rowH + 24;
    const cardX = pad;
    const cardY = y;
    const cardW = width - pad * 2;

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

    for (let i = 0; i < entries.length; i++) {
      const p = entries[i]!;
      const isCurrent = p.uid && p.uid === curUid;
      const isVacant = !p.uid;
      const rowY = cardY + 12 + i * rowH;

      if (isCurrent) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.fillRect(cardX + 12, rowY + 4, cardW - 24, rowH - 8);
      }

      const rankX = cardX + 36;
      const rankCy = rowY + rowH / 2;
      ctx.beginPath();
      ctx.arc(rankX, rankCy, 18, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = isCurrent ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = isCurrent ? 'rgba(251, 191, 36, 0.6)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `700 18px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isCurrent ? '#1a1a1a' : 'rgba(255,255,255,0.9)';
      ctx.fillText(String(p.rank), rankX, rankCy);

      const textX = cardX + 72;
      const nameText = isVacant ? 'Vacant' : String(p.name || '');
      const japasCount = (isCurrent && typeof opts.currentUserJapasOverride === 'number' && opts.currentUserJapasOverride > (p.japasCount || 0))
        ? opts.currentUserJapasOverride
        : (p.japasCount ?? 0);
      const japasText = isVacant ? '—' : `${japasCount} japas`;
      const nameMaxW = cardW - 100;

      ctx.textAlign = 'left';
      ctx.font = `600 22px ${fontFamily}`;
      ctx.fillStyle = isVacant ? 'rgba(255,255,255,0.5)' : '#FFFFFF';
      ctx.font = `600 22px ${fontFamily}`;
      ctx.fillText(truncate(nameText, nameMaxW), textX, rowY + 28);
      if (isCurrent) {
        ctx.font = `500 14px ${fontFamily}`;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
        ctx.fillText('(You)', textX, rowY + 50);
      }
      ctx.font = `500 16px ${fontFamily}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(japasText, textX, rowY + 72);
    }

    y = cardY + cardH + 56;

    // ——— Footer: JAPAM branding — exact match of menu h1 (amber-400, serif, heading-on-bg) ———
    const footerFont = 'Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // JAPAM — same as menu: text-3xl/text-4xl, font-bold, text-amber-400 (#FBBF24), drop-shadow-lg, heading-on-bg
    ctx.font = '700 36px ' + footerFont;
    ctx.fillStyle = '#FBBF24'; // Tailwind amber-400
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 8;
    ctx.fillText('JAPAM', centerX, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    y += 72;

    const ctaH = wrapAndDraw('Match, chant, and climb the leaderboard.', maxW, 38, '600', 'rgba(255,255,255,0.9)', y, 8, footerFont);
    y += (ctaH || 46) + 16;

    ctx.font = `700 48px ${footerFont}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.98)';
    ctx.fillText('www.japam.digital', centerX, y);

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrlToBlob(dataUrl);
  } catch {
    return null;
  }
}
