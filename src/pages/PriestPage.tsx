import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEITIES } from '../data/deities';
import { PriestLoginPage, PRIEST_TOKEN_KEY, PRIEST_TEMPLE_KEY } from './PriestLoginPage';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Marathon {
  id: string;
  deityId: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  japasToday: number;
  totalJapas: number;
}

export function PriestPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(PRIEST_TOKEN_KEY));
  const [temple, setTemple] = useState<{ templeId: string; templeName: string } | null>(() => {
    try {
      const s = localStorage.getItem(PRIEST_TEMPLE_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDeity, setCreateDeity] = useState('');
  const [createTarget, setCreateTarget] = useState('');
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const url = API_BASE ? `${API_BASE}/api/priest/marathons` : '/api/priest/marathons';
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.status === 401) {
            localStorage.removeItem(PRIEST_TOKEN_KEY);
            localStorage.removeItem(PRIEST_TEMPLE_KEY);
            setToken(null);
            setTemple(null);
            return;
          }
          setMarathons(data.marathons || []);
        }
      } catch {
        if (!cancelled) setMarathons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem(PRIEST_TOKEN_KEY);
    localStorage.removeItem(PRIEST_TEMPLE_KEY);
    setToken(null);
    setTemple(null);
    navigate('/priest/login', { replace: true });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !createDeity || !createTarget || !createDate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/marathons` : '/api/priest/marathons';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deityId: createDeity,
          targetJapas: Number(createTarget),
          startDate: createDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || 'Failed');
        return;
      }
      setShowCreate(false);
      setCreateDeity('');
      setCreateTarget('');
      setCreateDate(new Date().toISOString().slice(0, 10));
      setMarathons((prev) => [
        ...prev,
        {
          id: data.marathonId,
          deityId: createDeity,
          targetJapas: Number(createTarget),
          startDate: createDate,
          joinedCount: 0,
          japasToday: 0,
          totalJapas: 0,
        },
      ]);
    } catch {
      setCreateError('Failed');
    } finally {
      setCreating(false);
    }
  };

  if (!token) {
    return <PriestLoginPage />;
  }

  const deityName = (id: string) => DEITIES.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Priest Dashboard</h1>
          <p className="text-amber-200/70 text-sm">{temple?.templeName || 'Temple'}</p>
        </div>
        <button onClick={handleLogout} className="text-amber-200/80 text-sm">
          Log out
        </button>
      </div>

      <h2 className="text-lg font-semibold text-amber-200 mb-4">Marathons</h2>
      {loading ? (
        <p className="text-amber-200/70 text-sm">Loading…</p>
      ) : marathons.length === 0 ? (
        <p className="text-amber-200/60 text-sm mb-4">No marathons yet. Create one below.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {marathons.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20">
              <p className="font-medium text-amber-200">{deityName(m.deityId)} • Target: {m.targetJapas}</p>
              <p className="text-amber-200/70 text-xs">Started: {m.startDate}</p>
              <p className="text-amber-200/80 text-sm mt-2">
                Joined: {m.joinedCount} • Today: {m.japasToday} • Total: {m.totalJapas}
              </p>
            </div>
          ))}
        </div>
      )}

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-4 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold"
        >
          Create marathon
        </button>
      ) : (
        <form onSubmit={handleCreate} className="mt-4 p-4 rounded-xl bg-black/30 border border-amber-500/20 space-y-4">
          <h3 className="text-amber-400 font-medium">New marathon</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={createDeity}
              onChange={(e) => setCreateDeity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            >
              <option value="">Select deity</option>
              {DEITIES.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Target japas</label>
            <input
              type="number"
              min={1}
              value={createTarget}
              onChange={(e) => setCreateTarget(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
            <input
              type="date"
              value={createDate}
              onChange={(e) => setCreateDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          {createError && <p className="text-red-400 text-sm">{createError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50">
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/10 text-amber-200">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
