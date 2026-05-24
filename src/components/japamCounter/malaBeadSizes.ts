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

/** Fixed-core tier spin (deg): 1st +40°, 2nd +80°, 3rd +120°, 4th +160° so faces don’t align. */
export const MALA_BEAD_TIER_SPIN_STEP_DEG = 40;
