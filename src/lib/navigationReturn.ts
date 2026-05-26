/** Safe in-app path for logical “back” navigation (open-redirect hardening). */
export function normalizeReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;
  const pathOnly = raw.split('?')[0]?.split('#')[0] ?? '';
  if (pathOnly === '/signin' || pathOnly.startsWith('/signin/')) return null;
  return raw;
}

export type NavReturnState = {
  returnTo?: string;
  /** @deprecated Use returnTo — kept for older Settings links */
  from?: string;
};

export function currentReturnPath(pathname: string, search = ''): string {
  return `${pathname}${search || ''}`;
}

export function withReturnTo(returnTo: string, extra?: Record<string, unknown>): NavReturnState & Record<string, unknown> {
  return { ...extra, returnTo };
}

export function readReturnTo(
  state: unknown,
  fallback: string,
): string {
  const s = state as NavReturnState | null;
  return normalizeReturnPath(s?.returnTo) ?? normalizeReturnPath(s?.from) ?? fallback;
}
