import { useId, type ReactNode } from 'react';
import { MalaBeadGlobe } from './MalaBeadGlobe';
import {
  BEAD_SIZE_PX,
  MALA_BEAD_TIER_SPIN_STEP_DEG,
  MALA_FIFTH_BEAD_GLOBE_PX,
  MALA_FOURTH_BEAD_GLOBE_PX,
  MALA_REAR_BEAD_GLOBE_PX,
  MALA_SATELLITE_GLOBE_PX,
} from './malaBeadSizes';

type Props = {
  spinX: number;
  mainBead: ReactNode;
};

export type CoreStackRow = {
  sizePx: number;
  leftNudge: number;
  dimmed: number;
  isMain?: boolean;
  /** Added to main-bead spin so stacked beads show different faces. */
  spinOffsetDeg?: number;
};

const MAIN = BEAD_SIZE_PX;
const FIRST = MALA_SATELLITE_GLOBE_PX;
const SECOND = MALA_REAR_BEAD_GLOBE_PX;
const THIRD = MALA_FOURTH_BEAD_GLOBE_PX;
const FOURTH = MALA_FIFTH_BEAD_GLOBE_PX;

function leftNudgePx(beadPx: number, layer: 1 | 2 | 3): number {
  const step = Math.round(beadPx * 0.22);
  return -step * layer;
}

function tierSpin(tier: 1 | 2 | 3 | 4): number {
  return tier * MALA_BEAD_TIER_SPIN_STEP_DEG;
}

export function buildFixedCoreRows(): CoreStackRow[] {
  return [
    { sizePx: FOURTH, leftNudge: leftNudgePx(FOURTH, 3), dimmed: 4, spinOffsetDeg: tierSpin(4) },
    { sizePx: THIRD, leftNudge: leftNudgePx(THIRD, 2), dimmed: 3, spinOffsetDeg: tierSpin(3) },
    { sizePx: SECOND, leftNudge: leftNudgePx(SECOND, 1), dimmed: 2, spinOffsetDeg: tierSpin(2) },
    { sizePx: FIRST, leftNudge: 0, dimmed: 0, spinOffsetDeg: tierSpin(1) },
    { sizePx: MAIN, leftNudge: 0, dimmed: 0, isMain: true, spinOffsetDeg: 0 },
    { sizePx: FIRST, leftNudge: 0, dimmed: 0, spinOffsetDeg: tierSpin(1) },
    { sizePx: SECOND, leftNudge: leftNudgePx(SECOND, 1), dimmed: 2, spinOffsetDeg: tierSpin(2) },
    { sizePx: THIRD, leftNudge: leftNudgePx(THIRD, 2), dimmed: 3, spinOffsetDeg: tierSpin(3) },
    { sizePx: FOURTH, leftNudge: leftNudgePx(FOURTH, 3), dimmed: 4, spinOffsetDeg: tierSpin(4) },
  ];
}

export function fixedCoreCenterPoints(rows: CoreStackRow[], startY: number): { x: number; y: number }[] {
  let y = startY;
  return rows.map((row) => {
    const point = { x: MAIN / 2 + row.leftNudge, y: y + row.sizePx / 2 };
    y += row.sizePx;
    return point;
  });
}

export function fixedCoreHeightPx(rows: CoreStackRow[]): number {
  return rows.reduce((sum, row) => sum + row.sizePx, 0);
}

function BeadGlobe({
  spinX,
  spinOffsetDeg = 0,
  sizePx,
  dimmed = 0,
}: {
  spinX: number;
  spinOffsetDeg?: number;
  sizePx: number;
  dimmed?: number;
}) {
  const opacity = dimmed === 0 ? 0.95 : Math.max(0.6, 0.95 - dimmed * 0.09);
  const brightness = dimmed === 0 ? 1 : Math.max(0.75, 1 - dimmed * 0.055);

  return (
    <div
      className="pointer-events-none relative leading-none"
      style={{
        width: sizePx,
        height: sizePx,
        lineHeight: 0,
        opacity,
        filter: dimmed > 0 ? `brightness(${brightness}) saturate(0.92)` : undefined,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          zIndex: 0,
          background: 'radial-gradient(circle at 38% 32%, #2a1608 0%, #120a04 72%, #080402 100%)',
        }}
      />
      <div className="relative z-[1]">
        <MalaBeadGlobe spinX={spinX + spinOffsetDeg} sizePx={sizePx} />
      </div>
    </div>
  );
}

function ThreadRow({ spinX, row }: { spinX: number; row: CoreStackRow }) {
  return (
    <div
      className="relative z-[1] shrink-0 overflow-visible"
      style={{ width: MAIN, height: row.sizePx, lineHeight: 0 }}
      aria-hidden
    >
      <div
        className="absolute top-0 z-[2]"
        style={{
          left: MAIN / 2 - row.sizePx / 2 + row.leftNudge,
          width: row.sizePx,
          height: row.sizePx,
          lineHeight: 0,
        }}
      >
        <BeadGlobe
          spinX={spinX}
          spinOffsetDeg={row.spinOffsetDeg ?? 0}
          sizePx={row.sizePx}
          dimmed={row.dimmed}
        />
      </div>
    </div>
  );
}

/** Main + 4 beads per side — do not change layout/sizes/offsets here. */
export function FixedMalaCore({ spinX, mainBead }: Props) {
  const rows = buildFixedCoreRows();

  return (
    <div className="relative z-[2] flex flex-col items-center gap-0 overflow-visible shrink-0">
      {rows.map((row, i) =>
        row.isMain ? (
          <div
            key="main"
            className="pointer-events-auto relative z-[3] shrink-0 leading-none overflow-hidden"
            style={{ width: MAIN, height: MAIN, lineHeight: 0 }}
          >
            {mainBead}
          </div>
        ) : (
          <ThreadRow key={i} spinX={spinX} row={row} />
        ),
      )}
    </div>
  );
}

export function MalaThreadPath({
  segments,
  width,
  height,
  gradientId,
  glowFilterId,
}: {
  segments: [{ x: number; y: number }, { x: number; y: number }][];
  width: number;
  height: number;
  gradientId: string;
  glowFilterId: string;
}) {
  if (segments.length === 0) return null;

  const d = segments
    .map(([from, to]) => `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} L ${to.x.toFixed(2)} ${to.y.toFixed(2)}`)
    .join(' ');

  return (
    <svg
      className="absolute left-0 top-0 z-0 pointer-events-none overflow-visible"
      width={width}
      height={height}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5a12" />
          <stop offset="35%" stopColor="#f0c84a" />
          <stop offset="65%" stopColor="#ffe9a8" />
          <stop offset="100%" stopColor="#9a6818" />
        </linearGradient>
        <filter id={glowFilterId} x="-40%" y="-10%" width="180%" height="120%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        opacity={0.95}
      />
    </svg>
  );
}

export function useMalaThreadSvgIds(): { gradientId: string; glowFilterId: string } {
  const raw = useId().replace(/:/g, '');
  return {
    gradientId: `mala-thread-gold-${raw}`,
    glowFilterId: `mala-thread-glow-${raw}`,
  };
}

/** @deprecated */
export function useMalaThreadGradientId(): string {
  return useMalaThreadSvgIds().gradientId;
}
