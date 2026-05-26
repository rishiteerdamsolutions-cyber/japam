import type { DepthBeadSlot } from './malaDepthLayout';

/** Decorative off-screen string — cheap CSS only (no 3D globe, no roll). */
function DepthBead({ slot }: { slot: DepthBeadSlot }) {
  const { x, y, sizePx, dimmed, zIndex } = slot;
  const opacity = Math.max(0.5, 0.95 - dimmed * 0.1);

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
          opacity,
          background: 'radial-gradient(circle at 38% 32%, #7a4f2c 0%, #3d2210 78%, #1a0e06 100%)',
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
