/** Safe in-app path from Settings location state (open redirect hardening). */
export function normalizeSettingsReturn(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;
  return raw;
}
