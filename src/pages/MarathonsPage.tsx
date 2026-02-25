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

  const renderRankCardBlob = (opts: {
    templeName: string;
    deityName: string;
    leaderboard: { rank: number; uid: string; name: string; japasCount: number }[];
    currentUserUid: string;
  }): Blob | null => {
    try {
      const width = 720;
      const height = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const padding = 32;
      const bgTop = '#1a1a2e';
      const bgBottom = '#0f1b3d';
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, bgTop);
      bg.addColorStop(1, bgBottom);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const amber = '#FBBF24';
      const softAmber = '#FDE68A';
      const gray = '#D1D5DB';

      const hashString = (s: string) => {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };

      const mulberry32 = (seed: number) => {
        let a = seed >>> 0;
        return () => {
          a |= 0;
          a = (a + 0x6D2B79F5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };

      const seed = hashString(`${opts.templeName}|${opts.deityName}|${opts.currentUserUid}`);
      const rand = mulberry32(seed);

      const drawGem = (x: number, y: number, size: number, kind: number, color: string, alpha: number) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.translate(x, y);
        ctx.rotate((rand() - 0.5) * 0.8);
        if (kind === 0) {
          // diamond
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.9, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size * 0.9, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (kind === 1) {
          // hex
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 2;
            const px = Math.cos(a) * size;
            const py = Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // circle
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      };

      // Subtle radial glow behind header
      {
        const gx = width * 0.55;
        const gy = 140;
        const gr = Math.max(width, height) * 0.55;
        const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        glow.addColorStop(0, 'rgba(251,191,36,0.18)');
        glow.addColorStop(0.55, 'rgba(99,102,241,0.08)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // Light mandala / rings (no external assets)
      {
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = 'rgba(251,191,36,0.35)';
        ctx.lineWidth = 2;
        const cx = width * 0.82;
        const cy = 210;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, 40 + i * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 24; i++) {
          const a = (Math.PI * 2 * i) / 24;
          const r1 = 40;
          const r2 = 40 + 26 * 5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Game-like gem pattern in the background
      {
        const colors = ['rgba(251,191,36,0.55)', 'rgba(16,185,129,0.45)', 'rgba(59,130,246,0.42)', 'rgba(236,72,153,0.40)', 'rgba(167,139,250,0.42)'];
        const count = 44;
        for (let i = 0; i < count; i++) {
          const x = rand() * width;
          const y = rand() * height;
          const size = 10 + rand() * 26;
          const kind = Math.floor(rand() * 3);
          const col = colors[Math.floor(rand() * colors.length)]!;
          const alpha = 0.10 + rand() * 0.18;
          drawGem(x, y, size, kind, col, alpha);
        }
      }

      // Bottom “temple silhouette” wave to anchor the card
      {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, height - 140);
        ctx.quadraticCurveTo(width * 0.25, height - 210, width * 0.55, height - 160);
        ctx.quadraticCurveTo(width * 0.8, height - 120, width, height - 190);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const truncate = (text: string, maxWidth: number) => {
        const t = String(text || '');
        if (ctx.measureText(t).width <= maxWidth) return t;
        let out = t;
        while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
        return `${out}…`;
      };

      // Header
      ctx.fillStyle = amber;
      ctx.font = '600 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('JAPA MARATHON', padding, padding + 18);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(truncate(opts.templeName || 'Temple', width - padding * 2), padding, padding + 18 + 40);

      ctx.fillStyle = softAmber;
      ctx.font = '500 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(truncate(`${opts.deityName} Japa`, width - padding * 2), padding, padding + 18 + 40 + 28);

      // Leaderboard title
      const listTopY = padding + 160;
      ctx.fillStyle = amber;
      ctx.font = '600 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Top participants', padding, listTopY);

      // List container
      const boxX = padding;
      const boxY = listTopY + 18;
      const boxW = width - padding * 2;
      const rowH = 70;
      const boxPadding = 16;
      const boxH = boxPadding * 2 + rowH * 10;

      // Glassy panel for readability
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      ctx.beginPath();
      const r = 16;
      ctx.moveTo(boxX + r, boxY);
      ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
      ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
      ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
      ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.20)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const entries = opts.leaderboard.slice(0, 10);
      const curUid = opts.currentUserUid;

      for (let i = 0; i < 10; i++) {
        const p = entries[i] || { rank: i + 1, uid: '', name: 'Vacant', japasCount: 0 };
        const isCurrent = p.uid && p.uid === curUid;
        const isVacant = !p.uid;

        const y = boxY + boxPadding + i * rowH;

        if (isCurrent) {
          ctx.fillStyle = 'rgba(251,191,36,0.15)';
          ctx.fillRect(boxX + 10, y + 6, boxW - 20, rowH - 12);
        }

        // rank circle
        const cx = boxX + 28;
        const cy = y + rowH / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = isCurrent ? amber : 'rgba(55,65,81,0.9)';
        ctx.fill();

        ctx.fillStyle = isCurrent ? '#111827' : '#FFFFFF';
        ctx.font = '700 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.rank), cx, cy);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // name + japas
        const textX = boxX + 56;
        ctx.fillStyle = isVacant ? 'rgba(255,255,255,0.7)' : '#FFFFFF';
        ctx.font = '700 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        const name = isVacant ? 'Vacant' : truncate(p.name, boxW - 56 - 24);
        ctx.fillText(name, textX, y + 28);
        if (isCurrent) {
          ctx.fillStyle = '#FCD34D';
          ctx.font = '600 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText('(You)', textX + ctx.measureText(name).width + 8, y + 28);
        }

        ctx.fillStyle = gray;
        ctx.font = '500 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(isVacant ? '—' : `${p.japasCount} japas`, textX, y + 50);
      }

      // Footer
      const footerY = height - padding - 40;
      ctx.fillStyle = gray;
      ctx.font = '500 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Match, chant, and climb the leaderboard.', padding, footerY);
      ctx.fillStyle = amber;
      ctx.font = '600 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Join at www.japam.digital', padding, footerY + 26);

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

      const blob = renderRankCardBlob({
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
