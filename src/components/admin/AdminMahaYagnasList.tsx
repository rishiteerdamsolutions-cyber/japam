import { useState, useEffect } from 'react';
import { DEITIES } from '../../data/deities';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Temple {
  id: string;
  name: string;
}

interface Yagna {
  id: string;
  name: string;
  description?: string;
  deityId: string;
  deityName: string;
  mantra: string;
  goalJapas: number;
  currentJapas: number;
  participantCount: number;
  startDate: string;
  endDate: string;
  status: string;
  templeId: string | null;
  templeName: string;
  creatorRole: string;
}

interface AdminMahaYagnasListProps {
  adminToken: string | null;
  onUnauthorized?: () => void;
}

export function AdminMahaYagnasList({ adminToken, onUnauthorized }: AdminMahaYagnasListProps) {
  const [yagnas, setYagnas] = useState<Yagna[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDeityId, setCreateDeityId] = useState('');
  const [createMantra, setCreateMantra] = useState('');
  const [createGoal, setCreateGoal] = useState('');
  const [createStart, setCreateStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [createEnd, setCreateEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [createTempleId, setCreateTempleId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingYagna, setEditingYagna] = useState<Yagna | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeityId, setEditDeityId] = useState('');
  const [editMantra, setEditMantra] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'completed'>('active');
  const [editTempleId, setEditTempleId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadYagnas = () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    const url = API_BASE ? `${API_BASE}/api/admin/maha-yagnas` : '/api/admin/maha-yagnas';
    fetch(url, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
    })
      .then((r) => {
        if (r.status === 401) {
          onUnauthorized?.();
          return null;
        }
        return r.json();
      })
      .then((data: { yagnas?: Yagna[]; error?: string }) => {
        if (data == null) return;
        if (data.error) {
          setError(data.error);
          setYagnas([]);
        } else {
          setYagnas(data.yagnas || []);
        }
      })
      .catch(() => {
        setError('Failed to load');
        setYagnas([]);
      })
      .finally(() => setLoading(false));
  };

  const loadTemples = () => {
    if (!adminToken) return;
    const url = API_BASE ? `${API_BASE}/api/admin/list-temples` : '/api/admin/list-temples';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
      body: JSON.stringify({ token: adminToken }),
    })
      .then((r) => {
        if (r.status === 401) {
          onUnauthorized?.();
          return null;
        }
        return r.json();
      })
      .then((data: { temples?: Temple[] }) => {
        if (data && Array.isArray(data.temples)) setTemples(data.temples);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadYagnas();
  }, [adminToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    if (!createName.trim() || !createDeityId || !createMantra.trim()) {
      setCreateError('Name, deity, and mantra required');
      return;
    }
    const goal = Math.round(Number(createGoal));
    if (!Number.isFinite(goal) || goal < 1) {
      setCreateError('Goal japas must be a positive number');
      return;
    }
    if (!createStart || !createEnd) {
      setCreateError('Start and end date required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/maha-yagnas` : '/api/admin/maha-yagnas';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          token: adminToken,
          name: createName.trim(),
          description: createDescription.trim(),
          deityId: createDeityId,
          mantra: createMantra.trim(),
          goalJapas: goal,
          startDate: createStart,
          endDate: createEnd,
          templeId: createTempleId.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create');
        return;
      }
      setShowCreate(false);
      setCreateName('');
      setCreateDescription('');
      setCreateDeityId('');
      setCreateMantra('');
      setCreateGoal('');
      setCreateTempleId('');
      loadYagnas();
    } catch {
      setCreateError('Failed');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (y: Yagna) => {
    setEditingYagna(y);
    setEditName(y.name);
    setEditDescription(y.description ?? '');
    setEditDeityId(y.deityId);
    setEditMantra(y.mantra);
    setEditGoal(String(y.goalJapas));
    setEditStart(y.startDate);
    setEditEnd(y.endDate);
    setEditStatus((y.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed');
    setEditTempleId(y.templeId ?? '');
    setEditError(null);
    loadTemples();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingYagna) return;
    const goal = Math.round(Number(editGoal));
    if (!Number.isFinite(goal) || goal < 1) {
      setEditError('Goal japas must be a positive number');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/maha-yagnas-edit` : '/api/admin/maha-yagnas-edit';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          token: adminToken,
          yagnaId: editingYagna.id,
          name: editName.trim(),
          description: editDescription.trim(),
          deityId: editDeityId,
          mantra: editMantra.trim(),
          goalJapas: goal,
          startDate: editStart,
          endDate: editEnd,
          templeId: editTempleId.trim() || null,
          status: editStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!res.ok) {
        setEditError(data.error || 'Failed');
        return;
      }
      setEditingYagna(null);
      loadYagnas();
    } catch {
      setEditError('Failed');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <p className="text-amber-200/70 text-sm">Loading…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-amber-200/80 text-sm font-medium">{yagnas.length} Maha Japa Yagna(s)</p>
        <button
          type="button"
          onClick={() => { setShowCreate(!showCreate); if (!showCreate) loadTemples(); setCreateError(null); }}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium"
        >
          {showCreate ? 'Cancel' : 'Create Yagna'}
        </button>
      </div>

      {editingYagna && (
        <form onSubmit={handleEdit} className="p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-3">
          <h3 className="text-amber-300 font-medium">Edit Maha Japa Yagna</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Global Shiva Maha Japa Yagna"
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Description (optional)</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={editDeityId}
              onChange={(e) => {
                setEditDeityId(e.target.value);
                const d = DEITIES.find((x) => x.id === e.target.value);
                if (d) setEditMantra(d.mantra);
              }}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
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
              value={editMantra}
              onChange={(e) => setEditMantra(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Goal japas</label>
            <input
              type="number"
              min={1}
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div className="flex gap-4">
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">End date</label>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as 'active' | 'completed')}
              className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Temple (optional, leave empty for Global)</label>
            <select
              value={editTempleId}
              onChange={(e) => setEditTempleId(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
            >
              <option value="">Global</option>
              {temples.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {editError && <p className="text-red-400 text-sm">{editError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={editSaving} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50">
              {editSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingYagna(null)} className="px-4 py-2 rounded-lg bg-white/10 text-amber-200 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 space-y-3">
          <h3 className="text-amber-300 font-medium">Create Maha Japa Yagna (Global or Temple)</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Global Shiva Maha Japa Yagna"
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Description (optional)</label>
            <input
              type="text"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={createDeityId}
              onChange={(e) => {
                setCreateDeityId(e.target.value);
                const d = DEITIES.find((x) => x.id === e.target.value);
                if (d) setCreateMantra(d.mantra);
              }}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
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
              value={createMantra}
              onChange={(e) => setCreateMantra(e.target.value)}
              placeholder="e.g. Om Namah Shivaya"
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Goal japas</label>
            <input
              type="number"
              min={1}
              value={createGoal}
              onChange={(e) => setCreateGoal(e.target.value)}
              placeholder="e.g. 100000000"
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div className="flex gap-4">
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
              <input
                type="date"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">End date</label>
              <input
                type="date"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Temple (optional, leave empty for Global)</label>
            <select
              value={createTempleId}
              onChange={(e) => setCreateTempleId(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
            >
              <option value="">Global</option>
              {temples.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {createError && <p className="text-red-400 text-sm">{createError}</p>}
          <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {yagnas.length === 0 ? (
        <p className="text-amber-200/60 text-sm">No Maha Japa Yagnas yet.</p>
      ) : (
        yagnas.map((y) => (
          <div key={y.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-amber-200">{y.name}</p>
              <p className="text-amber-200/70 text-xs">{y.deityName} • {y.mantra}</p>
              <p className="text-amber-200/60 text-xs mt-1">
                Goal: {y.goalJapas.toLocaleString()} • Current: {y.currentJapas.toLocaleString()} • {y.participantCount} participants
              </p>
              <p className="text-amber-200/60 text-xs">
                {y.startDate} – {y.endDate} • {y.templeName} • {y.status}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/maha-yagnas?yagnaId=${encodeURIComponent(y.id)}`;
                  navigator.clipboard?.writeText(link).then(() => alert('Link copied! Share with priests to distribute to devotees.')).catch(() => {});
                }}
                className="text-xs px-2 py-1 rounded bg-green-600/80 text-white hover:bg-green-600"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => openEdit(y)}
                className="text-xs px-2 py-1 rounded bg-amber-500/80 text-white hover:bg-amber-500"
              >
                Edit
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
