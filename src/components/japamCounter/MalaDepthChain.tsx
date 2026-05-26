import type { DepthBeadSlot } from './malaDepthLayout';

/** Decorative off-screen string — cheap CSS only (no 3D globe, no roll). */
function DepthBead({ slot }: { slot: DepthBeadSlot }) {
  const { x, y, sizePx, dimmed, zIndex } = slot;
  const dim = Math.min(1, dimmed * 0.12);
  const highlight = `rgb(${Math.round(122 - dim * 28)}, ${Math.round(79 - dim * 18)}, ${Math.round(44 - dim * 10)})`;
  const mid = `rgb(${Math.round(61 - dim * 12)}, ${Math.round(34 - dim * 8)}, ${Math.round(16 - dim * 4)})`;
  const shadow = `rgb(${Math.round(26 - dim * 6)}, ${Math.round(14 - dim * 4)}, ${Math.round(6 - dim * 2)})`;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x - sizePx / 2,
        top: y - sizePx / 2,
        width: sizePx,
        height: sizePx,
        zIndex,
        lineHeight: 0,
      }}
      aria-hidden
    >
      <div
        className="h-full w-full rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${highlight} 0%, ${mid} 78%, ${shadow} 100%)`,
        }}
      />
    </div>
  );
}

type Props = {
  chain: DepthBeadSlot[];
};

export function MalaDepthChain({ chain }: Props) {
  return (
    <div className="absolute inset-0 z-[1] overflow-visible pointer-events-none" aria-hidden>
      {chain.map((slot) => (
        <DepthBead key={slot.index} slot={slot} />
      ))}
    </div>
  );
}
