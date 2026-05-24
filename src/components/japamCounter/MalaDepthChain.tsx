import { MalaBeadGlobe } from './MalaBeadGlobe';
import type { DepthBeadSlot } from './malaDepthLayout';
import { MALA_GLOBE_MIN_RENDER_PX } from './malaStringLayout';

function DepthBead({
  spinX,
  slot,
}: {
  spinX: number;
  slot: DepthBeadSlot;
}) {
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
      {sizePx < MALA_GLOBE_MIN_RENDER_PX ? (
        <div
          className="h-full w-full rounded-full"
          style={{
            opacity,
            background: 'radial-gradient(circle at 32% 28%, #7a4f2c 0%, #3d2210 55%, #1a0e06 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}
        />
      ) : (
        <div
          className="leading-none"
          style={{
            opacity,
            filter: `brightness(${Math.max(0.72, 1 - dimmed * 0.06)}) saturate(0.9)`,
          }}
        >
          <MalaBeadGlobe spinX={spinX} sizePx={sizePx} />
        </div>
      )}
    </div>
  );
}

type Props = {
  spinX: number;
  chain: DepthBeadSlot[];
};

export function MalaDepthChain({ spinX, chain }: Props) {
  return (
    <div className="absolute inset-0 z-[1] overflow-visible pointer-events-none" aria-hidden>
      {chain.map((slot) => (
        <DepthBead key={slot.index} spinX={spinX} slot={slot} />
      ))}
    </div>
  );
}
