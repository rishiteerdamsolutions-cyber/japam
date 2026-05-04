/** Display marathon start date; tolerates API always sending YYYY-MM-DD and legacy bad JSON. */
export function formatMarathonStartDateLabel(raw: unknown): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  }
  if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
    const sec = (raw as { seconds?: number }).seconds;
    if (typeof sec === 'number') {
      const d = new Date(sec * 1000);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
  }
  return '';
}
