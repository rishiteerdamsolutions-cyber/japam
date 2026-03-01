import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeoButton } from '../components/NeoButton';
import { ChatBubble } from '../components/ChatBubble';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchMessages, sendMessage, fetchChat } from '../lib/apavargaApi';
import { usePriestStore } from '../store/priestStore';

interface Message {
  id: string;
  text: string;
  senderType: string;
  senderUid?: string;
  templeId?: string;
  isAutoReply?: boolean;
  createdAt: string;
}

export function ChatScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPriest = !!usePriestStore((s) => s.token);
  const { templeName } = usePriestStore((s) => ({ templeName: s.templeName }));
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatTempleName, setChatTempleName] = useState(templeName || '');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMessages(id), fetchChat(id)])
      .then(([msgs, chat]) => {
        if (!cancelled) {
          setMessages(msgs);
          if (chat?.templeName) setChatTempleName(chat.templeName);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!id || !message.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(id, message.trim());
      setMessage('');
      const msgs = await fetchMessages(id);
      setMessages(msgs);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const pollMessages = () => {
    if (!id) return;
    fetchMessages(id).then(setMessages);
  };

  useEffect(() => {
    const t = setInterval(pollMessages, 5000);
    return () => clearInterval(t);
  }, [id]);

  if (!id) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <button type="button" onClick={() => navigate(-1)} className="text-white/80 hover:text-white" aria-label="Back">←</button>
        <PriestAvatarCoin size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-heading font-medium text-white">{chatTempleName || templeName || 'Chat'}</p>
          <p className="text-[#FFD700] text-[10px] font-mono">Verified priest</p>
        </div>
        <NeoButton variant="primaryGold" onClick={() => navigate('/appointments')}>Book</NeoButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-white/60 font-mono text-sm">Loading…</p>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              text={m.text}
              isOwn={m.senderType === (isPriest ? 'priest' : 'seeker')}
              isAutoReply={m.isAutoReply}
              timestamp={m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="sticky bottom-0 p-4 bg-black/95 backdrop-blur border-t border-white/10"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl bg-[#151515] text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[#FFD700]/50"
          />
          <NeoButton variant="icon" onClick={handleSend} disabled={!message.trim() || sending}>
            <span className="text-lg">➤</span>
          </NeoButton>
        </div>
      </div>
    </div>
  );
}
