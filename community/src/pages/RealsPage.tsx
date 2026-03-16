import { useEffect, useState } from 'react';
import { fetchReals, createReal } from '../lib/apavargaApi';

interface Real {
  id: string;
  caption?: string;
  createdAt: string;
  templeName?: string | null;
}

export function RealsPage() {
  const [reals, setReals] = useState<Real[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReals()
      .then((r) => {
        if (!cancelled) {
          setReals(r);
          setHasMore(r.length >= 20);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadMore = async () => {
    if (reals.length === 0 || loadingMore || !hasMore) return;
    const lastId = reals[reals.length - 1].id;
    setLoadingMore(true);
    try {
      const next = await fetchReals(lastId);
      setReals((prev) => [...prev, ...next]);
      setHasMore(next.length >= 20);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      await createReal({ caption: text.trim() });
      setText('');
      setShowNew(false);
      const list = await fetchReals();
      setReals(list);
      setHasMore(list.length >= 20);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-24 flex items-center justify-center">
        <p className="text-white/60 font-mono text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="font-heading font-semibold text-xl text-white">Reals</h1>
        <p className="text-white/60 text-xs font-mono mt-1">Spiritual short posts</p>
      </header>

      <div className="p-4 space-y-4">
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="w-full py-3 rounded-xl bg-[var(--primary)] text-black font-medium border-b-4 border-[var(--primary-dark)]"
        >
          + Create real
        </button>

        {showNew && (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share a short spiritual insight..."
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm"
              maxLength={500}
            />
            {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePost}
                disabled={!text.trim() || posting}
                className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-black font-medium disabled:opacity-50"
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNew(false); setText(''); setError(null); }}
                className="px-4 py-3 rounded-xl border border-white/30 text-white/80"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {reals.map((r) => (
            <div key={r.id} className="rounded-2xl bg-[#151515] border border-white/10 overflow-hidden">
              <div className="p-3">
                {r.caption && <p className="text-white/90 font-mono text-sm whitespace-pre-wrap">{r.caption}</p>}
                {r.templeName && <p className="text-white/50 text-xs font-mono mt-1">{r.templeName}</p>}
              </div>
            </div>
          ))}
        </div>
        {reals.length === 0 && !showNew && <p className="text-white/50 text-xs font-mono">No reals yet. Create one above.</p>}
        {hasMore && reals.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 rounded-xl border border-white/20 text-white/80 font-mono text-sm disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}
