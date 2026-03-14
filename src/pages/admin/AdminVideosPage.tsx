import { useState, useEffect } from 'react';
import { getStoredAdminToken } from '../../lib/adminAuth';
import type { RewardVideoItem } from '../../components/game/RewardVideoModal';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function extractYoutubeId(urlOrId: string): string {
  const s = (urlOrId || '').trim();
  const shortsMatch = s.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1]!;
  const watchMatch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1]!;
  const embedMatch = s.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1]!;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return s.slice(-11);
}

export function AdminVideosPage() {
  const [items, setItems] = useState<RewardVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'adyathmika' | 'advertisement'>('adyathmika');

  useEffect(() => {
    let cancelled = false;
    const url = API_BASE ? `${API_BASE}/api/config/reward-videos` : '/api/config/reward-videos';
    fetch(url)
      .then((r) => r.json())
      .then((data: { items?: RewardVideoItem[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleAdd = () => {
    const id = extractYoutubeId(newUrl);
    if (!id || id.length !== 11) {
      setMessage('Enter a valid YouTube URL or video ID');
      return;
    }
    const newItem: RewardVideoItem = {
      id: `v${Date.now()}-${items.length}`,
      type: newType,
      youtubeId: id,
      title: '',
      order: items.length,
    };
    setItems([...items, newItem]);
    setNewUrl('');
    setMessage(null);
  };

  const handleRemove = (index: number) => {
    const next = items.filter((_, i) => i !== index).map((it, i) => ({ ...it, order: i }));
    setItems(next);
    setMessage(null);
  };

  const handleMove = (index: number, dir: 'up' | 'down') => {
    const next = [...items];
    const j = dir === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setItems(next.map((it, i) => ({ ...it, order: i })));
    setMessage(null);
  };

  const handleSave = async () => {
    const token = getStoredAdminToken();
    if (!token) return;
    const payload = items.map((it, i) => ({
      id: it.id,
      type: it.type,
      youtubeId: it.youtubeId,
      title: it.title ?? '',
      order: i,
    }));
    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/reward-videos` : '/api/admin/reward-videos';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Failed to save');
        if (res.status === 401) window.location.href = '/admin';
        return;
      }
      setMessage(`Saved ${payload.length} video(s)`);
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-amber-200">Loading…</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Reward videos (Adyathmika + Ads)</h1>
      <p className="text-amber-200/80 text-sm mb-4">
        Ordered playlist shown when users watch for +5 moves or +1 life. Add YouTube URLs.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="YouTube URL or video ID"
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as 'adyathmika' | 'advertisement')}
          className="px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
        >
          <option value="adyathmika">Adyathmika</option>
          <option value="advertisement">Advertisement</option>
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium"
        >
          Add
        </button>
      </div>

      <ul className="space-y-2 mb-6">
        {items.map((it, i) => (
          <li
            key={it.id}
            className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-amber-500/20"
          >
            <span className="text-amber-200/60 text-sm w-6">{i + 1}.</span>
            <span className={`px-2 py-0.5 rounded text-xs ${it.type === 'adyathmika' ? 'bg-amber-500/30' : 'bg-cyan-500/30'}`}>
              {it.type}
            </span>
            <a
              href={`https://www.youtube.com/watch?v=${it.youtubeId}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline truncate flex-1"
            >
              {it.youtubeId}
            </a>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleMove(i, 'up')}
                disabled={i === 0}
                className="p-1 rounded text-amber-400 hover:bg-amber-500/20 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => handleMove(i, 'down')}
                disabled={i === items.length - 1}
                className="p-1 rounded text-amber-400 hover:bg-amber-500/20 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="p-1 rounded text-red-400 hover:bg-red-500/20"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="text-amber-200/60 text-sm mb-4">No videos yet. Add one above.</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save order'}
      </button>
      {message && <p className="mt-4 text-amber-200 text-sm">{message}</p>}
    </>
  );
}
