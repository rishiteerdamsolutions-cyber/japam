import { motion } from 'framer-motion';

interface ChatBubbleProps {
  text: string;
  isOwn: boolean;
  timestamp?: string;
  isAutoReply?: boolean;
}

export function ChatBubble({ text, isOwn, timestamp, isAutoReply }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          shadow-[6px_6px_0_rgba(0,0,0,0.4)]
          ${isOwn ? 'bg-[#FFD700] text-black rounded-br-md' : 'bg-[#151515] text-white border border-white/10 rounded-bl-md'}
        `}
      >
        {isAutoReply && (
          <span className="inline-block mb-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
            AUTO
          </span>
        )}
        <p className="text-sm font-mono whitespace-pre-wrap break-words">{text}</p>
        {timestamp && (
          <p className={`text-[10px] mt-1 ${isOwn ? 'text-black/60' : 'text-white/50'}`}>
            {timestamp}
          </p>
        )}
      </div>
    </motion.div>
  );
}
