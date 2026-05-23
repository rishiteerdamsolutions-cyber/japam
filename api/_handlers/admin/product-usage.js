import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, jsonInternalServerError } from '../_lib.js';
import { getDayKeyFromOffset } from '../_analytics.js';
import { PRODUCT_USAGE_CATALOG } from '../_productUsageCatalog.js';

function periodDays(period) {
  if (period === 'week') return 7;
  if (period === 'month') return 30;
  return 1;
}

function dateRange(days) {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) keys.push(getDayKeyFromOffset(-i));
  return keys;
}

function buildRanked(totals) {
  const ranked = PRODUCT_USAGE_CATALOG.map((item) => ({
    key: item.key,
    label: item.label,
    category: item.category,
    count: totals[item.key] || 0,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const unused = PRODUCT_USAGE_CATALOG.filter((item) => !(totals[item.key] > 0)).map((item) => ({
    key: item.key,
    label: item.label,
    category: item.category,
    count: 0,
  }));

  const byCategory = {};
  for (const row of ranked) {
    if (!byCategory[row.category]) byCategory[row.category] = [];
    byCategory[row.category].push(row);
  }

  return {
    ranked,
    unused,
    byCategory,
    top3: ranked.slice(0, 3),
  };
}

/** GET /api/admin/product-usage?period=day|week|month - Ranked feature & page usage. */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token) return jsonResponse({ error: 'Missing token' }, 401);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const url = new URL(request.url);
    const periodParam = (url.searchParams.get('period') || 'day').toLowerCase();
    const period = periodParam === 'week' || periodParam === 'month' ? periodParam : 'day';
    const days = periodDays(period);
    const dayKeys = dateRange(days);

    const snaps = await Promise.all(dayKeys.map((day) => db.doc(`analyticsDaily/${day}`).get()));
    const totals = {};
    for (const snap of snaps) {
      const usage = snap.exists ? snap.data()?.usage_counts || {} : {};
      for (const [key, count] of Object.entries(usage)) {
        if (typeof count !== 'number' || !Number.isFinite(count)) continue;
        totals[key] = (totals[key] || 0) + count;
      }
    }

    const { ranked, unused, byCategory, top3 } = buildRanked(totals);
    const totalEvents = ranked.reduce((sum, row) => sum + row.count, 0);

    return jsonResponse(
      {
        period,
        range: { from: dayKeys[0], to: dayKeys[dayKeys.length - 1], days },
        total_events: totalEvents,
        top3,
        ranked,
        unused,
        by_category: byCategory,
        catalog_size: PRODUCT_USAGE_CATALOG.length,
        tracked_keys: ranked.length,
        untracked_keys: unused.length,
      },
      200,
    );
  } catch (e) {
    console.error('admin product-usage GET', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/product-usage.js');
  }
}
