import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeoButton } from '../components/NeoButton';
import { StatusViewer, type StatusItem } from '../components/StatusViewer';
import { fetchStatusFeed, createStatus, markStatusViewed } from '../lib/apavargaApi';
import { useAuthStore } from '../store/authStore';
import { usePriestStore } from '../store/priestStore';

interface Status extends StatusItem {}

type AuthorGroup = { authorKey: string; authorLabel: string; statuses: Status[] };

function groupStatusesByAuthor(statuses: Status[]): AuthorGroup[] {
  const map = new Map<string, { authorLabel: string; statuses: Status[] }>();
  for (const s of statuses) {
    const key = s.authorType === 'priest' ? (s.templeId || '') : (s.authorUid || '');
    const label = s.authorType === 'priest' ? (s.templeName || 'Temple') : 'Seeker';
    if (!map.has(key)) map.set(key, { authorLabel: label, statuses: [] });
    map.get(key)!.statuses.push(s);
  }
  return Array.from(map.entries()).map(([authorKey, { authorLabel, statuses }]) => ({
    authorKey,
    authorLabel,
    statuses: statuses.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }));
}

export function StatusPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { token: priestToken, templeId: priestTempleId } = usePriestStore();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [viewedAuthorKeys, setViewedAuthorKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);
  const [viewer, setViewer] = useState<AuthorGroup | null>(null);

  const authorGroups = useMemo(() => groupStatusesByAuthor(statuses), [statuses]);
  const isPriest = !!priestToken;
  const myAuthorKey = isPriest ? priestTempleId : user?.uid ?? '';
  const myGroup = authorGroups.find((g) => g.authorKey === myAuthorKey);

  useEffect(() => {
    let cancelled = false;
    fetchStatusFeed()
      .then((feed) => {
        if (!cancelled) {
          setStatuses((feed.statuses || []) as Status[]);
          setViewedAuthorKeys(feed.viewedAuthorKeys || []);
        }
      })
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
      const feed = await fetchStatusFeed();
      setStatuses((feed.statuses || []) as Status[]);
      setViewedAuthorKeys(feed.viewedAuthorKeys || []);
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  const openViewer = (g: AuthorGroup) => {
    setViewer(g);
    markStatusViewed(g.authorKey).then(() => {
      setViewedAuthorKeys((prev) => (prev.includes(g.authorKey) ? prev : [...prev, g.authorKey]));
    }).catch(() => {});
  };

  const handleReply = () => {
    if (!viewer) return;
    setViewer(null);
    if (viewer.statuses[0]?.authorType === 'priest' && viewer.statuses[0]?.templeId) {
      navigate(`/chats?templeId=${viewer.statuses[0].templeId}`);
    } else {
      navigate('/chats');
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
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full border-2 border-[var(--primary)] flex items-center justify-center bg-[#151515] text-2xl text-[var(--primary)]">
              +
            </div>
            <span className="text-[10px] font-mono text-white/70">My status</span>
          </button>
          {myGroup && myGroup.statuses.length > 0 && (
            <button
              type="button"
              onClick={() => setViewer(myGroup!)}
              className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full border-2 border-[var(--primary)]/60 flex items-center justify-center bg-[#1a1a1a] overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-[var(--primary)]/20 to-transparent flex items-center justify-center p-2">
                  <span className="text-[10px] font-mono text-white/80 truncate text-center">
                    {myGroup.statuses[myGroup.statuses.length - 1]?.text?.slice(0, 20) || '…'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-white/70">You</span>
            </button>
          )}
          {authorGroups
            .filter((g) => g.authorKey !== myAuthorKey)
            .map((g) => {
              const unviewed = !viewedAuthorKeys.includes(g.authorKey);
              return (
              <button
                key={g.authorKey}
                type="button"
                onClick={() => openViewer(g)}
                className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
              >
                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center bg-[#1a1a1a] overflow-hidden ${unviewed ? 'border-[var(--primary)]' : 'border-[var(--primary)]/40'}`}>
                  <div className="w-full h-full bg-gradient-to-br from-[var(--primary)]/20 to-transparent flex items-center justify-center p-2">
                    <span className="text-[10px] font-mono text-white/80 truncate text-center">
                      {g.statuses[g.statuses.length - 1]?.text?.slice(0, 20) || '…'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-white/70 truncate w-full text-center">
                  {g.authorLabel}
                </span>
              </button>
              );
            })}
        </div>

        {viewer && (
          <StatusViewer
            statuses={viewer.statuses}
            authorLabel={viewer.authorLabel}
            onClose={() => setViewer(null)}
            onReply={handleReply}
          />
        )}

        {showAdd ? (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Share a spiritual thought..."
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[var(--primary)]/50 min-h-[100px]"
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
              <p className="text-white/50 text-[10px] font-mono mt-1">
                {s.templeName || 'Seeker'} • Expires {new Date(s.expiresAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        {statuses.length === 0 && !showAdd && <p className="text-white/50 text-xs font-mono">No statuses yet.</p>}
      </div>
    </div>
  );
}
