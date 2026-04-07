import { memo, useEffect, useRef, useState } from 'react';
import { getDeity } from '../../data/deities';
import type { GemType } from '../../engine/types';
import { displayDeityId, isBlessing, isWrapped } from '../../engine/gemKinds';
import { BOMB_OVERLAY_ICON } from '../../data/offeringPowers';

interface GemProps {
  gem: GemType;
  row: number;
  col: number;
  /** Left half of board: border shimmer rotates CCW; right half: CW. */
  borderSpin: 'left' | 'right';
  /** When false, rim gradient stays static (user or reduced-motion). */
  borderSpinActive: boolean;
  selected: boolean;
  sparkle?: boolean;
  matched?: boolean;
  /** Stagger for candy-style match clear (ms). */
  matchStaggerDelayMs?: number;
  /** Anniversary couple mode: shorter match-magic (see `.gem-match--couple`). */
  coupleSnappyMatch?: boolean;
  /** New gem dropped into an empty cell (gravity refill). */
  falling?: boolean;
  onFallAnimationEnd?: () => void;
  onClick: () => void;
}

export const Gem = memo(function Gem({
  gem,
  selected,
  onClick,
  sparkle,
  matched,
  matchStaggerDelayMs = 0,
  coupleSnappyMatch,
  falling,
  onFallAnimationEnd,
  borderSpin,
  borderSpinActive,
}: GemProps) {
  const TAP_TOOLTIP_MS = 1200;
  const blessing = isBlessing(gem);
  const wrapped = isWrapped(gem);

  const deityId = displayDeityId(gem);
  const d = deityId != null ? getDeity(deityId) : null;

  const tileSrc = d ? (d.imageGame ?? d.image) : '';
  const useFaceTile = Boolean(d?.imageGame);
  const gameImgCentered = d?.imageGameObjectPosition === 'center';
  const spinClass = borderSpin === 'left' ? 'gem-candy-frame--spin-left' : '';
  const pausedClass = !borderSpinActive ? 'gem-candy-frame--spin-paused' : '';

  const accent = d?.color ?? '#fbbf24';
  const deityName = d?.name ?? 'Blessing';
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipHideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipHideTimerRef.current != null) {
        window.clearTimeout(tooltipHideTimerRef.current);
        tooltipHideTimerRef.current = null;
      }
    };
  }, []);

  const clearTooltipHideTimer = () => {
    if (tooltipHideTimerRef.current != null) {
      window.clearTimeout(tooltipHideTimerRef.current);
      tooltipHideTimerRef.current = null;
    }
  };

  const showTooltipBriefly = () => {
    setTooltipOpen(true);
    clearTooltipHideTimer();
    tooltipHideTimerRef.current = window.setTimeout(() => {
      setTooltipOpen(false);
      tooltipHideTimerRef.current = null;
    }, TAP_TOOLTIP_MS);
  };

  return (
    <div
      className={`
        gem-candy-frame w-full aspect-square touch-none transition-transform duration-150
        ${blessing ? 'gem-candy-frame--blessing' : ''}
        ${falling ? 'gem-fall isolate' : ''}
        ${selected ? `ring-[3px] ring-amber-100 ring-offset-2 ring-offset-black/30 scale-105 z-[2] ${blessing ? 'rounded-full' : 'rounded-[0.85rem]'}` : ''}
        ${matched ? '' : 'active:scale-[0.97]'}
      `}
      onAnimationEnd={(e) => {
        if (!falling || !onFallAnimationEnd) return;
        if (!e.animationName.includes('gem-fall')) return;
        onFallAnimationEnd();
      }}
    >
      <div className={`gem-candy-frame__clip ${spinClass} ${pausedClass} ${matched ? 'gem-candy-frame__clip--matched' : ''}`}>
        <div className={`gem-candy-frame__glow ${matched ? 'gem-candy-frame__glow--matched' : ''}`} aria-hidden />
        <button
        type="button"
        aria-label={deityName}
        title={deityName}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => {
          clearTooltipHideTimer();
          setTooltipOpen(false);
        }}
        onClick={() => {
          showTooltipBriefly();
          onClick();
        }}
        className={`
          relative z-[1] w-full h-full min-h-0 aspect-square flex items-center justify-center
          overflow-hidden shadow-inner touch-none
          ${blessing ? 'rounded-full' : 'rounded-[0.65rem]'}
          ${sparkle ? 'animate-sparkle' : ''}
          ${matched ? `gem-match gem-match-highlight pointer-events-none${coupleSnappyMatch ? ' gem-match--couple' : ''}` : ''}
        `}
        style={{
          ...(blessing
            ? {
                background:
                  'radial-gradient(circle at 50% 45%, #fde68a 0%, #a78bfa 38%, #4c1d95 92%)',
              }
            : { backgroundColor: accent }),
          border: blessing
            ? '3px solid rgba(251, 191, 36, 0.85)'
            : `3px solid color-mix(in srgb, ${accent} 55%, #0a0a0a)`,
          animationDelay: matched && matchStaggerDelayMs > 0 ? `${matchStaggerDelayMs}ms` : undefined,
          boxShadow: matched
            ? `0 0 16px ${accent}, 0 0 24px rgba(255,255,255,0.8), inset 0 0 8px rgba(255,255,255,0.5)`
            : selected
              ? `0 0 12px ${accent}, inset 0 0 0 1px rgba(255,255,255,0.28)`
              : sparkle
                ? `0 0 16px ${accent}, inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 0 8px rgba(255,255,255,0.2)`
                : wrapped
                  ? `inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 0 2px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35), inset 0 2px 5px rgba(0,0,0,0.25), 0 0 14px ${accent}`
                  : blessing
                    ? `0 0 10px rgba(251, 191, 36, 0.45), inset 0 0 0 1px rgba(0,0,0,0.35)`
                    : `inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 0 2px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35), inset 0 2px 5px rgba(0,0,0,0.25)`,
        }}
      >
        {tooltipOpen && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-[6] mb-1 w-max max-w-[7.25rem] -translate-x-1/2 rounded-md border border-amber-400/60 bg-black/90 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-amber-100 shadow-[0_6px_16px_rgba(0,0,0,0.45)] sm:text-xs"
          >
            {deityName}
          </span>
        )}
        {!blessing && d && (
        <img
          src={tileSrc}
          alt=""
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover rounded-[0.5rem] pointer-events-none ${
            !useFaceTile ? 'object-center' : gameImgCentered ? 'object-center' : 'object-[center_28%]'
          }`}
          style={{
            transform: useFaceTile ? (gameImgCentered ? 'scale(1.05)' : 'scale(1.12)') : 'scale(1.25)',
          }}
        />
        )}
        {blessing && (
          <span className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center overflow-hidden rounded-full">
            <img
              src={BOMB_OVERLAY_ICON}
              alt=""
              draggable={false}
              className="h-[200%] w-[200%] max-w-none shrink-0 object-contain object-center [image-rendering:auto] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
            />
          </span>
        )}
        {wrapped && (
          <div
            className="absolute inset-[8%] rounded-[0.5rem] border-2 border-amber-100/45 pointer-events-none z-[2] shadow-[inset_0_0_10px_rgba(251,191,36,0.12)]"
            aria-hidden
          />
        )}
      </button>
      </div>
    </div>
  );
});
