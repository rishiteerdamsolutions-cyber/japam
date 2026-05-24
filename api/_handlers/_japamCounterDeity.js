/** Deity ids allowed for Japam Counter increment / leaderboard (includes guru-reserved for saved history). */

export const JAPAM_COUNTER_DEITY_IDS = [
  'rama',
  'shiva',
  'ganesh',
  'surya',
  'shakthi',
  'krishna',
  'shanmukha',
  'venkateswara',
  'hanuman',
  'narasimha',
  'lakshmi',
  'durga',
  'saraswati',
  'ayyappan',
  'jagannath',
  'dattatreya',
  'saiBaba',
  'narayana',
  'iskcon',
  'guru',
  'shani',
  'rahu',
  'ketu',
  'bramhamgaaru',
];

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function parseJapamCounterDeityParam(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  return JAPAM_COUNTER_DEITY_IDS.includes(s) ? s : null;
}
