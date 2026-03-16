import { useEffect, useState } from 'react';
import { NeoButton } from '../components/NeoButton';
import { fetchReals, createReal } from '../lib/apavargaApi';

interface Real {
  id: string;
  caption?: string;
  createdAt: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  templeName?: string | null;
  authorDisplayName?: string | null;
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
        <NeoButton variant="primaryGold" fullWidth onClick={() => setShowNew(true)}>
          + Create real
        </NeoButton>

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
              <NeoButton variant="primaryGold" onClick={handlePost} disabled={!text.trim() || posting}>
                {posting ? 'Posting…' : 'Post'}
              </NeoButton>
              <NeoButton variant="ghost" onClick={() => { setShowNew(false); setText(''); setError(null); }}>
                Cancel
              </NeoButton>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {reals.map((r) => (
            <div key={r.id} className="rounded-2xl bg-[#151515] border border-white/10 overflow-hidden">
              <div className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--primary)]/90 text-xs font-mono mb-1">
                    {r.authorDisplayName || r.templeName || 'Anonymous'}
                  </p>
                  {r.mediaUrl && (
                    <div className="rounded-xl overflow-hidden bg-black/40 my-2">
                      {r.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={r.mediaUrl} controls className="w-full max-h-64" playsInline />
                      ) : (
                        <img src={r.thumbnailUrl || r.mediaUrl} alt="" className="w-full max-h-64 object-cover" />
                      )}
                    </div>
                  )}
                  {r.caption && <p className="text-white/90 font-mono text-sm whitespace-pre-wrap">{r.caption}</p>}
                  <p className="text-white/40 text-[10px] font-mono mt-1">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {reals.length === 0 && !showNew && <p className="text-white/50 text-xs font-mono">No reals yet. Create one above.</p>}
        {hasMore && reals.length > 0 && (
          <NeoButton variant="ghost" fullWidth onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </NeoButton>
        )}
      </div>
    </div>
  );
}
