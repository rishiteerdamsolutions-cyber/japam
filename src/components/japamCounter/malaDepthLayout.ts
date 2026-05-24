import { BEAD_SIZE_PX, MALA_FIFTH_BEAD_GLOBE_PX } from './malaBeadSizes';
import type { CoreStackRow } from './FixedMalaCore';

export const MALA_BEADS_PER_SIDE = 54;
export const MALA_DEPTH_START_INDEX = 5;
export const MALA_MIN_DEPTH_BEAD_PX = 8;

const MAIN = BEAD_SIZE_PX;
const FOURTH = MALA_FIFTH_BEAD_GLOBE_PX;

const PEEK_LEFT_RATIO = 0.28;
const PEEK_EDGE_RATIO = 0.14;
const PEEK_LEFT_GAP_RATIO = 0.12;
const PEEK_EDGE_GAP_RATIO = 0.08;

/** Extra left drift so far beads exit the screen (depth). */
const EXIT_LEFT_PX = 150;

export type MalaPoint = { x: number; y: number };

export type DepthBeadSlot = {
  index: number;
  x: number;
  y: number;
  sizePx: number;
  zIndex: number;
  dimmed: number;
};

export function fourthBeadCenter(rows: CoreStackRow[], arm: 'upper' | 'lower'): MalaPoint {
  let y = 0;
  const idx = arm === 'upper' ? 0 : rows.length - 1;
  for (let i = 0; i < idx; i++) y += rows[i]!.sizePx;
  const row = rows[idx]!;
  return { x: MAIN / 2 + row.leftNudge, y: y + row.sizePx / 2 };
}

/** Upper fixed core bead: tier 1 = first (near main) … 4 = fourth (top). */
export function upperCoreBeadByTier(
  rows: CoreStackRow[],
  tier: 1 | 2 | 3 | 4,
): { center: MalaPoint; sizePx: number } {
  const rowIndex = 4 - tier;
  let y = 0;
  for (let i = 0; i < rowIndex; i++) y += rows[i]!.sizePx;
  const row = rows[rowIndex]!;
  return {
    center: { x: MAIN / 2 + row.leftNudge, y: y + row.sizePx / 2 },
    sizePx: row.sizePx,
  };
}

/** Saffron closing threads: 105→4th, 106→3rd, 107→2nd, 108→1st; hidden below 105. */
export function saffronClosingTierFromCount(count: number): 1 | 2 | 3 | 4 | null {
  if (count < 105) return null;
  const tier = 108 - count + 1;
  if (tier < 1) return 1;
  if (tier > 4) return 4;
  return tier as 1 | 2 | 3 | 4;
}

function depthBeadSizePx(index: number): number {
  const t =
    (index - MALA_DEPTH_START_INDEX) / (MALA_BEADS_PER_SIDE - MALA_DEPTH_START_INDEX);
  return Math.max(
    MALA_MIN_DEPTH_BEAD_PX,
    Math.round(FOURTH + (MALA_MIN_DEPTH_BEAD_PX - FOURTH) * t),
  );
}

/** Lower = down-left under previous bead; upper = same, mirrored up-left. */
function rearCenterDeltaUnderFront(
  frontPx: number,
  rearPx: number,
  arm: 'upper' | 'lower',
): { dx: number; dy: number } {
  const sizeGap = frontPx - rearPx;
  const left = -Math.round(frontPx * PEEK_LEFT_RATIO) - Math.round(sizeGap * PEEK_LEFT_GAP_RATIO);
  const edge = -Math.round(frontPx * PEEK_EDGE_RATIO) - Math.round(sizeGap * PEEK_EDGE_GAP_RATIO);
  const dx = left + rearPx / 2 - frontPx / 2;
  const dyDown = frontPx + edge + rearPx / 2 - frontPx / 2;
  return { dx, dy: arm === 'lower' ? dyDown : -dyDown };
}

function applyExitLeft(slots: DepthBeadSlot[]): void {
  const last = slots.length - 1;
  for (let i = 0; i <= last; i++) {
    const t = i / last;
    const t2 = t * t;
    slots[i]!.x -= Math.round(EXIT_LEFT_PX * t2);
    slots[i]!.dimmed = Math.min(4, slots[i]!.dimmed + Math.floor(t2 * 2));
  }
}

/** 5 under 4th → 6 under 5 → … → 54 fades off left of screen. */
export function buildDepthChain(arm: 'upper' | 'lower', fourthCenter: MalaPoint): DepthBeadSlot[] {
  const slots: DepthBeadSlot[] = [];
  let x = fourthCenter.x;
  let y = fourthCenter.y;
  let frontPx = FOURTH;

  for (let index = MALA_DEPTH_START_INDEX; index <= MALA_BEADS_PER_SIDE; index++) {
    const sizePx = depthBeadSizePx(index);
    const { dx, dy } = rearCenterDeltaUnderFront(frontPx, sizePx, arm);
    x += dx;
    y += dy;
    frontPx = sizePx;

    const depth = index - MALA_DEPTH_START_INDEX;
    slots.push({
      index,
      x,
      y,
      sizePx,
      zIndex: Math.max(1, 12 - depth),
      dimmed: Math.min(4, 1 + Math.floor(depth / 10)),
    });
  }

  applyExitLeft(slots);
  return slots;
}

/** Thread: core centres only (depth beads exit off-screen). */
export function buildCoreThreadPoints(coreCenters: MalaPoint[]): MalaPoint[] {
  return coreCenters;
}
