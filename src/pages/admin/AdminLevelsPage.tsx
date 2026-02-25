import { useState, useEffect } from 'react';
import { getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const MAX_LEVELS = 1000;

export function AdminLevelsPage() {
  const [revealedCount, setRevealedCount] = useState(50);
  const [inputValue, setInputValue] = useState('50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const url = API_BASE ? `${API_BASE}/api/admin/levels` : '/api/admin/levels';
    fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const count = data?.revealedCount ?? (data?.maxRevealedLevelIndex != null ? data.maxRevealedLevelIndex + 1 : 50);
        setRevealedCount(Math.min(MAX_LEVELS, Math.max(1, count)));
        setInputValue(String(Math.min(MAX_LEVELS, Math.max(1, count))));
      })
      .catch(() => {
        if (!cancelled) setMessage('Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    const num = parseInt(inputValue, 10);
    if (!Number.isFinite(num) || num < 1 || num > MAX_LEVELS) {
      setMessage(`Enter a number between 1 and ${MAX_LEVELS}`);
      return;
    }
    const token = getStoredAdminToken();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/levels` : '/api/admin/levels';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ token, revealCount: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Failed to save');
        if (res.status === 401) window.location.href = '/admin';
        return;
      }
      setRevealedCount(num);
      setMessage(`Saved. ${num} level(s) are now revealed. Users can play levels 1–${num}.`);
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-amber-200/80">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-amber-400">Reveal levels</h2>
      <p className="text-amber-200/80 text-sm">
        Total levels in the game: {MAX_LEVELS}. By default 50 are revealed. Set how many levels (1–{MAX_LEVELS}) users can access. Once you reveal more, all paid users can play up to that level.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-amber-200/90 text-sm">
          Revealed levels (1–{MAX_LEVELS}):
        </label>
        <input
          type="number"
          min={1}
          max={MAX_LEVELS}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-24 px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p className="text-amber-200/60 text-sm">
        Current: levels 1–{revealedCount} are revealed.
      </p>
      {message && (
        <p className={`text-sm ${message.startsWith('Saved') ? 'text-green-400' : 'text-amber-200'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
