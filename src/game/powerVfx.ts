/** Power activation flash on the board (blessing clear, strip target, etc.). */

export const POWER_PULSE_DURATION_MS = 340;

export function powerVfxDurationMs(): number {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  return POWER_PULSE_DURATION_MS;
}
