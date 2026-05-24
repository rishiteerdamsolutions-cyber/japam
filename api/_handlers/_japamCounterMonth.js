/** Shared IST month key + Firestore field names for Japam Counter leaderboards. */

export function istMonthKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${y}-${m}`;
}

export function publicFieldManual(monthKey) {
  return `jcm_${monthKey}`;
}

export function publicFieldAuto(monthKey) {
  return `jca_${monthKey}`;
}

/** Per-deity manual japas for rank card / leaderboard (IST month). */
export function publicFieldManualDeity(monthKey, deityId) {
  return `jcm_${deityId}_${monthKey}`;
}

/** Per-deity auto japas for rank card / leaderboard (IST month). */
export function publicFieldAutoDeity(monthKey, deityId) {
  return `jca_${deityId}_${monthKey}`;
}

export function parseMonthKeyParam(raw) {
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return istMonthKey();
}
