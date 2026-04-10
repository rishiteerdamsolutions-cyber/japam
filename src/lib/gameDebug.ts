/**
 * Opt-in game diagnostics. No server cost.
 * - Always on in Vite dev (`import.meta.env.DEV`).
 * - Production: only if `VITE_ENABLE_GAME_DEBUG=true` at build time and
 *   `localStorage.setItem('japam_game_debug', '1')` then reload.
 */
export function gameDebug(...args: unknown[]): void {
  try {
    const prodDebugAllowed = import.meta.env.VITE_ENABLE_GAME_DEBUG === 'true';
    const enabled =
      import.meta.env.DEV ||
      (prodDebugAllowed &&
        typeof localStorage !== 'undefined' &&
        localStorage.getItem('japam_game_debug') === '1');
    if (enabled) console.log('[JapamGame]', ...args);
  } catch {
    /* ignore */
  }
}
