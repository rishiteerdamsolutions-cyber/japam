import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Participant {
  userId: string;
  displayName: string;
  japasCount: number;
}

interface Marathon {
  id: string;
  templeName: string;
  priestUsername: string;
  deityName: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  topParticipants: Participant[];
}

interface AdminMarathonsListProps {
  adminToken: string | null;
  onUnauthorized?: () => void;
}

export function AdminMarathonsList({ adminToken, onUnauthorized }: AdminMarathonsListProps) {
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  }, [adminToken]);

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

  if (loading) return <p className="text-amber-200/70 text-sm">Loading marathons…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (marathons.length === 0) return <p className="text-amber-200/60 text-sm">No marathons yet.</p>;

  return (
    <div className="space-y-4">
      <p className="text-amber-200/80 text-sm font-medium">{marathons.length} marathon(s)</p>
      {marathons.map((m) => (
        <div key={m.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-amber-200">{m.deityName} • {m.targetJapas} japas</p>
            <p className="text-amber-200/70 text-xs">Temple: {m.templeName} • Priest: {m.priestUsername}</p>
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
          <button
            type="button"
            onClick={() => handleDelete(m.id)}
            disabled={deletingId === m.id}
            className="text-xs px-2 py-1 rounded bg-red-600/80 text-white disabled:opacity-50 shrink-0"
          >
            {deletingId === m.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
