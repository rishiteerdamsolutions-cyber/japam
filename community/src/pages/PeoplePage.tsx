import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListRow } from '../components/ListRow';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchChats, fetchTemples, createChat, fetchSeekers, createSeekerChat } from '../lib/apavargaApi';

interface Chat {
  id: string;
  type?: string;
  templeId?: string;
  participants?: string[];
}

interface Seeker {
  uid: string;
  displayName: string | null;
}

interface Temple {
  id: string;
  name: string;
  priestUsername: string;
}

export function PeoplePage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchChats(), fetchTemples(), fetchSeekers()])
      .then(([c, t, s]) => {
        if (!cancelled) {
          setChats(c);
          setTemples(t);
          setSeekers(s);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openOrCreateChat = async (templeId: string) => {
    const existing = chats.find((c) => c.templeId === templeId);
    if (existing) {
      navigate(`/chats/${existing.id}`);
      return;
    }
    try {
      const data = await createChat(templeId);
      navigate(`/chats/${data.chatId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const openOrCreateSeekerChat = async (seeker: Seeker) => {
    const existing = chats.find(
      (c) => c.type === 'direct_seeker' && c.participants?.includes(seeker.uid)
    );
    if (existing) {
      navigate(`/chats/${existing.id}`);
      return;
    }
    try {
      const data = await createSeekerChat(seeker.uid, seeker.displayName || undefined);
      navigate(`/chats/${data.chatId}`);
      setChats((prev) => [data.chat, ...prev].filter(Boolean));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const filteredTemples = search.trim()
    ? temples.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : temples;
  const filteredSeekers = search.trim()
    ? seekers.filter((s) => (s.displayName || s.uid).toLowerCase().includes(search.trim().toLowerCase()))
    : seekers;

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-24 flex items-center justify-center">
        <p className="text-white/60 font-mono text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <h1 className="font-heading font-semibold text-xl text-white">People</h1>
        <p className="text-white/60 text-xs font-mono mt-0.5">Find priests and seekers to chat with</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-[#151515] text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[var(--primary)]/50"
        />
      </header>

      <div className="p-4 space-y-6">
        {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

        <section>
          <h2 className="font-heading font-medium text-white text-sm mb-2">Talk to a priest</h2>
          <div className="space-y-1.5">
            {filteredTemples.length === 0 ? (
              <p className="text-white/50 text-xs font-mono py-2">No temples match.</p>
            ) : (
              filteredTemples.map((t) => (
                <ListRow
                  key={t.id}
                  avatar={<PriestAvatarCoin size={44} />}
                  title={t.name}
                  subtitle="Verified priest"
                  onClick={() => openOrCreateChat(t.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openOrCreateChat(t.id)}
                />
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-heading font-medium text-white text-sm mb-2">Message a seeker</h2>
          <div className="space-y-1.5">
            {filteredSeekers.length === 0 ? (
              <p className="text-white/50 text-xs font-mono py-2">No seekers match.</p>
            ) : (
              filteredSeekers.map((s) => (
                <ListRow
                  key={s.uid}
                  avatar={<div className="w-11 h-11 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-heading font-bold text-lg">ॐ</div>}
                  title={s.displayName || s.uid.slice(0, 8)}
                  subtitle="Seeker"
                  onClick={() => openOrCreateSeekerChat(s)}
                  onKeyDown={(e) => e.key === 'Enter' && openOrCreateSeekerChat(s)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
