interface ListRowProps {
  avatar: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: string;
  unread?: boolean;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export function ListRow({
  avatar,
  title,
  subtitle,
  trailing,
  unread,
  onClick,
  onKeyDown,
  className = '',
}: ListRowProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`flex items-center gap-3 p-3 rounded-xl bg-[#151515] border border-white/10 cursor-pointer hover:border-[#FFD700]/30 transition-colors active:bg-[#1a1a1a] ${className}`}
    >
      <div className="flex-shrink-0 relative">
        {avatar}
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FFD700]" aria-hidden />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-medium text-white truncate">{title}</p>
        {subtitle != null && (
          <p className="text-white/50 text-xs font-mono truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {trailing != null && (
        <span className="flex-shrink-0 text-white/40 text-[11px] font-mono">{trailing}</span>
      )}
    </div>
  );
}
