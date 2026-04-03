/**
 * Opt-in game diagnostics. No server cost.
 * - Always on in Vite dev (`import.meta.env.DEV`).
 * - In production: set `localStorage.setItem('japam_game_debug', '1')` then reload.
 */
export function gameDebug(...args: unknown[]): void {
  try {
    const enabled =
      import.meta.env.DEV ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('japam_game_debug') === '1');
    if (enabled) console.log('[JapamGame]', ...args);
  } catch {
    /* ignore */
  }
}
