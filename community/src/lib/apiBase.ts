/**
 * Base URL for API requests. Community app talks to the game backend;
 * use VITE_API_URL when set (e.g. production), else current origin (dev with proxy).
 */
export function getApiBase(): string {
  const env = import.meta.env.VITE_API_URL ?? '';
  if (env && typeof env === 'string') return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
