/** Candy Crush–style lives display: glossy pink pill with heart and count. */
import { useTranslation } from 'react-i18next';
import { useLivesStore } from '../../store/livesStore';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useCallback } from 'react';

const MAX_LIVES = 5;

/** Glossy pink heart SVG with current count (1–5) or infinity. Never show 0 in game. */
function HeartWithNumber({ count, size = 24, infinity = false }: { count: number; size?: number; infinity?: boolean }) {
  const display = infinity ? '∞' : String(Math.min(Math.max(1, count), MAX_LIVES));
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full drop-shadow-md"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <defs>
          <linearGradient id="heartGloss" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9ebb" />
            <stop offset="40%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          <filter id="heartGlow">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="url(#heartGloss)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="0.8"
          filter="url(#heartGlow)"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-white font-bold text-shadow-md"
        style={{
          fontSize: size * 0.5,
          textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.3)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {display}
      </span>
    </div>
  );
}

interface LivesDisplayProps {
  onClick?: () => void;
  /** Compact mode for header (smaller pill) */
  compact?: boolean;
  className?: string;
  /** Marathon / Maha Yagna: show heart with ∞ (unlimited lives) */
  unlimited?: boolean;
}

export function LivesDisplay({ onClick, compact = true, className = '', unlimited = false }: LivesDisplayProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const lives = useLivesStore((s) => s.lives);
  const nextRefillAt = useLivesStore((s) => s.nextRefillAt);
  const load = useLivesStore((s) => s.load);

  const getIdToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);

  useEffect(() => {
    if (!unlimited && user?.uid) load(getIdToken);
  }, [unlimited, user?.uid, load, getIdToken]);

  if (!user?.uid) return null;

  if (unlimited) {
    return (
      <div
        role="img"
        aria-label={t('game.livesUnlimited', 'Unlimited lives')}
        className={`
          flex items-center gap-1.5 rounded-full
          bg-gradient-to-b from-pink-400/90 to-rose-600/95
          shadow-[0_2px_8px_rgba(236,72,153,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]
          border border-pink-300/40
          ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}
          ${className}
        `}
      >
        <HeartWithNumber count={5} size={compact ? 20 : 28} infinity />
        <span className="font-semibold text-rose-900/90" style={{ fontSize: compact ? '0.75rem' : '0.85rem' }}>
          ∞
        </span>
      </div>
    );
  }

  if (lives <= 0) return null;

  const isFull = lives >= MAX_LIVES;
  const refillIn = nextRefillAt ? Math.max(0, Math.ceil((nextRefillAt - Date.now()) / (60 * 60 * 1000))) : 0;
  const statusText = isFull ? t('game.livesFull', 'Full') : (refillIn > 0 ? t('game.nextLifeIn', { hours: refillIn }) : '');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('game.lives', 'Lives')}
      className={`
        flex items-center gap-1.5 rounded-full
        bg-gradient-to-b from-pink-400/90 to-rose-600/95
        shadow-[0_2px_8px_rgba(236,72,153,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]
        border border-pink-300/40
        hover:shadow-[0_3px_12px_rgba(236,72,153,0.5)]
        active:scale-[0.98]
        transition-all
        ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}
        ${className}
      `}
    >
      <HeartWithNumber count={lives} size={compact ? 20 : 28} />
      <span className="font-semibold text-rose-900/90" style={{ fontSize: compact ? '0.75rem' : '0.85rem' }}>
        {lives}/{MAX_LIVES}
      </span>
      {statusText && (
        <span
          className="font-semibold text-rose-900/90 truncate max-w-[52px] sm:max-w-[70px]"
          style={{ fontSize: compact ? '0.7rem' : '0.8rem', fontFamily: 'serif' }}
        >
          {statusText}
        </span>
      )}
    </button>
  );
}
