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

function loadBackgroundImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/images/leaderboard-bg.png?v=${Date.now()}`;
  });
}

export interface RenderRankCardOptions {
  title: string;
  headerName: string;
  deityName: string;
  leaderboard: LeaderboardEntry[];
  currentUserUid: string;
}

export async function renderRankCardBlob(opts: RenderRankCardOptions): Promise<Blob | null> {
  try {
    const width = 720;
    const height = 1280;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const padding = 24;
    const fontFamily = 'ui-rounded, "Arial Rounded MT Bold", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

    const bgImg = await loadBackgroundImage();
    if (bgImg && bgImg.width > 0) {
      ctx.drawImage(bgImg, 0, 0, width, height);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#1a1a2e');
      bg.addColorStop(1, '#0f1b3d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }

    const truncate = (text: string, maxWidth: number) => {
      const t = String(text || '');
      if (ctx.measureText(t).width <= maxWidth) return t;
      let out = t;
      while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
      return `${out}…`;
    };

    const fitFontPx = (weight: number, maxPx: number, text: string, maxWidth: number) => {
      let px = maxPx;
      while (px > 14) {
        ctx.font = `${weight} ${px}px ${fontFamily}`;
        if (ctx.measureText(text).width <= maxWidth) return px;
        px -= 2;
      }
      return px;
    };

    const babyPink = '#FAD1E6';
    const babyPinkDark = '#C02675';

    const draw3D = (t: string, px: number, x: number, y: number, align: 'center' | 'left') => {
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      ctx.font = `950 ${px}px ${fontFamily}`;
      const depth = Math.max(3, Math.floor(px * 0.12));
      for (let i = depth; i >= 1; i--) {
        ctx.fillStyle = `rgba(131,24,67,${0.15 + (1 - i / depth) * 0.35})`;
        ctx.fillText(t, x + i, y + i);
      }
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.lineWidth = Math.max(3, Math.floor(px * 0.1));
      ctx.strokeStyle = babyPinkDark;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = babyPink;
      ctx.fillText(t, x, y);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(t, x, y - 1);
      ctx.restore();
    };

    const draw3DBabyPinkText = (text: string, centerX: number, y: number, weight: number, maxPx: number, maxWidth: number) => {
      const t = String(text || '');
      const px = fitFontPx(weight, maxPx, t, maxWidth);
      ctx.save();
      draw3D(t, px, centerX, y, 'center');
      ctx.restore();
      return px;
    };

    const draw3DBabyPinkTextLeft = (text: string, x: number, y: number, maxPx: number, maxWidth: number) => {
      const t = truncate(String(text || ''), maxWidth);
      const px = fitFontPx(950, maxPx, t, maxWidth);
      ctx.save();
      draw3D(t, px, x, y, 'left');
      ctx.restore();
      return px;
    };

    {
      const topH = 240;
      const g = ctx.createLinearGradient(0, 0, 0, topH);
      g.addColorStop(0, 'rgba(255,255,255,0.82)');
      g.addColorStop(0.65, 'rgba(255,255,255,0.40)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, topH);
    }

    let headerBottomY = padding + 10;
    {
      const centerX = width / 2;
      const maxW = width - padding * 2;
      const title = truncate(opts.title || 'JAPA MARATHON', maxW);
      const header = truncate(opts.headerName || '', maxW);
      const deity = truncate(`${opts.deityName} Japa`, maxW);

      const y0 = padding + 10;
      const used1 = draw3DBabyPinkText(title, centerX, y0, 950, 32, maxW);
      const y1 = y0 + used1 + 10;
      const used2 = draw3DBabyPinkText(header, centerX, y1, 950, 56, maxW);
      const y2 = y1 + used2 + 10;
      const used3 = draw3DBabyPinkText(deity, centerX, y2, 900, 34, maxW);
      headerBottomY = y2 + used3;
    }

    const listTopY = Math.max(padding + 190, headerBottomY + 24);
    draw3DBabyPinkText('Top participants', width / 2, listTopY, 950, 32, width - padding * 2);

    const rowH = 96;
    const rowGap = 18;
    const boxPadding = 18;
    const boxX = padding;
    const boxY = listTopY + 46;
    const boxW = width - padding * 2;
    const boxH = boxPadding * 2 + 5 * rowH + 4 * rowGap;

    ctx.fillStyle = 'rgba(131,24,67,0.92)';
    ctx.beginPath();
    const r = 16;
    ctx.moveTo(boxX + r, boxY);
    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.28)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const entries = paddedLeaderboard(opts.leaderboard).slice(0, 10);
    const curUid = opts.currentUserUid;
    const colGap = 18;
    const colW = (boxW - colGap) / 2;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 2; col++) {
        const idx = row + col * 5;
        const p = entries[idx] || { rank: idx + 1, uid: '', name: 'Vacant', japasCount: 0 };
        const isCurrent = p.uid && p.uid === curUid;
        const isVacant = !p.uid;
        const colX = boxX + col * (colW + colGap);
        const y = boxY + boxPadding + row * (rowH + rowGap);

        if (isCurrent) {
          ctx.fillStyle = 'rgba(251,191,36,0.2)';
          ctx.fillRect(colX + 10, y + 8, colW - 20, rowH - 16);
        }

        const cx = colX + 32;
        const cy = y + rowH / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = isCurrent ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.2)';
        ctx.fill();
        ctx.strokeStyle = babyPinkDark;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        draw3D(String(p.rank), 20, cx, cy - 12, 'center');
        ctx.restore();

        const textX = colX + 66;
        const rightPad = 12;
        const nameMaxW = colW - (textX - colX) - rightPad;
        const nameY = y + 32;
        draw3DBabyPinkTextLeft(isVacant ? 'Vacant' : String(p.name || ''), textX, nameY, 26, nameMaxW);
        if (isCurrent) draw3DBabyPinkTextLeft('(You)', textX, y + 56, 14, nameMaxW);
        draw3DBabyPinkTextLeft(isVacant ? '—' : `${p.japasCount} japas`, textX, y + 76, 18, nameMaxW);
      }
    }

    const footerY = boxY + boxH + 28;
    const footerLine1 = 'Match, chant, and climb the leaderboard.';
    const joinAtText = 'Join at';
    const urlText = 'www.japam.digital';

    {
      const startY = Math.max(0, footerY - 24);
      const g = ctx.createLinearGradient(0, startY, 0, height);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0.86)');
      ctx.fillStyle = g;
      ctx.fillRect(0, startY, width, height - startY);
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxFooterW = width - padding * 2;
    const gap = 14;
    let line1Px = fitFontPx(900, 70, footerLine1, maxFooterW);
    let joinAtPx = fitFontPx(950, 40, joinAtText, maxFooterW);
    const urlTargetPx = joinAtPx * 3;
    let urlPx = fitFontPx(950, urlTargetPx, urlText, maxFooterW);
    const availableH = height - padding - footerY;
    const totalH = line1Px + gap + joinAtPx + gap + urlPx;
    if (totalH > availableH) {
      const scale = availableH / totalH;
      line1Px = Math.max(24, Math.floor(line1Px * scale));
      joinAtPx = Math.max(28, Math.floor(joinAtPx * scale));
      urlPx = Math.max(36, Math.floor(urlPx * scale));
    }
    const used1 = draw3DBabyPinkText(footerLine1, width / 2, footerY, 950, line1Px, maxFooterW);
    const y2 = footerY + used1 + gap;
    const used2 = draw3DBabyPinkText(joinAtText, width / 2, y2, 950, joinAtPx, maxFooterW);
    const y3 = y2 + used2 + gap;
    draw3DBabyPinkText(urlText, width / 2, y3, 950, urlPx, maxFooterW);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrlToBlob(dataUrl);
  } catch {
    return null;
  }
}
