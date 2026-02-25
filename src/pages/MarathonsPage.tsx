import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import INDIA_REGIONS from '../data/indiaRegions.json';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { auth } from '../lib/firebase';
import { DonateThankYouBox } from '../components/donation/DonateThankYouBox';
import { AppHeader } from '../components/layout/AppHeader';

const STATES = [...INDIA_REGIONS.states, ...INDIA_REGIONS.union_territories];

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Temple {
  id: string;
  name: string;
  area: string;
  state?: string;
  district?: string;
  cityTownVillage?: string;
}

interface Marathon {
  id: string;
  templeId: string;
  deityId: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  leaderboard?: { rank: number; uid: string; name: string; japasCount: number }[];
}

interface MyMarathon {
  marathonId: string;
  deityId: string;
  templeId: string;
  templeName: string;
  targetJapas: number;
  startDate: string;
  japasCount: number;
  leaderboard?: { rank: number; uid: string; name: string; japasCount: number }[];
}

export function MarathonsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const isPro = levelsUnlocked === true;

  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [cityName, setCityName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [marathonsByTemple, setMarathonsByTemple] = useState<Record<string, Marathon[]>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedMarathonIds, setJoinedMarathonIds] = useState<Set<string>>(new Set());
  const [myMarathons, setMyMarathons] = useState<MyMarathon[]>([]);
  const [sharing, setSharing] = useState(false);
  const [openMyLeaderboard, setOpenMyLeaderboard] = useState<Set<string>>(new Set());
  const [shareResult, setShareResult] = useState<{ blob: Blob; url: string; shareText: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const state = STATES.find((s) => s.name === stateName) || null;

  useEffect(() => {
    if (!user?.uid || !isPro) {
      setJoinedMarathonIds(new Set());
      setMyMarathons([]);
      return;
    }
    const load = async () => {
      const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
      if (!idToken) return;
      const url = API_BASE ? `${API_BASE}/api/marathons/my-participations` : '/api/marathons/my-participations';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
      const data = (await res.json().catch(() => ({}))) as { marathonIds?: string[]; marathons?: MyMarathon[] };
      if (res.ok && Array.isArray(data.marathonIds)) {
        setJoinedMarathonIds(new Set(data.marathonIds));
        setMyMarathons(Array.isArray(data.marathons) ? data.marathons : []);
      }
    };
    load();
  }, [user?.uid, isPro]);
  const districts = state?.districts ?? [];

  const paddedLeaderboard = (lb?: { rank: number; uid: string; name: string; japasCount: number }[]) => {
    const list = Array.isArray(lb) ? lb.slice(0, 10) : [];
    const out = [...list];
    for (let i = out.length; i < 10; i++) {
      out.push({ rank: i + 1, uid: '', name: 'Vacant', japasCount: 0 });
    }
    return out;
  };

  const dataUrlToBlob = (dataUrl: string): Blob | null => {
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
  };

  const loadBackgroundImage = (): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/images/leaderboard-bg.png';
    });
  };

  const renderRankCardBlob = async (opts: {
    templeName: string;
    deityName: string;
    leaderboard: { rank: number; uid: string; name: string; japasCount: number }[];
    currentUserUid: string;
  }): Promise<Blob | null> => {
    try {
      const width = 720;
      const height = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const padding = 24;

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

      const amber = '#FBBF24';
      // Darker shades of the same warm palette (avoid pure black)
      const saffronDark = '#7C2D12';
      const saffronMid = '#92400E';
      const berryDark = '#831843';

      const truncate = (text: string, maxWidth: number) => {
        const t = String(text || '');
        if (ctx.measureText(t).width <= maxWidth) return t;
        let out = t;
        while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
        return `${out}…`;
      };

      // Fit text to width (prevents any letter overlap)
      const fitFontPx = (weight: number, maxPx: number, text: string, maxWidth: number) => {
        let px = maxPx;
        while (px > 14) {
          ctx.font = `${weight} ${px}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
          if (ctx.measureText(text).width <= maxWidth) return px;
          px -= 2;
        }
        return px;
      };

      // Top overlay so dark text stays readable on bright backgrounds
      {
        const topH = 240;
        const g = ctx.createLinearGradient(0, 0, 0, topH);
        g.addColorStop(0, 'rgba(255,255,255,0.82)');
        g.addColorStop(0.65, 'rgba(255,255,255,0.40)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, topH);
      }

      // Header (centered, dark, larger)
      let headerBottomY = padding + 10;
      {
        const centerX = width / 2;
        const maxW = width - padding * 2;
        const title = 'JAPA MARATHON';
        const temple = truncate(opts.templeName || 'Temple', maxW);
        const deity = truncate(`${opts.deityName} Japa`, maxW);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const titlePx = fitFontPx(950, 30, title, maxW);
        const templePx = fitFontPx(950, 54, temple, maxW);
        const deityPx = fitFontPx(900, 32, deity, maxW);

        const y0 = padding + 10;
        const y1 = y0 + titlePx + 8;
        const y2 = y1 + templePx + 10;

        ctx.fillStyle = saffronMid;
        ctx.font = `950 ${titlePx}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(title, centerX, y0);

        ctx.fillStyle = saffronDark;
        ctx.font = `950 ${templePx}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(temple, centerX, y1);

        ctx.fillStyle = saffronMid;
        ctx.font = `900 ${deityPx}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(deity, centerX, y2);

        ctx.restore();

        // Leaderboard title starts after header content (no overlap)
        headerBottomY = y2 + deityPx;
      }

      // Leaderboard title (tighter so card fills frame)
      const listTopY = Math.max(padding + 190, headerBottomY + 24);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = saffronDark;
      ctx.font = '950 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Top participants', width / 2, listTopY);
      ctx.restore();

      // Two-column arena: 5 + 5 entries (bigger text, uses space better)
      const rowH = 96;
      const rowGap = 18;
      const boxPadding = 18;
      const boxX = padding;
      const boxY = listTopY + 16;
      const boxW = width - padding * 2;
      const boxH = boxPadding * 2 + 5 * rowH + 4 * rowGap;

      // Dark panel for readability (white text pops)
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
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

      const entries = opts.leaderboard.slice(0, 10);
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
            ctx.fillStyle = 'rgba(251,191,36,0.18)';
            ctx.fillRect(colX + 10, y + 8, colW - 20, rowH - 16);
          }

          // rank circle
          const cx = colX + 30;
          const cy = y + rowH / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 18, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = isCurrent ? amber : 'rgba(55,65,81,0.95)';
          ctx.fill();

          ctx.fillStyle = isCurrent ? '#1F2937' : '#FFFFFF';
          ctx.font = '950 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(p.rank), cx, cy);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';

          // name + japas
          const textX = colX + 62;
          const rightPad = 16;
          const nameMaxW = colW - (textX - colX) - rightPad;

          ctx.fillStyle = isVacant ? 'rgba(255,255,255,0.78)' : '#FFFFFF';
          const baseName = isVacant ? 'Vacant' : String(p.name || '');
          const namePx = fitFontPx(950, 28, baseName, nameMaxW);
          ctx.font = `950 ${namePx}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
          const name = isVacant ? 'Vacant' : truncate(baseName, nameMaxW);
          const nameY = y + 40;
          ctx.fillText(name, textX, nameY);

          if (isCurrent) {
            ctx.fillStyle = '#FCD34D';
            ctx.font = `900 ${Math.max(14, Math.floor(namePx * 0.68))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
            const youX = textX + ctx.measureText(name).width + 10;
            const youMaxX = colX + colW - rightPad;
            if (youX + ctx.measureText('(You)').width <= youMaxX) {
              ctx.fillText('(You)', youX, nameY);
            }
          }

          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.font = '800 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText(isVacant ? '—' : `${p.japasCount} japas`, textX, y + 72);
        }
      }

      // Footer moved up so card fills frame (no big empty space at bottom)
      const footerY = boxY + boxH + 28;
      const footerLine1 = 'Match, chant, and climb the leaderboard.';
      const joinText = 'Join at www.japam.digital';

      // Bottom overlay for readable, big dark footer text
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
      const line1Px = fitFontPx(900, 72, footerLine1, maxFooterW);
      const line2Px = fitFontPx(950, 104, joinText, maxFooterW);

      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(255,255,255,0.82)';
      ctx.fillStyle = berryDark;

      ctx.font = `900 ${line1Px}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.strokeText(footerLine1, width / 2, footerY);
      ctx.fillText(footerLine1, width / 2, footerY);

      const y2 = footerY + line1Px + 14;
      // Make the website line more attractive: warm gradient fill
      const joinGrad = ctx.createLinearGradient(padding, 0, width - padding, 0);
      joinGrad.addColorStop(0, saffronDark);
      joinGrad.addColorStop(0.5, '#6D28D9');
      joinGrad.addColorStop(1, berryDark);
      ctx.font = `950 ${line2Px}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.strokeText(joinText, width / 2, y2);
      ctx.fillStyle = joinGrad;
      ctx.fillText(joinText, width / 2, y2);

      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');
      return dataUrlToBlob(dataUrl);
    } catch {
      return null;
    }
  };

  const handleSearch = () => {
    if (!stateName.trim()) return;
    setJoinError(null);
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    params.set('state', stateName.trim());
    if (districtName.trim()) params.set('district', districtName.trim());
    if (cityName.trim()) params.set('cityTownVillage', cityName.trim());
    if (areaName.trim()) params.set('area', areaName.trim());
    const url = API_BASE ? `${API_BASE}/api/marathons/discover?${params}` : `/api/marathons/discover?${params}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setTemples(data.temples || []);
        setMarathonsByTemple(data.marathonsByTemple || {});
      })
      .catch(() => {
        setTemples([]);
        setMarathonsByTemple({});
      })
      .finally(() => setLoading(false));
  };

  const handleJoin = async (marathonId: string) => {
    if (!user?.uid) {
      navigate('/');
      return;
    }
    if (!isPro) {
      setJoinError('Pro member required to join marathons. Unlock the game first.');
      return;
    }
    setJoinError(null);
    setJoining(marathonId);
    try {
      const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
      if (!idToken) {
        setJoinError('Please sign in again to join.');
        return;
      }
      const url = API_BASE ? `${API_BASE}/api/marathons/join` : '/api/marathons/join';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ marathonId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyJoined?: boolean };
      if (res.ok) {
        setJoinedMarathonIds((prev) => new Set(prev).add(marathonId));
        if (!data.alreadyJoined) {
          setMarathonsByTemple((prev) => {
            const next = { ...prev };
            for (const tid of Object.keys(next)) {
              next[tid] = next[tid].map((m) =>
                m.id === marathonId ? { ...m, joinedCount: (m.joinedCount || 0) + 1 } : m
              );
            }
            return next;
          });
        }
        const refetchUrl = API_BASE ? `${API_BASE}/api/marathons/my-participations` : '/api/marathons/my-participations';
        const refetchRes = await fetch(refetchUrl, { headers: { Authorization: `Bearer ${idToken}` } });
        const refetchData = (await refetchRes.json().catch(() => ({}))) as { marathons?: MyMarathon[] };
        if (refetchRes.ok && Array.isArray(refetchData.marathons)) setMyMarathons(refetchData.marathons);
      } else if (res.status === 403) {
        setJoinError(data?.error ?? 'Only users who have unlocked the game can join marathons.');
      } else if (res.status === 401) {
        setJoinError('Please sign in to join a marathon.');
      } else {
        setJoinError(data?.error ?? 'Failed to join.');
      }
    } finally {
      setJoining(null);
    }
  };

  const deityName = (id: string) => DEITIES.find((d) => d.id === id)?.name ?? id;

  const handleShare = async (marathon: Marathon, temple: Temple) => {
    if (!user?.uid) return;
    if (!marathon.leaderboard || marathon.leaderboard.length === 0) return;
    const hasUser = marathon.leaderboard.some((p) => p.uid === user.uid);
    if (!hasUser) return;
    if (sharing) return;

    setShareError(null);
    setShareNotice(null);
    setSharing(true);
    try {
      const currentEntry = marathon.leaderboard?.find((p) => p.uid === user.uid);
      const rankText = currentEntry ? `My rank ${currentEntry.rank} in this Japa Marathon! ` : '';
      const shareText = `${rankText}Join at www.japam.digital`;

      const blob = await renderRankCardBlob({
        templeName: temple.name,
        deityName: deityName(marathon.deityId),
        leaderboard: paddedLeaderboard(marathon.leaderboard),
        currentUserUid: user.uid,
      });
      if (!blob) throw new Error('Failed to generate image');

      const url = URL.createObjectURL(blob);
      setShareResult({ blob, url, shareText });

      // Download immediately (more reliable than waiting for a secondary click).
      const a = document.createElement('a');
      a.href = url;
      a.download = 'japam-marathon.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setShareNotice('Downloaded. To post on WhatsApp Status: open WhatsApp → Status → My Status → add the downloaded image.');
    } catch {
      setShareError('Could not generate/download the image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const downloadShareImage = () => {
    if (!shareResult) return;
    const a = document.createElement('a');
    a.href = shareResult.url;
    a.download = 'japam-marathon.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const closeShareResult = () => {
    if (shareResult?.url) URL.revokeObjectURL(shareResult.url);
    setShareResult(null);
    setShareError(null);
    setShareNotice(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
      {shareResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-amber-400 mb-2">Your rank card</h2>
            <p className="text-amber-200/80 text-sm mb-3">Your leaderboard image is downloaded.</p>
            <p className="text-amber-200/70 text-xs mb-4">To post it on WhatsApp Status: WhatsApp → Status → My Status → add the downloaded image.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadShareImage}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold"
              >
                Download again
              </button>
            </div>
            <button
              type="button"
              onClick={closeShareResult}
              className="mt-3 w-full py-2 rounded-xl bg-white/5 text-amber-200/80 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <AppHeader
        title="Japa Marathons"
        showBack
        onBack={() => navigate(-1)}
        rightElement={
          <a href="/settings" className="text-amber-200/70 text-xs hover:text-amber-300">
            Priest
          </a>
        }
      />

      <p className="text-amber-200/80 text-sm mb-4">Discover marathons by location and join to contribute your japas.</p>

      {joinError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
          {joinError}
          <button type="button" onClick={() => setJoinError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {shareError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
          {shareError}
          <button type="button" onClick={() => setShareError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
      {shareNotice && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-100 text-sm">
          {shareNotice}
          <button type="button" onClick={() => setShareNotice(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <DonateThankYouBox />

      {user && isPro && myMarathons.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30">
          <h2 className="text-amber-400 font-semibold mb-3">Your marathons</h2>
          <p className="text-amber-200/70 text-sm mb-3">Play the japa game for these marathons — your japas count toward the marathon.</p>
          <div className="space-y-2">
            {myMarathons.map((my) => (
              <div key={my.marathonId} className="py-2 border-t border-amber-500/10 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-amber-200 font-medium">{my.templeName || 'Marathon'} • {deityName(my.deityId)}</p>
                    <p className="text-amber-200/60 text-xs">Target {my.targetJapas} japas • Your japas: {my.japasCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/game?mode=${encodeURIComponent(my.deityId)}&level=0`)}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
                    >
                      Play
                    </button>
                    {!!my.leaderboard && my.leaderboard.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMyLeaderboard((prev) => {
                            const next = new Set(prev);
                            if (next.has(my.marathonId)) next.delete(my.marathonId);
                            else next.add(my.marathonId);
                            return next;
                          });
                        }}
                        className="text-[11px] text-amber-300 underline"
                      >
                        {openMyLeaderboard.has(my.marathonId) ? 'Hide leaderboard' : 'Show leaderboard'}
                      </button>
                    )}
                  </div>
                </div>

                {openMyLeaderboard.has(my.marathonId) && my.leaderboard && my.leaderboard.length > 0 && (
                  <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-amber-200/70 text-xs font-medium mb-1">Top participants</p>
                      {!!user?.uid && my.leaderboard.some((p) => p.uid === user.uid) && (
                        <button
                          type="button"
                          onClick={() => {
                            const marathon: Marathon = {
                              id: my.marathonId,
                              templeId: my.templeId,
                              deityId: my.deityId,
                              targetJapas: my.targetJapas,
                              startDate: my.startDate,
                              joinedCount: 0,
                              leaderboard: my.leaderboard,
                            };
                            const temple: Temple = {
                              id: my.templeId,
                              name: my.templeName || 'Temple',
                              area: '',
                            };
                            handleShare(marathon, temple);
                          }}
                          disabled={sharing}
                          className="text-[11px] text-amber-300 underline disabled:opacity-50"
                        >
                          {sharing ? 'Preparing…' : 'Share my rank'}
                        </button>
                      )}
                    </div>
                    {paddedLeaderboard(my.leaderboard).map((p) => (
                      <p key={p.rank} className="text-amber-200/60 text-xs">
                        {p.rank}. {p.uid ? `${p.name} — ${p.japasCount} japas` : 'Vacant'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">State (required)</label>
          <select
            value={stateName}
            onChange={(e) => { setStateName(e.target.value); setDistrictName(''); }}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          >
            <option value="">Select State</option>
            {STATES.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        {state && (
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">District (optional)</label>
            <select
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            >
              <option value="">Any</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">City / Town / Village (optional)</label>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="e.g. Hyderabad"
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          />
        </div>
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Area (optional)</label>
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="e.g. Secunderabad"
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!stateName.trim() || loading}
          className="px-6 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {loading && <p className="text-amber-200/70 text-sm">Loading…</p>}

      {searched && !loading && (
        <div className="space-y-6 relative">
          {temples.length === 0 ? (
            <p className="text-amber-200/60 text-sm">No temples in this location yet.</p>
          ) : (
            temples.map((temple) => {
              const marathons = marathonsByTemple[temple.id] || [];
              return (
                <div key={temple.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20">
                  <p className="font-medium text-amber-200">{temple.name}</p>
                  <p className="text-amber-200/60 text-xs">{temple.area}</p>
                  {marathons.length === 0 ? (
                    <p className="text-amber-200/50 text-sm mt-2">No active marathons</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {marathons.map((m) => {
                        const canShare =
                          !!user?.uid &&
                          !!m.leaderboard &&
                          m.leaderboard.some((p) => p.uid === user.uid);
                        return (
                          <div key={m.id} className="py-2 border-t border-amber-500/10">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-amber-200 font-medium">{deityName(m.deityId)} • {m.targetJapas} japas</p>
                                <p className="text-amber-200/60 text-xs">Started {m.startDate} • {m.joinedCount} joined</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleJoin(m.id)}
                                  disabled={!!joining || !isPro || joinedMarathonIds.has(m.id)}
                                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                                >
                                  {joining === m.id ? '…' : joinedMarathonIds.has(m.id) ? 'Joined' : !isPro ? 'Pro required' : 'Join'}
                                </button>
                                {canShare && (
                                  <button
                                    type="button"
                                    onClick={() => handleShare(m, temple)}
                                    disabled={sharing}
                                    className="text-[11px] text-amber-300 underline disabled:opacity-50"
                                  >
                                    {sharing ? 'Preparing…' : 'Share my rank'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {m.leaderboard && m.leaderboard.length > 0 && (
                              <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                                <p className="text-amber-200/70 text-xs font-medium mb-1">Top participants</p>
                                {paddedLeaderboard(m.leaderboard).map((p) => (
                                  <p key={p.rank} className="text-amber-200/60 text-xs">
                                    {p.rank}. {p.uid ? `${p.name} — ${p.japasCount} japas` : 'Vacant'}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
