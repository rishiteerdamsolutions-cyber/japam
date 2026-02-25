/**
 * Base URL for API requests. In PWA/installed app, use current origin
 * so fetch always hits the same domain (avoids relative-path issues in standalone).
 */
export function getApiBase(): string {
  const env = import.meta.env.VITE_API_URL ?? '';
  if (env && typeof env === 'string') return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
