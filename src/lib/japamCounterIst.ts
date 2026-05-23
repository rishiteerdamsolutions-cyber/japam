/** Calendar month keys in Asia/Kolkata (IST). */

const TZ = 'Asia/Kolkata';

export function istMonthKeyFromDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${y}-${m}`;
}

/** e.g. "May 2025" for rank cards and leaderboard headers. */
export function istMonthLabelFromKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', year: 'numeric' }).format(d);
}

export function publicJapamCounterField(mode: 'manual' | 'auto', monthKey: string): string {
  return mode === 'auto' ? `jca_${monthKey}` : `jcm_${monthKey}`;
}
