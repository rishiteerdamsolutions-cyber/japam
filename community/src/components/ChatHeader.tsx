import { useState } from 'react';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatar: React.ReactNode;
  onBack: () => void;
  showBook?: boolean;
  onBook?: () => void;
  /** For direct_seeker: show Block/Unblock */
  showBlock?: boolean;
  isBlocked?: boolean;
  onBlock?: () => void;
  onUnblock?: () => void;
}

export function ChatHeader({ title, subtitle, avatar, onBack, showBook, onBook, showBlock, isBlocked, onBlock, onUnblock }: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-white/10 px-3 py-2 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="p-2 -ml-1 text-white/80 hover:text-white rounded-lg"
        aria-label="Back"
      >
        <span className="text-xl">←</span>
      </button>
      <div className="flex-shrink-0">{avatar}</div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-medium text-white truncate">{title}</p>
        {subtitle != null && (
          <p className="text-[var(--primary)] text-[10px] font-mono truncate">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        className="p-2 text-white/60 hover:text-white rounded-lg"
        aria-label="Call"
      >
        <span className="text-lg">📞</span>
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 text-white/60 hover:text-white rounded-lg"
          aria-label="Menu"
        >
          <span className="text-lg">⋮</span>
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
            <ul
              className="absolute right-0 top-full mt-1 py-2 min-w-[180px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20"
              role="menu"
            >
              {showBlock && (isBlocked ? onUnblock : onBlock) && (
                <li>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 ${isBlocked ? 'text-amber-400' : 'text-red-400'}`}
                    onClick={() => {
                      setMenuOpen(false);
                      if (isBlocked) onUnblock?.();
                      else onBlock?.();
                    }}
                  >
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                  onClick={() => { setMenuOpen(false); /* View contact - could navigate to temple/contact */ }}
                >
                  View contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Search in chat
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Media
                </button>
              </li>
              {showBook && onBook && (
                <li className="border-t border-white/10">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm text-[var(--primary)] hover:bg-white/10"
                    onClick={() => { setMenuOpen(false); onBook(); }}
                  >
                    Book appointment
                  </button>
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </header>
  );
}
