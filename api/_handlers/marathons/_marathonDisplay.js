/**
 * Firestore may store dates as Timestamp objects; JSON.stringify turns them into `{}` or non-ISO shapes.
 * Normalize to YYYY-MM-DD for stable marathon UI copy.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMarathonStartDate(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  }
  if (typeof raw === 'object' && raw !== null) {
    if (typeof raw.toDate === 'function') {
      try {
        const d = raw.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
      } catch {
        return '';
      }
    }
    if (typeof raw.seconds === 'number') {
      const ms =
        raw.seconds * 1000 +
        (typeof raw.nanoseconds === 'number' ? Math.floor(raw.nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
  }
  return '';
}
