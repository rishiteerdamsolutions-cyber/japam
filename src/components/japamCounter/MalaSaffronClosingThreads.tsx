import { useId, useMemo } from 'react';
import type { MalaPoint } from './malaDepthLayout';

const FRINGE_STRANDS = 14;
const TASSEL_SCALE = 0.34;

type Props = {
  anchor: MalaPoint;
  beadSizePx: number;
  width: number;
  height: number;
};

type TasselModel = {
  attachX: number;
  attachY: number;
  headCx: number;
  headCy: number;
  headRx: number;
  headRy: number;
  fringeStrands: { x1: number; y1: number; x2: number; y2: number; w: number; o: number }[];
  clipX: number;
  clipY: number;
  clipW: number;
  clipH: number;
};

/** Right-side equator: thread pole through center; tassel on east perimeter. */
function beadRightEquatorAttach(anchor: MalaPoint, beadSizePx: number) {
  return {
    x: anchor.x + beadSizePx / 2,
    y: anchor.y,
  };
}

function buildTasselModel(anchor: MalaPoint, beadSizePx: number, width: number, height: number): TasselModel {
  const s = beadSizePx * TASSEL_SCALE;
  const { x: attachX, y: attachY } = beadRightEquatorAttach(anchor, beadSizePx);

  const headRy = s * 0.4;
  const headRx = s * 0.48;
  const headCx = attachX + headRx * 0.75;
  const headCy = attachY;
  const fringeStartX = headCx + headRx * 0.85;
  const fringeLen = Math.min(s * 1.15, beadSizePx * 0.55);
  const fringeEndX = fringeStartX + fringeLen;
  const fringeHalfW = s * 0.42;

  const fringeStrands: TasselModel['fringeStrands'] = [];
  for (let i = 0; i < FRINGE_STRANDS; i++) {
    const t = FRINGE_STRANDS === 1 ? 0 : i / (FRINGE_STRANDS - 1) - 0.5;
    const spread = Math.abs(t);
    const x1 = fringeStartX;
    const x2 = fringeEndX + spread * s * 0.04;
    const y1 = attachY + t * fringeHalfW * 0.32;
    const y2 = attachY + t * fringeHalfW;
    fringeStrands.push({
      x1,
      y1,
      x2,
      y2,
      w: 0.55 + (1 - spread) * 0.3,
      o: 0.88,
    });
  }

  const rowTop = anchor.y - beadSizePx / 2;
  const rowBottom = anchor.y + beadSizePx / 2;
  const clipX = Math.max(0, attachX - 1);
  const clipY = Math.max(0, rowTop - 1);
  const clipW = Math.min(width - clipX, fringeEndX - clipX + 3);
  const clipH = Math.min(height - clipY, rowBottom - clipY + 2);

  return {
    attachX,
    attachY,
    headCx,
    headCy,
    headRx,
    headRy,
    fringeStrands,
    clipX,
    clipY,
    clipW: Math.max(1, clipW),
    clipH: Math.max(1, clipH),
  };
}

/** Small saffron tassel on bead right equator — 105→4th … 108→1st. */
export function MalaSaffronClosingThreads({ anchor, beadSizePx, width, height }: Props) {
  const uid = useId().replace(/:/g, '');
  const silkId = `mala-tassel-silk-${uid}`;
  const headId = `mala-tassel-head-${uid}`;
  const clipId = `mala-tassel-clip-${uid}`;

  const model = useMemo(
    () => buildTasselModel(anchor, beadSizePx, width, height),
    [anchor, beadSizePx, width, height],
  );

  return (
    <svg
      className="absolute left-0 top-0 z-[6] pointer-events-none overflow-hidden"
      width={width}
      height={height}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={model.clipX} y={model.clipY} width={model.clipW} height={model.clipH} />
        </clipPath>
        <linearGradient id={silkId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4a1804" />
          <stop offset="45%" stopColor="#9a4208" />
          <stop offset="100%" stopColor="#e0a838" />
        </linearGradient>
        <radialGradient id={headId} cx="35%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f0c060" />
          <stop offset="55%" stopColor="#c06810" />
          <stop offset="100%" stopColor="#5a1e04" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {model.fringeStrands.map((strand, i) => (
          <line
            key={i}
            x1={strand.x1}
            y1={strand.y1}
            x2={strand.x2}
            y2={strand.y2}
            stroke={`url(#${silkId})`}
            strokeWidth={strand.w}
            strokeLinecap="round"
            opacity={strand.o}
          />
        ))}
        <ellipse
          cx={model.headCx}
          cy={model.headCy}
          rx={model.headRx}
          ry={model.headRy}
          fill={`url(#${headId})`}
        />
      </g>
    </svg>
  );
}
