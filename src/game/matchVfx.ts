/** Candy-style match clear: stagger + pop duration; keep in sync with CSS `.gem-match`. */
export const MATCH_STAGGER_MS = 36;
export const MATCH_POP_DURATION_MS = 560;

/** Couple (anniversary) mode: faster stagger + `.gem-match.gem-match--couple` duration. */
export const MATCH_STAGGER_MS_COUPLE = 22;
export const MATCH_POP_DURATION_MS_COUPLE = 400;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Time until board commits after a match (all staggered pops must finish first). */
export function getMatchClearDelayMs(matchCount: number): number {
  const reduced = prefersReducedMotion();
  const n = Math.max(1, matchCount);
  const stagger = reduced ? 0 : MATCH_STAGGER_MS;
  const popMs = reduced ? 230 : MATCH_POP_DURATION_MS;
  const tail = (n - 1) * stagger;
  const pad = reduced ? 48 : 72;
  return Math.min(reduced ? 420 : 1200, tail + popMs + pad);
}

/** Snappier clears when syncing over Firestore (still covers full pop animation). */
export function getCoupleMatchClearDelayMs(matchCount: number): number {
  const reduced = prefersReducedMotion();
  const n = Math.max(1, matchCount);
  const stagger = reduced ? 0 : MATCH_STAGGER_MS_COUPLE;
  const popMs = reduced ? 230 : MATCH_POP_DURATION_MS_COUPLE;
  const tail = (n - 1) * stagger;
  const pad = reduced ? 40 : 52;
  return Math.min(reduced ? 380 : 880, tail + popMs + pad);
}
