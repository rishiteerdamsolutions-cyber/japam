import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';
import { getDayKeyFromOffset } from '../_analytics.js';

function dateRange(days) {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) keys.push(getDayKeyFromOffset(-i));
  return keys;
}

/** GET /api/admin/analytics-timeseries?days=30 - Daily series for users and japam charts. */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token) return jsonResponse({ error: 'Missing token' }, 401);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const url = new URL(request.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') || 30)));
    const dayKeys = dateRange(days);
    const snaps = await Promise.all(dayKeys.map((day) => db.doc(`analytics/daily/${day}`).get()));
    const series = dayKeys.map((day, idx) => {
      const data = snaps[idx].exists ? snaps[idx].data() || {} : {};
      return {
        day,
        dau: data.dau || 0,
        new_users: data.new_users || 0,
        returning_users: data.returning_users || 0,
        japam: data.total_japam || 0,
      };
    });
    return jsonResponse({ days, series }, 200);
  } catch (e) {
    console.error('admin analytics-timeseries GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
