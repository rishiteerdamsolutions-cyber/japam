import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import INDIA_REGIONS from '../data/indiaRegions.json';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { auth } from '../lib/firebase';
import { DonateThankYouBox } from '../components/donation/DonateThankYouBox';
import { AppHeader } from '../components/layout/AppHeader';
import { LeaderboardShareCard } from '../components/marathons/LeaderboardShareCard';
import html2canvas from 'html2canvas';

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
  const [shareContext, setShareContext] = useState<{ marathon: Marathon; temple: Temple } | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);

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

  const handleShare = (marathon: Marathon, temple: Temple) => {
    if (!user?.uid) return;
    if (!marathon.leaderboard || marathon.leaderboard.length === 0) return;
    const hasUser = marathon.leaderboard.some((p) => p.uid === user.uid);
    if (!hasUser) return;
    setShareContext({ marathon, temple });
  };

  useEffect(() => {
    const generate = async () => {
      if (!shareContext || !shareCardRef.current || !user?.uid) return;
      try {
        setSharing(true);
        // allow layout to flush
        await new Promise((r) => setTimeout(r, 50));
        const canvas = await html2canvas(shareCardRef.current, { backgroundColor: null });
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) return;
        const currentEntry = shareContext.marathon.leaderboard?.find((p) => p.uid === user.uid);
        const rankText = currentEntry ? `My rank ${currentEntry.rank} in this Japa Marathon! ` : '';
        const shareText = `${rankText}Join at www.japam.digital`;

        const navAny: any = navigator;
        if (navAny && navAny.canShare && navAny.canShare({ files: [new File([blob], 'japam-marathon.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'japam-marathon.png', { type: 'image/png' });
          await navAny.share({
            files: [file],
            text: shareText,
          });
        } else {
          // fallback: download image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'japam-marathon.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch {
        // ignore for now
      } finally {
        setSharing(false);
        setShareContext(null);
      }
    };
    generate();
  }, [shareContext, user?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
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

      <DonateThankYouBox />

      {user && isPro && myMarathons.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30">
          <h2 className="text-amber-400 font-semibold mb-3">Your marathons</h2>
          <p className="text-amber-200/70 text-sm mb-3">Play the japa game for these marathons — your japas count toward the marathon.</p>
          <div className="space-y-2">
            {myMarathons.map((my) => (
              <div key={my.marathonId} className="flex items-center justify-between py-2 border-t border-amber-500/10 first:border-t-0 first:pt-0">
                <div>
                  <p className="text-amber-200 font-medium">{my.templeName || 'Marathon'} • {deityName(my.deityId)}</p>
                  <p className="text-amber-200/60 text-xs">Target {my.targetJapas} japas • Your japas: {my.japasCount}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/game?mode=${encodeURIComponent(my.deityId)}&level=0`)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
                >
                  Play
                </button>
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
                                {m.leaderboard.map((p) => (
                                  <p key={p.rank} className="text-amber-200/60 text-xs">
                                    {p.rank}. {p.name} — {p.japasCount} japas
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
          {shareContext && (
            <div className="absolute -left-[9999px] -top-[9999px]">
              <div ref={shareCardRef}>
                <LeaderboardShareCard
                  templeName={shareContext.temple.name}
                  deityName={deityName(shareContext.marathon.deityId)}
                  leaderboard={shareContext.marathon.leaderboard ?? []}
                  currentUserUid={user?.uid}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
