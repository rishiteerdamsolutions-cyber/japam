import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatBubble } from '../components/ChatBubble';
import { ChatHeader } from '../components/ChatHeader';
import { ChatInputBar } from '../components/ChatInputBar';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchMessages, sendMessage, fetchChat, fetchBlockedUsers, blockUser, unblockUser } from '../lib/apavargaApi';
import { usePriestStore } from '../store/priestStore';
import { useAuthStore } from '../store/authStore';

interface Message {
  id: string;
  text: string;
  senderType: string;
  senderUid?: string;
  templeId?: string;
  isAutoReply?: boolean;
  mediaUrl?: string | null;
  mediaKind?: string | null;
  createdAt: string;
}

export function ChatScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPriest = !!usePriestStore((s) => s.token);
  const currentUid = useAuthStore((s) => s.user?.uid);
  const templeName = usePriestStore((s) => s.templeName);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatTempleName, setChatTempleName] = useState(templeName || '');
  const [chatMeta, setChatMeta] = useState<{ type?: string; name?: string; otherDisplayName?: string; participants?: string[]; adminOnlyMessaging?: boolean } | null>(null);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [blocking, setBlocking] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherUid = chatMeta?.type === 'direct_seeker' && chatMeta?.participants?.length === 2 && currentUid
    ? chatMeta.participants.find((p) => p !== currentUid)
    : undefined;
  const isBlocked = otherUid ? blockedSet.has(otherUid) : false;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMessages(id), fetchChat(id)])
      .then(([msgs, chat]) => {
        if (!cancelled) {
          setMessages(msgs);
          if (chat?.templeName) setChatTempleName(chat.templeName);
          if (chat) setChatMeta({ type: chat.type, name: chat.name, otherDisplayName: chat.otherDisplayName, participants: chat.participants, adminOnlyMessaging: chat.adminOnlyMessaging });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (chatMeta?.type !== 'direct_seeker' || !currentUid) return;
    fetchBlockedUsers()
      .then((list) => setBlockedSet(new Set(list)))
      .catch(() => {});
  }, [chatMeta?.type, currentUid]);

  const handleBlock = async () => {
    if (!otherUid || blocking) return;
    setBlocking(true);
    try {
      await blockUser(otherUid);
      setBlockedSet((s) => new Set([...s, otherUid]));
    } catch {
      // ignore
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (!otherUid || blocking) return;
    setBlocking(true);
    try {
      await unblockUser(otherUid);
      setBlockedSet((s) => {
        const next = new Set(s);
        next.delete(otherUid);
        return next;
      });
    } catch {
      // ignore
    } finally {
      setBlocking(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!id || sending) return;
    const textToSend = message.trim();
    if (!textToSend) return;
    setSending(true);
    try {
      await sendMessage(id, textToSend);
      setMessage('');
      const msgs = await fetchMessages(id);
      setMessages(msgs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSendError(msg || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => fetchMessages(id).then(setMessages), 5000);
    return () => clearInterval(t);
  }, [id]);

  if (!id) return null;

  const isGroup = chatMeta?.type === 'group';
  const isSeekerChat = chatMeta?.type === 'direct_seeker';
  const title = isGroup
    ? (chatMeta?.name || chatTempleName || 'Group')
    : isSeekerChat
      ? (chatMeta?.otherDisplayName || 'Seeker')
      : (chatTempleName || templeName || 'Chat');
  const subtitle = isGroup
    ? `${chatMeta?.participants?.length ?? 0} participants${chatMeta?.adminOnlyMessaging ? ' • Admin only' : ''}`
    : isSeekerChat
      ? 'Seeker'
      : 'Verified priest';
  const inputDisabled = isGroup && chatMeta?.adminOnlyMessaging && !isPriest;
  const senderLabel = (m: Message) => (m.senderType === 'priest' ? (chatTempleName || 'Priest') : 'Seeker');
  const isOwnMessage = (m: Message) =>
    (m.senderType === 'priest' && isPriest) || (m.senderUid != null && m.senderUid === currentUid);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col">
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={<PriestAvatarCoin size={40} />}
        onBack={() => navigate(-1)}
        showBook={!isGroup && !isSeekerChat}
        onBook={() => navigate('/appointments')}
        showBlock={isSeekerChat && !!otherUid && typeof otherUid === 'string'}
        isBlocked={isBlocked}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
      />

      <div className="flex-1 w-full min-w-0 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-white/60 font-mono text-sm">Loading…</p>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              text={m.text}
              isOwn={isOwnMessage(m)}
              isAutoReply={m.isAutoReply}
              timestamp={m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
              senderName={isGroup ? senderLabel(m) : undefined}
              mediaUrl={m.mediaUrl}
              mediaKind={m.mediaKind}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/40 text-red-300 text-sm font-mono">
          {sendError}
          <button type="button" onClick={() => setSendError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <ChatInputBar
        value={message}
        onChange={setMessage}
        onSend={() => handleSend()}
        placeholder={inputDisabled ? 'Only admins can send' : 'Type a message...'}
        disabled={inputDisabled}
        sending={sending}
      />
    </div>
  );
}
