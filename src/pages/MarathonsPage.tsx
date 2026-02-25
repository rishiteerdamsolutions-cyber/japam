import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import INDIA_REGIONS from '../data/indiaRegions.json';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { auth } from '../lib/firebase';

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
  leaderboard?: { rank: number; userId: string; japasCount: number }[];
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

  const state = STATES.find((s) => s.name === stateName) || null;
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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMarathonsByTemple((prev) => {
          const next = { ...prev };
          for (const tid of Object.keys(next)) {
            next[tid] = next[tid].map((m) =>
              m.id === marathonId ? { ...m, joinedCount: (m.joinedCount || 0) + 1 } : m
            );
          }
          return next;
        });
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

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="text-amber-400 text-sm">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-amber-400">Japa Marathons</h1>
        <a href="/settings" className="text-amber-200/70 text-xs">
          Priest
        </a>
      </div>

      <p className="text-amber-200/80 text-sm mb-4">Discover marathons by location and join to contribute your japas.</p>

      {joinError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
          {joinError}
          <button type="button" onClick={() => setJoinError(null)} className="ml-2 underline">Dismiss</button>
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
        <div className="space-y-6">
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
                      {marathons.map((m) => (
                        <div key={m.id} className="py-2 border-t border-amber-500/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-amber-200 font-medium">{deityName(m.deityId)} • {m.targetJapas} japas</p>
                              <p className="text-amber-200/60 text-xs">Started {m.startDate} • {m.joinedCount} joined</p>
                            </div>
                            <button
                              onClick={() => handleJoin(m.id)}
                              disabled={!!joining || !isPro}
                              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                            >
                              {joining === m.id ? '…' : !isPro ? 'Pro required' : 'Join'}
                            </button>
                          </div>
                          {m.leaderboard && m.leaderboard.length > 0 && (
                            <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                              <p className="text-amber-200/70 text-xs font-medium mb-1">Top participants</p>
                              {m.leaderboard.map((p) => (
                                <p key={p.rank} className="text-amber-200/60 text-xs">{p.rank}. {p.userId} — {p.japasCount} japas</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
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
