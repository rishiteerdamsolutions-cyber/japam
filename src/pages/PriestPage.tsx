import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DEITIES } from '../data/deities';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PRIEST_TOKEN_KEY = 'japam_priest_token';
const PRIEST_TEMPLE_KEY = 'japam_priest_temple';

interface Marathon {
  id: string;
  deityId: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  japasToday: number;
  totalJapas: number;
  topParticipants?: { uid: string; name: string; japasCount: number; lastActiveAt?: string | null }[];
}

interface MahaYagna {
  id: string;
  name: string;
  deityId: string;
  deityName: string;
  mantra: string;
  goalJapas: number;
  currentJapas: number;
  participantCount: number;
  startDate: string;
  endDate: string;
  status: string;
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

  const [mahaYagnas, setMahaYagnas] = useState<MahaYagna[]>([]);
  const [mahaLoading, setMahaLoading] = useState(true);
  const [showMahaCreate, setShowMahaCreate] = useState(false);
  const [mahaName, setMahaName] = useState('');
  const [mahaDeity, setMahaDeity] = useState('');
  const [mahaMantra, setMahaMantra] = useState('');
  const [mahaGoal, setMahaGoal] = useState('');
  const [mahaStart, setMahaStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [mahaEnd, setMahaEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [mahaCreating, setMahaCreating] = useState(false);
  const [mahaCreateError, setMahaCreateError] = useState<string | null>(null);

  const [editingMarathon, setEditingMarathon] = useState<Marathon | null>(null);
  const [editDeity, setEditDeity] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editingMahaYagna, setEditingMahaYagna] = useState<MahaYagna | null>(null);
  const [mahaEditName, setMahaEditName] = useState('');
  const [mahaEditDeity, setMahaEditDeity] = useState('');
  const [mahaEditMantra, setMahaEditMantra] = useState('');
  const [mahaEditGoal, setMahaEditGoal] = useState('');
  const [mahaEditStart, setMahaEditStart] = useState('');
  const [mahaEditEnd, setMahaEditEnd] = useState('');
  const [mahaEditStatus, setMahaEditStatus] = useState<'active' | 'completed'>('active');
  const [mahaEditSaving, setMahaEditSaving] = useState(false);
  const [mahaEditError, setMahaEditError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas` : '/api/priest/maha-yagnas';
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.status === 401) return;
          setMahaYagnas(data.yagnas || []);
        }
      } catch {
        if (!cancelled) setMahaYagnas([]);
      } finally {
        if (!cancelled) setMahaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleMahaCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !mahaName.trim() || !mahaDeity || !mahaMantra.trim() || !mahaGoal || !mahaStart || !mahaEnd) return;
    const goal = Math.round(Number(mahaGoal));
    if (!Number.isFinite(goal) || goal < 1) {
      setMahaCreateError('Goal japas must be a positive number');
      return;
    }
    setMahaCreating(true);
    setMahaCreateError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas` : '/api/priest/maha-yagnas';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: mahaName.trim(),
          deityId: mahaDeity,
          mantra: mahaMantra.trim(),
          goalJapas: goal,
          startDate: mahaStart,
          endDate: mahaEnd,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMahaCreateError(data.error || 'Failed');
        return;
      }
      setShowMahaCreate(false);
      setMahaName('');
      setMahaDeity('');
      setMahaMantra('');
      setMahaGoal('');
      setMahaStart(new Date().toISOString().slice(0, 10));
      const endD = new Date();
      endD.setMonth(endD.getMonth() + 3);
      setMahaEnd(endD.toISOString().slice(0, 10));
      setMahaYagnas((prev) => [
        ...prev,
        {
          id: data.yagnaId,
          name: mahaName.trim(),
          deityId: mahaDeity,
          deityName: deityName(mahaDeity),
          mantra: mahaMantra.trim(),
          goalJapas: goal,
          currentJapas: 0,
          participantCount: 0,
          startDate: mahaStart,
          endDate: mahaEnd,
          status: 'active',
        },
      ]);
    } catch {
      setMahaCreateError('Failed');
    } finally {
      setMahaCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(PRIEST_TOKEN_KEY);
    localStorage.removeItem(PRIEST_TEMPLE_KEY);
    setToken(null);
    setTemple(null);
    navigate('/settings', { replace: true });
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

  const openMarathonEdit = (m: Marathon) => {
    setEditingMarathon(m);
    setEditDeity(m.deityId);
    setEditTarget(String(m.targetJapas));
    setEditDate(m.startDate);
    setEditError(null);
  };

  const handleMarathonEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMarathon) return;
    const target = Math.round(Number(editTarget));
    if (!Number.isFinite(target) || target < 1) {
      setEditError('Target japas must be a positive number');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/marathon-edit` : '/api/priest/marathon-edit';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          marathonId: editingMarathon.id,
          deityId: editDeity,
          targetJapas: target,
          startDate: editDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || 'Failed');
        return;
      }
      setEditingMarathon(null);
      setMarathons((prev) =>
        prev.map((m) =>
          m.id === editingMarathon.id ? { ...m, deityId: editDeity, targetJapas: target, startDate: editDate } : m
        )
      );
    } catch {
      setEditError('Failed');
    } finally {
      setEditSaving(false);
    }
  };

  const openMahaEdit = (y: MahaYagna) => {
    setEditingMahaYagna(y);
    setMahaEditName(y.name);
    setMahaEditDeity(y.deityId);
    setMahaEditMantra(y.mantra);
    setMahaEditGoal(String(y.goalJapas));
    setMahaEditStart(y.startDate);
    setMahaEditEnd(y.endDate);
    setMahaEditStatus((y.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed');
    setMahaEditError(null);
  };

  const handleMahaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMahaYagna) return;
    const goal = Math.round(Number(mahaEditGoal));
    if (!Number.isFinite(goal) || goal < 1) {
      setMahaEditError('Goal japas must be a positive number');
      return;
    }
    setMahaEditSaving(true);
    setMahaEditError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas-edit` : '/api/priest/maha-yagnas-edit';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          yagnaId: editingMahaYagna.id,
          name: mahaEditName.trim(),
          deityId: mahaEditDeity,
          mantra: mahaEditMantra.trim(),
          goalJapas: goal,
          startDate: mahaEditStart,
          endDate: mahaEditEnd,
          status: mahaEditStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMahaEditError(data.error || 'Failed');
        return;
      }
      setEditingMahaYagna(null);
      setMahaYagnas((prev) =>
        prev.map((y) =>
          y.id === editingMahaYagna.id
            ? { ...y, name: mahaEditName.trim(), deityId: mahaEditDeity, mantra: mahaEditMantra.trim(), goalJapas: goal, startDate: mahaEditStart, endDate: mahaEditEnd, status: mahaEditStatus }
            : y
        )
      );
    } catch {
      setMahaEditError('Failed');
    } finally {
      setMahaEditSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="relative min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-amber-400 mb-4">Priest Dashboard</h1>
        <p className="text-amber-200/80 text-center mb-6 max-w-sm">
          Sign in with Google first, then link your priest account in Settings.
        </p>
        <Link to="/settings" className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold">
          Go to Settings
        </Link>
        <Link to="/" className="text-amber-200/70 text-sm mt-4 underline">
          ← Back to Japam
        </Link>
        </div>
      </div>
    );
  }

  const deityName = (id: string) => DEITIES.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="relative min-h-screen p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
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
      {editingMarathon && (
        <form onSubmit={handleMarathonEdit} className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-4">
          <h3 className="text-amber-400 font-medium">Edit marathon</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={editDeity}
              onChange={(e) => setEditDeity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            >
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
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          {editError && <p className="text-red-400 text-sm">{editError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={editSaving} className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50">
              {editSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingMarathon(null)} className="px-4 py-2 rounded-xl bg-white/10 text-amber-200">
              Cancel
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <p className="text-amber-200/70 text-sm">Loading…</p>
      ) : marathons.length === 0 ? (
        <p className="text-amber-200/60 text-sm mb-4">No marathons yet. Create one below.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {marathons.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-amber-200">{deityName(m.deityId)} • Target: {m.targetJapas}</p>
                <p className="text-amber-200/70 text-xs">Started: {m.startDate}</p>
                <p className="text-amber-200/80 text-sm mt-2">
                  Joined: {m.joinedCount} • Today: {m.japasToday} • Total: {m.totalJapas}
                </p>
                {m.topParticipants && m.topParticipants.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-amber-500/20">
                    <p className="text-amber-200/70 text-xs font-medium mb-1">Top participants (with last active)</p>
                    {m.topParticipants.map((p, idx) => (
                      <p key={`${p.uid}-${idx}`} className="text-amber-200/60 text-xs">
                        {idx + 1}. {p.name} — {p.japasCount} japas {p.lastActiveAt ? `• last active ${new Date(p.lastActiveAt).toLocaleString()}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => openMarathonEdit(m)}
                className="text-xs px-2 py-1 rounded bg-amber-500/80 text-white hover:bg-amber-500 shrink-0"
              >
                Edit
              </button>
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

      <h2 className="text-lg font-semibold text-amber-200 mb-4 mt-10">Maha Japa Yagnas</h2>
      {editingMahaYagna && (
        <form onSubmit={handleMahaEdit} className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-4">
          <h3 className="text-amber-400 font-medium">Edit Maha Japa Yagna</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Name</label>
            <input
              type="text"
              value={mahaEditName}
              onChange={(e) => setMahaEditName(e.target.value)}
              placeholder="e.g. Shiva Maha Japa Yagna"
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={mahaEditDeity}
              onChange={(e) => {
                setMahaEditDeity(e.target.value);
                const d = DEITIES.find((x) => x.id === e.target.value);
                if (d) setMahaEditMantra(d.mantra);
              }}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            >
              {DEITIES.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Mantra</label>
            <input
              type="text"
              value={mahaEditMantra}
              onChange={(e) => setMahaEditMantra(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Goal japas</label>
            <input
              type="number"
              min={1}
              value={mahaEditGoal}
              onChange={(e) => setMahaEditGoal(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
            <input
              type="date"
              value={mahaEditStart}
              onChange={(e) => setMahaEditStart(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">End date</label>
            <input
              type="date"
              value={mahaEditEnd}
              onChange={(e) => setMahaEditEnd(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Status</label>
            <select
              value={mahaEditStatus}
              onChange={(e) => setMahaEditStatus(e.target.value as 'active' | 'completed')}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {mahaEditError && <p className="text-red-400 text-sm">{mahaEditError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={mahaEditSaving} className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50">
              {mahaEditSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingMahaYagna(null)} className="px-4 py-2 rounded-xl bg-white/10 text-amber-200">
              Cancel
            </button>
          </div>
        </form>
      )}
      {mahaLoading ? (
        <p className="text-amber-200/70 text-sm">Loading…</p>
      ) : mahaYagnas.length === 0 ? (
        <p className="text-amber-200/60 text-sm mb-4">No Maha Japa Yagnas yet. Create one below.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {mahaYagnas.map((y) => (
            <div key={y.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-amber-200">{y.name}</p>
                <p className="text-amber-200/70 text-xs">{y.deityName} • {y.mantra}</p>
                <p className="text-amber-200/80 text-sm mt-2">
                  Goal: {y.goalJapas.toLocaleString()} • Current: {y.currentJapas.toLocaleString()} • {y.participantCount} participants
                </p>
                <p className="text-amber-200/60 text-xs">{y.startDate} – {y.endDate} • {y.status}</p>
              </div>
              <button
                type="button"
                onClick={() => openMahaEdit(y)}
                className="text-xs px-2 py-1 rounded bg-amber-500/80 text-white hover:bg-amber-500 shrink-0"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {!showMahaCreate ? (
        <button
          type="button"
          onClick={() => setShowMahaCreate(true)}
          className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold"
        >
          Create Maha Japa Yagna
        </button>
      ) : (
        <form onSubmit={handleMahaCreate} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 space-y-4">
          <h3 className="text-amber-400 font-medium">New Maha Japa Yagna (Temple)</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Name</label>
            <input
              type="text"
              value={mahaName}
              onChange={(e) => setMahaName(e.target.value)}
              placeholder="e.g. Shiva Maha Japa Yagna"
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={mahaDeity}
              onChange={(e) => {
                setMahaDeity(e.target.value);
                const d = DEITIES.find((x) => x.id === e.target.value);
                if (d) setMahaMantra(d.mantra);
              }}
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
            <label className="text-amber-200/80 text-sm block mb-1">Mantra</label>
            <input
              type="text"
              value={mahaMantra}
              onChange={(e) => setMahaMantra(e.target.value)}
              placeholder="e.g. Om Namah Shivaya"
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Goal japas</label>
            <input
              type="number"
              min={1}
              value={mahaGoal}
              onChange={(e) => setMahaGoal(e.target.value)}
              placeholder="e.g. 100000000"
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
            <input
              type="date"
              value={mahaStart}
              onChange={(e) => setMahaStart(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">End date</label>
            <input
              type="date"
              value={mahaEnd}
              onChange={(e) => setMahaEnd(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
          </div>
          {mahaCreateError && <p className="text-red-400 text-sm">{mahaCreateError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={mahaCreating} className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50">
              {mahaCreating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowMahaCreate(false)} className="px-4 py-2 rounded-xl bg-white/10 text-amber-200">
              Cancel
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
