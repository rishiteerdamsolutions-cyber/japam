interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  onAttachmentClick?: () => void;
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled,
  sending,
  onAttachmentClick,
}: ChatInputBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className="sticky bottom-0 p-3 bg-black/95 backdrop-blur border-t border-white/10 flex items-end gap-2"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onAttachmentClick}
        disabled={disabled}
        className="flex-shrink-0 p-2.5 rounded-xl bg-[#151515] text-white/60 hover:text-white border border-white/20 disabled:opacity-50"
        aria-label="Attachment"
      >
        <span className="text-lg">📎</span>
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-xl bg-[#151515] text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[#FFD700]/50"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!value.trim() || disabled || sending}
        className="flex-shrink-0 p-2.5 rounded-xl bg-[#FFD700] text-black border-b-4 border-[#B8860B] shadow-[4px_4px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
        aria-label="Send"
      >
        <span className="text-lg">➤</span>
      </button>
    </div>
  );
}
