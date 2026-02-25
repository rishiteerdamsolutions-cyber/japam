import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Temple {
  id: string;
  name: string;
  state: string;
  district: string;
  cityTownVillage: string;
  area: string;
  priestUsername: string;
}

interface TemplesListProps {
  adminToken: string | null;
  refreshTrigger?: number;
  onUnauthorized?: () => void;
}

export function TemplesList({ adminToken, refreshTrigger, onUnauthorized }: TemplesListProps) {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemples = async () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/data` : '/api/admin/data';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({ token: adminToken, type: 'temples' }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Failed to load');
        setTemples([]);
        return;
      }
      setTemples(data.temples || []);
    } catch {
      setError('Failed to load');
      setTemples([]);
    } finally {
      setLoading(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (templeId: string) => {
    if (!adminToken) return;
    if (!confirm('Delete this temple and all its marathons? This cannot be undone.')) return;
    setDeletingId(templeId);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/delete-temple` : '/api/admin/delete-temple';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({ token: adminToken, templeId }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (res.ok) loadTemples();
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (adminToken) loadTemples();
  }, [adminToken, refreshTrigger]);

  const getLocationLabel = (t: Temple) => {
    const parts = [t.state, t.district, t.cityTownVillage].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) return <p className="text-amber-200/70 text-sm">Loading temples…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (temples.length === 0) return <p className="text-amber-200/60 text-sm">No temples yet. Add one above.</p>;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-amber-200/80 text-sm font-medium">{temples.length} temple(s)</p>
      {temples.map((t) => (
        <div key={t.id} className="p-3 rounded-lg bg-black/30 border border-amber-500/20 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-amber-200">{t.name}</p>
            <p className="text-amber-200/70 text-xs">{getLocationLabel(t)} • {t.area}</p>
            <p className="text-amber-200/60 text-xs">Priest: {t.priestUsername}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(t.id)}
            disabled={deletingId === t.id}
            className="text-xs px-2 py-1 rounded bg-red-600/80 text-white disabled:opacity-50"
          >
            {deletingId === t.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
