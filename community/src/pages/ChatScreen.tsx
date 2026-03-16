import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatBubble } from '../components/ChatBubble';
import { ChatHeader } from '../components/ChatHeader';
import { ChatInputBar } from '../components/ChatInputBar';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchMessages, sendMessage, fetchChat } from '../lib/apavargaApi';
import { uploadApavargaMedia } from '../lib/firebase';
import { usePriestStore } from '../store/priestStore';

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
  const { templeName } = usePriestStore((s) => ({ templeName: s.templeName }));
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatTempleName, setChatTempleName] = useState(templeName || '');
  const [chatMeta, setChatMeta] = useState<{ type?: string; name?: string; otherDisplayName?: string; participants?: string[]; adminOnlyMessaging?: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (mediaUrl?: string, mediaKind?: string) => {
    if (!id || sending) return;
    const textToSend = message.trim() || (mediaUrl ? ' ' : '');
    if (!textToSend && !mediaUrl) return;
    setSending(true);
    try {
      await sendMessage(id, textToSend, mediaUrl, mediaKind);
      setMessage('');
      const msgs = await fetchMessages(id);
      setMessages(msgs);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    if (!file.type.startsWith('image/')) return;
    setSending(true);
    try {
      const url = await uploadApavargaMedia(file, 'chat');
      await sendMessage(id, ' ', url, 'image');
      setMessage('');
      const msgs = await fetchMessages(id);
      setMessages(msgs);
    } catch {
      // ignore
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

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelect}
      />
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={<PriestAvatarCoin size={40} />}
        onBack={() => navigate(-1)}
        showBook={!isGroup && !isSeekerChat}
        onBook={() => navigate('/appointments')}
      />

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
              senderName={isGroup ? senderLabel(m) : undefined}
              mediaUrl={m.mediaUrl}
              mediaKind={m.mediaKind}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInputBar
        value={message}
        onChange={setMessage}
        onSend={() => handleSend()}
        placeholder={inputDisabled ? 'Only admins can send' : 'Type a message...'}
        disabled={inputDisabled}
        sending={sending}
        onAttachmentClick={handleAttachment}
      />
    </div>
  );
}
