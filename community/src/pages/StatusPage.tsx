import { useEffect, useState } from 'react';
import { NeoButton } from '../components/NeoButton';
import { fetchStatusFeed, createStatus } from '../lib/apavargaApi';

interface Status {
  id: string;
  text: string;
  authorType: string;
  templeName?: string;
  mediaUrl?: string;
  createdAt: string;
  expiresAt: string;
}

export function StatusPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStatusFeed()
      .then((s) => { if (!cancelled) setStatuses(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handlePost = async () => {
    if (!newText.trim() || posting) return;
    setPosting(true);
    try {
      await createStatus(newText.trim());
      setNewText('');
      setShowAdd(false);
      const s = await fetchStatusFeed();
      setStatuses(s);
    } catch {
      // ignore
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
        <h1 className="font-heading font-semibold text-xl text-white">Status</h1>
        <p className="text-white/60 text-xs font-mono mt-1">Spiritual updates • Expires in 24h</p>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full border-2 border-[#FFD700] flex items-center justify-center bg-[#151515] text-2xl text-[#FFD700]">
              +
            </div>
            <span className="text-[10px] font-mono text-white/70">Add</span>
          </button>
          {statuses.slice(0, 10).map((s) => (
            <div key={s.id} className="flex-shrink-0 w-20 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full border-2 border-[#FFD700]/60 flex items-center justify-center bg-[#1a1a1a] overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/20 to-transparent flex items-center justify-center p-2">
                  <span className="text-[10px] font-mono text-white/80 truncate text-center">{s.text?.slice(0, 20) || '…'}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-white/70 truncate w-full text-center">{s.templeName || 'Seeker'}</span>
            </div>
          ))}
        </div>

        {showAdd ? (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Share a spiritual thought..."
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[#FFD700]/50 min-h-[100px]"
              maxLength={500}
            />
            <div className="flex gap-2">
              <NeoButton variant="primaryGold" onClick={handlePost} disabled={!newText.trim() || posting}>
                {posting ? 'Posting…' : 'Post'}
              </NeoButton>
              <NeoButton variant="ghost" onClick={() => { setShowAdd(false); setNewText(''); }}>Cancel</NeoButton>
            </div>
          </div>
        ) : (
          <NeoButton variant="primaryGold" fullWidth onClick={() => setShowAdd(true)}>
            Add status
          </NeoButton>
        )}

        <h2 className="font-heading font-medium text-white mt-6">Recent</h2>
        <div className="space-y-2">
          {statuses.map((s) => (
            <div key={s.id} className="p-4 rounded-2xl bg-[#151515] border border-white/10">
              <p className="text-white/80 font-mono text-sm">{s.text}</p>
              <p className="text-white/50 text-[10px] font-mono mt-1">{s.templeName || 'Seeker'} • Expires {new Date(s.expiresAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
        {statuses.length === 0 && !showAdd && <p className="text-white/50 text-xs font-mono">No statuses yet.</p>}
      </div>
    </div>
  );
}
