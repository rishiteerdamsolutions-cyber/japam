export type LeaderboardEntry = { rank: number; uid: string; name: string; japasCount: number };

/** For the viewer row: show the higher of leaderboard count and local override (never split 86 vs 109). */
function viewerJapasDisplay(leaderboardJp: number, override?: number): number {
  const lb = Math.max(0, Math.round(Number(leaderboardJp) || 0));
  if (typeof override !== 'number' || !Number.isFinite(override)) return lb;
  return Math.max(lb, Math.max(0, Math.round(override)));
}

/**
 * Sort by japas (desc), assign contiguous ranks 1..n, drop entries without uid.
 * Ensures the rank card top-5 grid fills correctly even if the API sent missing or duplicate `rank`.
 */
export function normalizeLeaderboardForRankCard(leaderboard: LeaderboardEntry[]): LeaderboardEntry[] {
  const raw = Array.isArray(leaderboard) ? leaderboard : [];
  const withUid = raw.filter((e) => e && String(e.uid ?? '').trim());
  if (withUid.length === 0) return [];
  const byUid = new Map<string, LeaderboardEntry>();
  for (const e of withUid) {
    const uid = String(e.uid).trim();
    const jp = Math.max(0, Math.round(Number(e.japasCount) || 0));
    const prev = byUid.get(uid);
    if (!prev || jp > (Number(prev.japasCount) || 0)) byUid.set(uid, { ...e, uid, japasCount: jp });
  }
  const deduped = [...byUid.values()];
  const sorted = deduped.sort((a, b) => {
    const jc = (Number(b.japasCount) || 0) - (Number(a.japasCount) || 0);
    if (jc !== 0) return jc;
    const ra = Number(a.rank);
    const rb = Number(b.rank);
    if (Number.isFinite(ra) && Number.isFinite(rb) && ra !== rb) return ra - rb;
    return String(a.uid).localeCompare(String(b.uid));
  });
  return sorted.map((e, i) => {
    const uid = String(e.uid).trim();
    const nm = typeof e.name === 'string' && e.name.trim() ? e.name.trim().slice(0, 80) : uid.slice(0, 8);
    return {
      rank: i + 1,
      uid,
      name: nm,
      japasCount: Math.max(0, Math.round(Number(e.japasCount) || 0)),
    };
  });
}

/** Rows for the PNG: ranks 1–5, optional ellipsis, then viewer (rank 0 if not participated, or real rank if 6+). */
export type RankCardRow = { kind: 'player'; entry: LeaderboardEntry; isCurrent: boolean } | { kind: 'ellipsis' };

export type BuildRankCardRowsOptions = {
  currentUserJapasOverride?: number;
  currentUserDisplayName?: string;
  /** When false, viewer row shows rank 0 after ellipsis. When true, use leaderboard / fallback rank. When omitted, infer from leaderboard presence. */
  currentUserParticipated?: boolean;
  /** Free default marathon: one row for the viewer only (no community top-5 grid). */
  soloPersonalMarathon?: boolean;
};

/**
 * Build rank card rows: ranks 1–5 from leaderboard slots 1–5 only; then:
 * - Not participated: ⋮ + rank 0 row with viewer name.
 * - Participated, rank ≤ 5: only those five rows (viewer highlighted in place).
 * - Participated, rank > 5: ⋮ + viewer row with real rank.
 */
export function buildRankCardRows(
  leaderboard: LeaderboardEntry[],
  currentUserUid: string,
  options?: BuildRankCardRowsOptions,
): RankCardRow[] {
  const overrideJp = options?.currentUserJapasOverride;
  const dispName = options?.currentUserDisplayName?.trim() || 'You';
  const explicitParticipated = options?.currentUserParticipated;
  const solo = !!(options?.soloPersonalMarathon && currentUserUid);

  if (solo) {
    const participated =
      explicitParticipated === false
        ? false
        : explicitParticipated === true
          ? true
          : leaderboard.some((e) => e.uid === currentUserUid);
    if (!participated) {
      const jp = typeof overrideJp === 'number' ? overrideJp : 0;
      return [
        {
          kind: 'player',
          entry: { rank: 1, uid: currentUserUid, name: dispName, japasCount: jp },
          isCurrent: true,
        },
      ];
    }
    const userEntry = leaderboard.find((e) => e.uid === currentUserUid);
    const jp = viewerJapasDisplay(userEntry?.japasCount ?? 0, overrideJp);
    return [
      {
        kind: 'player',
        entry: {
          rank: 1,
          uid: currentUserUid,
          name: userEntry?.name?.trim() || dispName,
          japasCount: jp,
        },
        isCurrent: true,
      },
    ];
  }

  const allEntries = leaderboard
    .filter((e) => e.uid)
    .map((e) => ({ ...e }))
    .sort((a, b) => a.rank - b.rank);

  const topSlots = new Map<number, LeaderboardEntry>();
  for (const e of allEntries) {
    if (e.rank >= 1 && e.rank <= 5) {
      if (!topSlots.has(e.rank)) topSlots.set(e.rank, e);
    }
  }

  const topFive: LeaderboardEntry[] = [];
  for (let r = 1; r <= 5; r++) {
    const e = topSlots.get(r);
    topFive.push(e ?? { rank: r, uid: '', name: 'Vacant', japasCount: 0 });
  }

  const userEntry = currentUserUid ? allEntries.find((e) => e.uid === currentUserUid) : undefined;

  const participated: boolean =
    explicitParticipated === false
      ? false
      : explicitParticipated === true
        ? true
        : !!(currentUserUid && userEntry);

  const rows: RankCardRow[] = [];
  for (const e of topFive) {
    const isCurrent = !!(currentUserUid && e.uid && e.uid === currentUserUid);
    rows.push({ kind: 'player', entry: e, isCurrent });
  }

  if (!currentUserUid) {
    return rows;
  }

  if (!participated) {
    rows.push({ kind: 'ellipsis' });
    rows.push({
      kind: 'player',
      entry: { rank: 0, uid: currentUserUid, name: dispName, japasCount: 0 },
      isCurrent: true,
    });
    return rows;
  }

  const effectiveEntry: LeaderboardEntry =
    userEntry ??
    (() => {
      const jp = typeof overrideJp === 'number' ? overrideJp : 0;
      const maxR = allEntries.length ? Math.max(...allEntries.map((p) => p.rank)) : 0;
      return {
        rank: maxR + 1,
        uid: currentUserUid,
        name: dispName,
        japasCount: jp,
      };
    })();

  if (effectiveEntry.rank > 5) {
    rows.push({ kind: 'ellipsis' });
    rows.push({ kind: 'player', entry: effectiveEntry, isCurrent: true });
  }

  return rows;
}

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
  /**
   * Amber line under the white header. If set (including `''`), replaces the default `${deityName} Japa`
   * line: non-empty string is drawn as-is; empty string skips the line.
   * If omitted, legacy `${deityName} Japa` is used when that trims to a non-empty string other than bare "Japa".
   */
  subtitleLine?: string;
  /** Raw leaderboard from API (ranked entries); do not pre-pad to 10 for the card. */
  leaderboard: LeaderboardEntry[];
  currentUserUid: string;
  /** Use this for current user's japas when fresher than leaderboard (fixes stale count) */
  currentUserJapasOverride?: number;
  /** Fallback name if the user is missing from leaderboard payload */
  currentUserDisplayName?: string;
  /** Yagna/marathon participation; false forces rank 0 row on the card */
  currentUserParticipated?: boolean;
  /** Free default marathon: personal card copy and single-row layout */
  soloPersonalMarathon?: boolean;
  /** When `soloPersonalMarathon` is true, overrides the default marathon footer line on the PNG */
  rankCardFooterSoloLine?: string;
  /** When not solo, overrides default “Match, chant, and climb the leaderboard.” */
  rankCardFooterCtaLine?: string;
  /** Goal / progress (e.g. your count vs target, or collective vs goal) — drawn under the deity line */
  japaSummaryLine?: string;
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

    // Amber subtitle (deity / mode): explicit `subtitleLine` or legacy `${deityName} Japa`
    const deityPx = 26;
    if (opts.subtitleLine !== undefined) {
      const sub = opts.subtitleLine.trim();
      if (sub) {
        const deityH = wrapAndDraw(sub, maxW, deityPx, '500', 'rgba(253, 230, 138, 0.95)', y, 4);
        y += (deityH || deityPx + 4) + 10;
      } else {
        y += 10;
      }
    } else {
      const legacy = `${opts.deityName || ''} Japa`.trim();
      if (legacy.length > 0 && legacy !== 'Japa') {
        const deityH = wrapAndDraw(legacy, maxW, deityPx, '500', 'rgba(253, 230, 138, 0.95)', y, 4);
        y += (deityH || deityPx + 4) + 10;
      } else {
        y += 10;
      }
    }

    const summary = String(opts.japaSummaryLine || '').trim();
    if (summary) {
      const sumPx = 22;
      const sumH = wrapAndDraw(summary, maxW, sumPx, '600', 'rgba(255, 255, 255, 0.9)', y, 4);
      y += (sumH || sumPx + 4) + 20;
    } else {
      y += 26;
    }

    // ——— Leaderboard section label ———
    const sectionTitle = opts.soloPersonalMarathon ? 'Your progress' : 'Top participants';
    ctx.font = `600 22px ${fontFamily}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.fillText(sectionTitle, centerX, y);
    y += 40;

    // ——— Leaderboard card: top 5, optional ⋮, then viewer when rank > 5 ———
    const curUid = opts.currentUserUid;
    const rowH = 88;
    const ellipsisRowH = 52;
    const leaderboardForCard = normalizeLeaderboardForRankCard(opts.leaderboard || []);
    const cardRows = buildRankCardRows(leaderboardForCard, curUid, {
      currentUserJapasOverride: opts.currentUserJapasOverride,
      currentUserDisplayName: opts.currentUserDisplayName,
      currentUserParticipated: opts.currentUserParticipated,
      soloPersonalMarathon: opts.soloPersonalMarathon,
    });

    let contentH = 24;
    for (const row of cardRows) {
      contentH += row.kind === 'ellipsis' ? ellipsisRowH : rowH;
    }
    const cardH = contentH;
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

    let rowIndex = 0;
    for (const row of cardRows) {
      if (row.kind === 'ellipsis') {
        const rowY = cardY + 12 + rowIndex;
        const midX = cardX + cardW / 2;
        const midY = rowY + ellipsisRowH / 2;
        const dotR = 4;
        const gap = 9;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
        for (let d = -1; d <= 1; d++) {
          ctx.beginPath();
          ctx.arc(midX, midY + d * gap, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
        rowIndex += ellipsisRowH;
        continue;
      }

      const p = row.entry;
      const isCurrent = row.isCurrent;
      const isVacant = !p.uid;
      const rowY = cardY + 12 + rowIndex;

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
      const japasCount =
        isCurrent && typeof opts.currentUserJapasOverride === 'number'
          ? viewerJapasDisplay(p.japasCount ?? 0, opts.currentUserJapasOverride)
          : (p.japasCount ?? 0);
      const japasText = isVacant ? '—' : `${japasCount} japas`;
      const nameMaxW = cardW - 100;

      ctx.textAlign = 'left';
      ctx.font = `600 22px ${fontFamily}`;
      ctx.fillStyle = isVacant ? 'rgba(255,255,255,0.5)' : '#FFFFFF';
      ctx.fillText(truncate(nameText, nameMaxW), textX, rowY + 28);
      if (isCurrent) {
        ctx.font = `500 14px ${fontFamily}`;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
        ctx.fillText('(You)', textX, rowY + 50);
      }
      ctx.font = `500 16px ${fontFamily}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(japasText, textX, rowY + 72);

      rowIndex += rowH;
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

    const ctaLine = opts.soloPersonalMarathon
      ? (opts.rankCardFooterSoloLine?.trim() || 'Your personal japa counts toward your marathon goal.')
      : (opts.rankCardFooterCtaLine?.trim() || 'Match, chant, and climb the leaderboard.');
    const ctaH = wrapAndDraw(ctaLine, maxW, 38, '600', 'rgba(255,255,255,0.9)', y, 8, footerFont);
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
