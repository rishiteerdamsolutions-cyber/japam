import { useEffect, useState, useRef } from 'react';
import { fetchReals, createReal } from '../lib/apavargaApi';
import { uploadApavargaMedia } from '../lib/firebase';

interface Real {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  caption?: string;
  createdAt: string;
  templeName?: string | null;
}

export function RealsPage() {
  const [reals, setReals] = useState<Real[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async () => {
    if (!uploadFile || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const mediaUrl = await uploadApavargaMedia(uploadFile, 'real');
      await createReal(mediaUrl, { caption: caption.trim() || undefined });
      setUploadFile(null);
      setCaption('');
      setShowUpload(false);
      const list = await fetchReals();
      setReals(list);
      setHasMore(list.length >= 20);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
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
        <p className="text-white/60 text-xs font-mono mt-1">Spiritual short videos</p>
      </header>

      <div className="p-4 space-y-4">
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="w-full py-3 rounded-xl bg-[var(--primary)] text-black font-medium border-b-4 border-[var(--primary-dark)]"
        >
          + Create real
        </button>

        {showUpload && (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-xl border border-dashed border-white/30 text-white/70 font-mono text-sm"
            >
              {uploadFile ? uploadFile.name : 'Choose video (mp4/webm)'}
            </button>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm"
              maxLength={500}
            />
            {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-black font-medium disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Post'}
              </button>
              <button
                type="button"
                onClick={() => { setShowUpload(false); setUploadFile(null); setCaption(''); setError(null); }}
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
              <div className="aspect-video bg-black flex items-center justify-center">
                <video
                  src={r.mediaUrl}
                  controls
                  className="max-w-full max-h-[50vh]"
                  poster={r.thumbnailUrl || undefined}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              {(r.caption || r.templeName) && (
                <div className="p-3">
                  {r.caption && <p className="text-white/90 font-mono text-sm">{r.caption}</p>}
                  {r.templeName && <p className="text-white/50 text-xs font-mono mt-1">{r.templeName}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        {reals.length === 0 && !showUpload && <p className="text-white/50 text-xs font-mono">No reals yet. Create one above.</p>}
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
