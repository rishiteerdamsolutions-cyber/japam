import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeoButton } from '../components/NeoButton';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchChats, fetchTemples, createChat } from '../lib/apavargaApi';

interface Chat {
  id: string;
  type?: string;
  templeId?: string;
  templeName?: string;
  participants?: string[];
  lastMessageAt?: string;
}

interface Temple {
  id: string;
  name: string;
  priestUsername: string;
}

export function ChatsPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="font-heading font-semibold text-xl text-white">Chats</h1>
        <p className="text-white/60 text-xs font-mono mt-1">Talk to priests and fellow seekers</p>
      </header>

      <div className="p-4 space-y-4">
        {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

        {chats.length > 0 && (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/chats/${chat.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/chats/${chat.id}`)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#151515] border border-white/10 shadow-[6px_6px_0_rgba(0,0,0,0.4)] cursor-pointer hover:border-[#FFD700]/30 transition-colors"
              >
                <PriestAvatarCoin size={56} />
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-medium text-white">{chat.templeName || 'Chat'}</p>
                  <p className="text-white/50 text-xs font-mono truncate">Tap to open</p>
                </div>
                <NeoButton variant="primaryGold" onClick={(e) => { e?.stopPropagation(); navigate('/appointments'); }}>
                  Book
                </NeoButton>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-heading font-medium text-white mt-6">Start a chat</h2>
        <div className="space-y-2">
          {temples.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => openOrCreateChat(t.id)}
              onKeyDown={(e) => e.key === 'Enter' && openOrCreateChat(t.id)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#151515] border border-white/10 shadow-[6px_6px_0_rgba(0,0,0,0.4)] cursor-pointer hover:border-[#FFD700]/30 transition-colors"
            >
              <PriestAvatarCoin size={56} />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-medium text-white">{t.name}</p>
                <p className="text-white/50 text-xs font-mono truncate">Verified priest</p>
              </div>
              <NeoButton variant="primaryGold" onClick={(e) => { e?.stopPropagation(); navigate(`/appointments?templeId=${t.id}`); }}>
                Book
              </NeoButton>
            </div>
          ))}
        </div>

        {temples.length === 0 && chats.length === 0 && (
          <p className="text-white/50 text-xs font-mono mt-6">No priests available yet.</p>
        )}
      </div>
    </div>
  );
}
