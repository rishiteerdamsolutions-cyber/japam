import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ListRow } from '../components/ListRow';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchChats, fetchTemples } from '../lib/apavargaApi';

interface Chat {
  id: string;
  type?: string;
  templeId?: string;
  templeName?: string;
  name?: string;
  otherDisplayName?: string;
  participants?: string[];
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessageSenderType?: string;
}

interface Temple {
  id: string;
  name: string;
  priestUsername: string;
}

function formatChatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ChatsPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchChats(), fetchTemples()])
      .then(([c, t]) => {
        if (!cancelled) {
          setChats(c);
          setTemples(t);
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

  const chatTitle = (c: Chat) => c.name || c.templeName || c.otherDisplayName || 'Chat';
  const filteredChats = search.trim()
    ? chats.filter((c) => chatTitle(c).toLowerCase().includes(search.trim().toLowerCase()))
    : chats;

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
        <h1 className="font-heading font-semibold text-xl text-white">Chats</h1>
        <p className="text-white/60 text-xs font-mono mt-0.5">Talk to priests and fellow seekers</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-[#151515] text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[var(--primary)]/50"
        />
      </header>

      <div className="p-4 space-y-2">
        {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

        <Link
          to="/people"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--primary)] text-black font-medium border-b-4 border-[var(--primary-dark)] shadow-[4px_4px_0_rgba(0,0,0,0.4)] active:translate-y-0.5"
        >
          <span className="text-lg">+</span> New chat
        </Link>

        {filteredChats.length > 0 && (
          <div className="space-y-1.5">
            {filteredChats.map((chat) => (
              <ListRow
                key={chat.id}
                avatar={<PriestAvatarCoin size={48} />}
                title={chatTitle(chat)}
                subtitle={chat.lastMessageText || 'Tap to open'}
                trailing={formatChatTime(chat.lastMessageAt)}
                onClick={() => navigate(`/chats/${chat.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/chats/${chat.id}`)}
              />
            ))}
          </div>
        )}

        {filteredChats.length === 0 && (
          <p className="text-white/50 text-xs font-mono mt-6">No chats yet. Tap New chat to start.</p>
        )}
      </div>
    </div>
  );
}
