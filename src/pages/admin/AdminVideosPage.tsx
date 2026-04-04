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
  const [newTitle, setNewTitle] = useState('');
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
      title: newTitle.trim().slice(0, 200),
      order: items.length,
    };
    setItems([...items, newItem]);
    setNewUrl('');
    setNewTitle('');
    setMessage(null);
  };

  const setItemTitle = (index: number, title: string) => {
    const next = items.map((it, i) => (i === index ? { ...it, title: title.slice(0, 200) } : it));
    setItems(next);
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
      <h1 className="text-2xl font-bold text-amber-400 mb-2">Reward videos (Adyathmika + Ads)</h1>
      <p className="text-xs text-amber-300/90 mb-4">
        Admin → <span className="font-semibold text-amber-200">Videos</span> in the nav above.
      </p>
      <p className="text-amber-200/80 text-sm mb-6 max-w-xl">
        Ordered playlist for +5 moves or +1 life. Add YouTube URLs. Order in the list is the rotation: each play picks
        the next video globally (1 → 2 → 3 → … → wrap), so clips alternate instead of random repeats.
      </p>

      <section
        className="mb-8 max-w-3xl rounded-xl border-2 border-amber-400/55 bg-zinc-950/90 p-4 sm:p-5 shadow-lg shadow-black/40"
        aria-labelledby="add-reward-video-heading"
      >
        <h2 id="add-reward-video-heading" className="text-lg font-semibold text-amber-300 mb-4">
          Add a video to the rotation
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="reward-video-name" className="block text-sm font-semibold text-white mb-1.5">
              Video display name
            </label>
            <input
              id="reward-video-name"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Morning mantra / Sponsor name"
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 text-white border-2 border-amber-500/40 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
            />
            <p className="mt-1 text-xs text-amber-200/60">Shown to players above the player (optional).</p>
          </div>
          <div>
            <label htmlFor="reward-video-youtube" className="block text-sm font-semibold text-white mb-1.5">
              YouTube link or video ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
              <input
                id="reward-video-youtube"
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or 11-character ID"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-zinc-900 text-white border-2 border-amber-500/40 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'adyathmika' | 'advertisement')}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-zinc-900 text-white border-2 border-amber-500/40 sm:min-w-[160px]"
                aria-label="Video category"
              >
                <option value="adyathmika">Adyathmika</option>
                <option value="advertisement">Advertisement</option>
              </select>
              <button
                type="button"
                onClick={handleAdd}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400"
              >
                Add to list
              </button>
            </div>
          </div>
        </div>
      </section>

      <ul className="space-y-2 mb-6">
        {items.map((it, i) => (
          <li
            key={it.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-black/30 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-amber-200/60 text-sm shrink-0">{i + 1}.</span>
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${it.type === 'adyathmika' ? 'bg-amber-500/30' : 'bg-cyan-500/30'}`}>
                {it.type}
              </span>
              <input
                type="text"
                value={it.title ?? ''}
                onChange={(e) => setItemTitle(i, e.target.value)}
                placeholder="Display name"
                maxLength={200}
                className="min-w-0 flex-1 px-3 py-1.5 rounded-lg bg-black/40 text-amber-100 border border-amber-500/25 text-sm"
                aria-label={`Video name ${i + 1}`}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0 sm:max-w-[45%]">
              <a
                href={`https://www.youtube.com/watch?v=${it.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline truncate text-sm"
                title={it.youtubeId}
              >
                {it.youtubeId}
              </a>
            </div>
            <div className="flex gap-1 shrink-0 sm:ml-auto">
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
