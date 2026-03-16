import { motion } from 'framer-motion';

interface ChatBubbleProps {
  text: string;
  isOwn: boolean;
  timestamp?: string;
  isAutoReply?: boolean;
  senderName?: string;
  mediaUrl?: string | null;
  mediaKind?: string | null;
}

export function ChatBubble({ text, isOwn, timestamp, isAutoReply, senderName, mediaUrl, mediaKind }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          relative max-w-[85%] rounded-2xl px-4 py-3
          shadow-[6px_6px_0_rgba(0,0,0,0.4)]
          ${isOwn ? 'bg-[var(--primary)] text-black rounded-br-md' : 'bg-[#151515] text-white border border-white/10 rounded-bl-md'}
        `}
      >
        {/* Tail: triangle at corner */}
        <span
          className="absolute w-0 h-0"
          style={
            isOwn
              ? {
                  right: -6,
                  bottom: 10,
                  borderLeft: '6px solid var(--primary)',
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                }
              : {
                  left: -6,
                  bottom: 10,
                  borderRight: '6px solid #151515',
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                }
          }
        />
        {senderName && !isOwn && (
          <p className="text-[10px] font-mono text-white/70 mb-0.5">{senderName}</p>
        )}
        {isAutoReply && (
          <span className="inline-block mb-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40">
            AUTO
          </span>
        )}
        {mediaUrl && (mediaKind === 'image' || !mediaKind) && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block my-1 rounded-lg overflow-hidden max-w-full">
            <img src={mediaUrl} alt="" className="max-w-full max-h-64 object-contain" />
          </a>
        )}
        {text ? <p className="text-sm font-mono whitespace-pre-wrap break-words">{text}</p> : null}
        {timestamp && (
          <p className={`text-[10px] mt-1 ${isOwn ? 'text-black/60' : 'text-white/50'}`}>
            {timestamp}
          </p>
        )}
      </div>
    </motion.div>
  );
}
