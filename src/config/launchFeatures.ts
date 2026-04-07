/**
 * First-launch product surface. Disabled features stay in the repo (pages, APIs,
 * GameScreen occasion paths, `public/asura-combat-test.html`) but are hidden from
 * navigation and deep links redirect home.
 *
 * Enable locally: set in `.env.local`
 *   VITE_LAUNCH_MULTIPLAYER_ASURA=true
 *   VITE_LAUNCH_OCCASION_GAMES=true
 */

function viteBool(key: string, defaultValue: boolean): boolean {
  const v = import.meta.env[key];
  if (v === 'true') return true;
  if (v === 'false') return false;
  return defaultValue;
}

/** Asura / two-player prototype (`public/asura-combat-test.html`). */
export const LAUNCH_FEATURE_MULTIPLAYER_ASURA = viteBool('VITE_LAUNCH_MULTIPLAYER_ASURA', false);

/** Birthday japa, wedding-anniversary lobby/join, couple daily game, and related dashboard rows. */
export const LAUNCH_FEATURE_OCCASION_GAMES = viteBool('VITE_LAUNCH_OCCASION_GAMES', false);
