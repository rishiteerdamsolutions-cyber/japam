import type { CSSProperties, ReactNode } from 'react';
import { MalaBeadGlobe } from './MalaBeadGlobe';
import { BEAD_SIZE_PX, MALA_REAR_BEAD_GLOBE_PX, MALA_SATELLITE_GLOBE_PX } from './malaBeadSizes';

type Props = {
  /** Matches main bead roll so the string moves together visually. */
  spinX: number;
  mainBead: ReactNode;
};

const MAIN = BEAD_SIZE_PX;
const SECOND = MALA_SATELLITE_GLOBE_PX;
const THIRD = MALA_REAR_BEAD_GLOBE_PX;

/** How far the third globe tucks under the second (rest peeks on the string). */
const THIRD_TUCK_UNDER_SECOND_PX = Math.round(THIRD * 0.5);

const PEEK_LEFT_PX = -Math.round(SECOND * 0.22);
const PEEK_EDGE_PX = -Math.round(SECOND * 0.14);

const PAIR_STACK_H = SECOND + THIRD - THIRD_TUCK_UNDER_SECOND_PX;

function BeadGlobe({
  spinX,
  sizePx,
  dimmed = false,
}: {
  spinX: number;
  sizePx: number;
  dimmed?: boolean;
}) {
  return (
    <div
      className="pointer-events-none leading-none"
      style={{
        width: sizePx,
        height: sizePx,
        lineHeight: 0,
        opacity: dimmed ? 0.82 : 0.95,
        filter: dimmed ? 'brightness(0.85) saturate(0.9)' : undefined,
      }}
      aria-hidden
    >
      <MalaBeadGlobe spinX={spinX} sizePx={sizePx} />
    </div>
  );
}

/** Second + third on the string above main (second still touches main). */
function UpperBeadPair({ spinX }: { spinX: number }) {
  const thirdStyle: CSSProperties = {
    left: PEEK_LEFT_PX,
    bottom: SECOND - THIRD_TUCK_UNDER_SECOND_PX + PEEK_EDGE_PX,
  };

  return (
    <div
      className="relative shrink-0 overflow-visible"
      style={{ width: SECOND, height: PAIR_STACK_H, lineHeight: 0 }}
      aria-hidden
    >
      <div className="absolute z-[1]" style={thirdStyle}>
        <BeadGlobe spinX={spinX} sizePx={THIRD} dimmed />
      </div>
      <div
        className="absolute z-[2] left-0"
        style={{ width: SECOND, height: SECOND, bottom: 0 }}
      >
        <BeadGlobe spinX={spinX} sizePx={SECOND} />
      </div>
    </div>
  );
}

/** Second + third on the string below main. */
function LowerBeadPair({ spinX }: { spinX: number }) {
  const thirdStyle: CSSProperties = {
    left: PEEK_LEFT_PX,
    top: SECOND - THIRD_TUCK_UNDER_SECOND_PX + PEEK_EDGE_PX,
  };

  return (
    <div
      className="relative shrink-0 overflow-visible"
      style={{ width: SECOND, height: PAIR_STACK_H, lineHeight: 0 }}
      aria-hidden
    >
      <div className="absolute z-[2] left-0 top-0" style={{ width: SECOND, height: SECOND }}>
        <BeadGlobe spinX={spinX} sizePx={SECOND} />
      </div>
      <div className="absolute z-[1]" style={thirdStyle}>
        <BeadGlobe spinX={spinX} sizePx={THIRD} dimmed />
      </div>
    </div>
  );
}

/** Main + second + third (display) above and below. */
export function MalaBeadStringVisual({ spinX, mainBead }: Props) {
  return (
    <div className="relative flex flex-col items-center pointer-events-none select-none overflow-visible leading-none">
      <div
        className="absolute left-1/2 top-0 bottom-0 z-0 w-[2px] -translate-x-1/2 rounded-full"
        style={{
          background:
            'linear-gradient(180deg, rgba(36,20,10,0.45) 0%, rgba(110,72,38,0.88) 48%, rgba(36,20,10,0.45) 100%)',
          boxShadow: '0 0 1px rgba(0,0,0,0.35)',
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-col items-center gap-0 overflow-visible">
        <UpperBeadPair spinX={spinX} />
        <div
          className="pointer-events-auto relative z-[3] shrink-0 leading-none"
          style={{ width: MAIN, height: MAIN, lineHeight: 0 }}
        >
          {mainBead}
        </div>
        <LowerBeadPair spinX={spinX} />
      </div>
    </div>
  );
}
