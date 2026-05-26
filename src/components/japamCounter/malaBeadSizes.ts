/** Main rudraksha on the japam counter (interactive). */
export const MALA_BEAD_DIAMETER_PX = 76;
export const BEAD_SIZE_PX = MALA_BEAD_DIAMETER_PX - 6;

/** Display-only neighbours: 40% smaller than main (60% scale). */
export const MALA_SATELLITE_SCALE = 0.6;
export const MALA_SATELLITE_DIAMETER_PX = Math.round(MALA_BEAD_DIAMETER_PX * MALA_SATELLITE_SCALE);
export const MALA_SATELLITE_GLOBE_PX = Math.round(BEAD_SIZE_PX * MALA_SATELLITE_SCALE);

/** Third beads (behind each “second” bead): 10% smaller than second. */
export const MALA_REAR_BEAD_SCALE = 0.9;
export const MALA_REAR_BEAD_GLOBE_PX = Math.round(MALA_SATELLITE_GLOBE_PX * MALA_REAR_BEAD_SCALE);

/** Fourth beads (behind third): 10% smaller than third. */
export const MALA_FOURTH_BEAD_GLOBE_PX = Math.round(MALA_REAR_BEAD_GLOBE_PX * MALA_REAR_BEAD_SCALE);

/** Fifth beads (behind fourth): 10% smaller than fourth. */
export const MALA_FIFTH_BEAD_GLOBE_PX = Math.round(MALA_FOURTH_BEAD_GLOBE_PX * MALA_REAR_BEAD_SCALE);

/** Touch pad around main bead only. */
export const MALA_TOUCH_PAD_PX = MALA_BEAD_DIAMETER_PX + 28;

/** Swipe zone taller than core so closing tassel on 1st bead (108) stays visible. */
export const MALA_SWIPE_ZONE_EXTRA_V_PX = 56;
/** Room for tassel on right equator (extends past 70px core column). */
export const MALA_SWIPE_ZONE_EXTRA_R_PX = 32;

export function malaSwipeZoneWidthPx(): number {
  return BEAD_SIZE_PX + MALA_SWIPE_ZONE_EXTRA_R_PX;
}

export function malaSwipeZoneHeightPx(coreHeightPx: number): number {
  return coreHeightPx + MALA_SWIPE_ZONE_EXTRA_V_PX;
}

/** 360° / 9 beads — one unique face every 40°. */
export const MALA_BEAD_TIER_SPIN_STEP_DEG = 40;

/**
 * Initial globe face (deg) per bead #1 (bottom) … #9 (top).
 * Full set: 0, 40, 80, 120, 160, 200, 240, 280, 320 — all different.
 */
export const MALA_CORE_BEAD_FACE_BY_NUMBER: readonly number[] = [
  200, 240, 280, 320, 0, 40, 80, 120, 160,
] as const;

/** Same angles, visual stack top → bottom (row order in FixedMalaCore). */
export const MALA_CORE_FACE_VISUAL_STACK: readonly number[] = [
  160, 120, 80, 40, 0, 320, 280, 240, 200,
] as const;

/** Small Y-twist per bead so 5-mukhi symmetry cannot make two faces look alike. */
export const MALA_CORE_BEAD_Y_TWIST_VISUAL_STACK: readonly number[] = [
  31, 23, 17, 11, 0, 7, 13, 19, 29,
] as const;
