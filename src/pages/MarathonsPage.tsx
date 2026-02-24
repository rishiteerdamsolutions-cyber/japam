import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import INDIA_REGIONS from '../data/indiaRegions.json';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { auth } from '../lib/firebase';

const STATES = [...INDIA_REGIONS.states, ...INDIA_REGIONS.union_territories];

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Temple {
  id: string;
  name: string;
  area: string;
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
  const [step, setStep] = useState<'state' | 'district' | 'city' | 'temples'>('state');
  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [cityName, setCityName] = useState('');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [marathonsByTemple, setMarathonsByTemple] = useState<Record<string, Marathon[]>>({});
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const state = STATES.find((s) => s.name === stateName) || null;
  const districts = state?.districts ?? [];

  useEffect(() => {
    setDistrictName('');
    setCityName('');
    setStep('state');
  }, [stateName]);

  useEffect(() => {
    setCityName('');
    setStep('district');
  }, [districtName]);

  useEffect(() => {
    if (!stateName || !districtName || !cityName.trim()) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ state: stateName, district: districtName, cityTownVillage: cityName.trim() });
    const url = API_BASE ? `${API_BASE}/api/marathons/discover?${params}` : `/api/marathons/discover?${params}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setTemples(data.temples || []);
          setMarathonsByTemple(data.marathonsByTemple || {});
          setStep('temples');
        }
      })
      .catch(() => {
        if (!cancelled) setTemples([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [stateName, districtName, cityName]);

  const handleJoin = async (marathonId: string) => {
    if (!user?.uid) {
      navigate('/');
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

      {step === 'state' && (
        <div>
          <label className="text-amber-200/80 text-sm block mb-2">State</label>
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          >
            <option value="">Select State</option>
            {STATES.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {step === 'district' && state && (
        <div>
          <label className="text-amber-200/80 text-sm block mb-2">District</label>
          <select
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          >
            <option value="">Select District</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {step === 'city' && districtName && (
        <div>
          <label className="text-amber-200/80 text-sm block mb-2">City / Town / Village</label>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="City / Town / Village"
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          />
        </div>
      )}

      {loading && <p className="text-amber-200/70 text-sm mt-4">Loading…</p>}

      {step === 'temples' && !loading && (
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
                              disabled={!!joining}
                              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                            >
                              {joining === m.id ? '…' : 'Join'}
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
