import { memo } from 'react';
import { getDeity } from '../../data/deities';
import type { DeityId } from '../../data/deities';

interface GemProps {
  deity: DeityId;
  row: number;
  col: number;
  selected: boolean;
  sparkle?: boolean;
  onClick: () => void;
}

export const Gem = memo(function Gem({ deity, selected, onClick, sparkle }: GemProps) {
  const d = getDeity(deity);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full aspect-square rounded-lg flex items-center justify-center
        overflow-hidden relative
        shadow-inner transition-transform duration-150 touch-none
        min-w-[44px] min-h-[44px]
        ${selected ? 'ring-2 ring-white ring-offset-1 scale-105' : 'active:scale-95'}
        ${sparkle ? 'animate-sparkle' : ''}
      `}
      style={{
        backgroundColor: d.color,
        boxShadow: selected ? `0 0 12px ${d.color}` : sparkle ? `0 0 16px ${d.color}, inset 0 0 8px rgba(255,255,255,0.4)` : `inset 0 2px 4px rgba(0,0,0,0.2)`
      }}
    >
      <img
        src={d.image}
        alt={d.name}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
      />
    </button>
  );
});
