import { BEAD_SIZE_PX, MALA_FIFTH_BEAD_GLOBE_PX } from './malaBeadSizes';

/** Beads per side of main — 4 fixed near main + 50 in Z-depth chain = 54. */
export const MALA_BEADS_PER_SIDE = 54;

/** First chain index rendered in the far (Z-depth) extension. */
export const MALA_FAR_CHAIN_START_INDEX = 5;

export const MALA_MIN_CHAIN_GLOBE_PX = 10;

const NEAR_SIZE = MALA_FIFTH_BEAD_GLOBE_PX;
const FAR_SIZE = MALA_MIN_CHAIN_GLOBE_PX;

/** Size for far-chain indices 5 … 54 (smaller toward the join). */
export function farChainBeadSizePx(index: number): number {
  const i = Math.max(MALA_FAR_CHAIN_START_INDEX, Math.min(MALA_BEADS_PER_SIDE, index));
  const t = (i - MALA_FAR_CHAIN_START_INDEX) / (MALA_BEADS_PER_SIDE - MALA_FAR_CHAIN_START_INDEX);
  return Math.round(NEAR_SIZE + (FAR_SIZE - NEAR_SIZE) * t);
}

/** Compressed row height so 50 beads fit on screen. */
export function farChainRowHeightPx(index: number): number {
  return Math.max(4, Math.round(farChainBeadSizePx(index) * 0.38));
}

export function farChainNaturalHeightPx(): number {
  let h = 0;
  for (let i = MALA_FAR_CHAIN_START_INDEX; i <= MALA_BEADS_PER_SIDE; i++) {
    h += farChainRowHeightPx(i);
  }
  return h;
}

/** Z-depth (scale, left, dim) — farther index = deeper on the string. */
export function farChainDepthStyle(index: number): {
  leftNudge: number;
  scale: number;
  zIndex: number;
  dimmed: number;
} {
  const t =
    (index - MALA_FAR_CHAIN_START_INDEX) /
    (MALA_BEADS_PER_SIDE - MALA_FAR_CHAIN_START_INDEX);
  return {
    leftNudge: -Math.round(BEAD_SIZE_PX * (0.04 + t * 0.22)),
    scale: 1 - t * 0.32,
    zIndex: Math.max(0, Math.round(7 - t * 6)),
    dimmed: Math.min(4, Math.round(1 + t * 3)),
  };
}

export const MALA_GLOBE_MIN_RENDER_PX = 22;
