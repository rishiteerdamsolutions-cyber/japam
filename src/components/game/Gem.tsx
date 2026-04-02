import { memo } from 'react';
import { getDeity } from '../../data/deities';
import type { DeityId } from '../../data/deities';

interface GemProps {
  deity: DeityId;
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
  /** New gem dropped into an empty cell (gravity refill). */
  falling?: boolean;
  onFallAnimationEnd?: () => void;
  onClick: () => void;
}

export const Gem = memo(function Gem({
  deity,
  selected,
  onClick,
  sparkle,
  matched,
  matchStaggerDelayMs = 0,
  falling,
  onFallAnimationEnd,
  borderSpin,
  borderSpinActive,
}: GemProps) {
  const d = getDeity(deity);
  const tileSrc = d.imageGame ?? d.image;
  const useFaceTile = Boolean(d.imageGame);
  const gameImgCentered = d.imageGameObjectPosition === 'center';
  const spinClass = borderSpin === 'left' ? 'gem-candy-frame--spin-left' : '';
  const pausedClass = !borderSpinActive ? 'gem-candy-frame--spin-paused' : '';

  return (
    <div
      className={`
        gem-candy-frame w-full aspect-square touch-none transition-transform duration-150
        ${falling ? 'gem-fall' : ''}
        ${selected ? 'ring-[3px] ring-amber-100 ring-offset-2 ring-offset-black/30 rounded-[0.85rem] scale-105 z-[2]' : ''}
        ${matched ? '' : 'active:scale-[0.97]'}
      `}
      onAnimationEnd={(e) => {
        if (!falling || !onFallAnimationEnd) return;
        if (!e.animationName.includes('gem-fall')) return;
        onFallAnimationEnd();
      }}
    >
      <div className={`gem-candy-frame__clip ${spinClass} ${pausedClass}`}>
        <div className="gem-candy-frame__glow" aria-hidden />
        <button
        type="button"
        onClick={onClick}
        className={`
          relative z-[1] w-full h-full min-h-0 aspect-square rounded-[0.65rem] flex items-center justify-center
          overflow-hidden shadow-inner touch-none
          ${sparkle ? 'animate-sparkle' : ''}
          ${matched ? 'gem-match gem-match-highlight pointer-events-none' : ''}
        `}
        style={{
          backgroundColor: d.color,
          border: `3px solid color-mix(in srgb, ${d.color} 55%, #0a0a0a)`,
          animationDelay: matched && matchStaggerDelayMs > 0 ? `${matchStaggerDelayMs}ms` : undefined,
          boxShadow: matched
            ? `0 0 16px ${d.color}, 0 0 24px rgba(255,255,255,0.8), inset 0 0 8px rgba(255,255,255,0.5)`
            : selected
              ? `0 0 12px ${d.color}, inset 0 0 0 1px rgba(255,255,255,0.35)`
              : sparkle
                ? `0 0 16px ${d.color}, inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 0 8px rgba(255,255,255,0.25)`
                : `inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 0 2px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35), inset 0 2px 5px rgba(0,0,0,0.25)`,
        }}
      >
        <img
          src={tileSrc}
          alt={d.name}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover rounded-[0.5rem] pointer-events-none ${
            !useFaceTile ? 'object-center' : gameImgCentered ? 'object-center' : 'object-[center_28%]'
          }`}
          style={{
            transform: useFaceTile ? (gameImgCentered ? 'scale(1.05)' : 'scale(1.12)') : 'scale(1.25)',
          }}
        />
      </button>
      </div>
    </div>
  );
});
