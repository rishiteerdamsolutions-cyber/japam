import { useState, useEffect } from 'react';
import { DEITIES } from '../../data/deities';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Participant {
  userId: string;
  displayName: string;
  japasCount: number;
}

interface Marathon {
  id: string;
  templeId?: string | null;
  templeName: string;
  priestUsername: string;
  isCommunity?: boolean;
  deityId?: string;
  deityName: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  topParticipants: Participant[];
  communityName?: string;
  state?: string;
  district?: string;
  cityTownVillage?: string;
  area?: string;
}

interface AdminMarathonsListProps {
  adminToken: string | null;
  onUnauthorized?: () => void;
  refreshTrigger?: number;
}

export function AdminMarathonsList({ adminToken, onUnauthorized, refreshTrigger }: AdminMarathonsListProps) {
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMarathon, setEditingMarathon] = useState<Marathon | null>(null);
  const [editDeityId, setEditDeityId] = useState('');
  const [editTargetJapas, setEditTargetJapas] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadMarathons = () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    const url = API_BASE ? `${API_BASE}/api/admin/data` : '/api/admin/data';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
      body: JSON.stringify({ token: adminToken, type: 'marathons' }),
    })
      .then((r) => {
        if (r.status === 401) {
          onUnauthorized?.();
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data == null) return;
        if (data.error) {
          setError(data.error);
          setMarathons([]);
        } else {
          setMarathons(data.marathons || []);
        }
      })
      .catch(() => {
        setError('Failed to load');
        setMarathons([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMarathons();
  }, [adminToken, refreshTrigger]);

  const handleDelete = async (marathonId: string) => {
    if (!adminToken) return;
    if (!confirm('Delete this marathon and all participations? This cannot be undone.')) return;
    setDeletingId(marathonId);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/delete-marathon` : '/api/admin/delete-marathon';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({ token: adminToken, marathonId }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (res.ok) loadMarathons();
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (m: Marathon) => {
    setEditingMarathon(m);
    setEditDeityId(m.deityId || '');
    setEditTargetJapas(String(m.targetJapas));
    setEditStartDate(m.startDate);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingMarathon) return;
    const target = Math.round(Number(editTargetJapas));
    if (!Number.isFinite(target) || target < 1) {
      setEditError('Target japas must be a positive number');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/marathon-edit` : '/api/admin/marathon-edit';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          token: adminToken,
          marathonId: editingMarathon.id,
          deityId: editDeityId,
          targetJapas: target,
          startDate: editStartDate,
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
      setEditingMarathon(null);
      loadMarathons();
    } catch {
      setEditError('Failed');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <p className="text-amber-200/70 text-sm">Loading marathons…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (marathons.length === 0) return <p className="text-amber-200/60 text-sm">No marathons yet.</p>;

  return (
    <div className="space-y-4">
      {editingMarathon && (
        <form onSubmit={handleSaveEdit} className="p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-3">
          <h3 className="text-amber-300 font-medium">Edit marathon</h3>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
            <select
              value={editDeityId}
              onChange={(e) => setEditDeityId(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
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
              value={editTargetJapas}
              onChange={(e) => setEditTargetJapas(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
            <input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              required
            />
          </div>
          {editError && <p className="text-red-400 text-sm">{editError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={editSaving} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50">
              {editSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingMarathon(null)} className="px-4 py-2 rounded-lg bg-white/10 text-amber-200 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}
      <p className="text-amber-200/80 text-sm font-medium">{marathons.length} marathon(s)</p>
      {marathons.map((m) => (
        <div key={m.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-amber-200">{m.deityName} • {m.targetJapas} japas</p>
            <p className="text-amber-200/70 text-xs">{m.isCommunity ? 'Community:' : 'Temple:'} {m.templeName} • {m.isCommunity ? 'Admin' : `Priest: ${m.priestUsername}`}</p>
            <p className="text-amber-200/60 text-xs">Started {m.startDate} • {m.joinedCount} joined</p>
            {m.topParticipants.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-500/10">
                <p className="text-amber-200/80 text-xs font-medium mb-1">Top participants</p>
                {m.topParticipants.slice(0, 6).map((p, i) => (
                  <p key={p.userId} className="text-amber-200/60 text-xs">
                    {i + 1}. {p.displayName} — {p.japasCount} japas
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openEdit(m)}
              className="text-xs px-2 py-1 rounded bg-amber-500/80 text-white hover:bg-amber-500"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(m.id)}
              disabled={deletingId === m.id}
              className="text-xs px-2 py-1 rounded bg-red-600/80 text-white disabled:opacity-50"
            >
              {deletingId === m.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
