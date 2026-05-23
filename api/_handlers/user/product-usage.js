import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import { trackProductUsage } from '../_analytics.js';
import { isValidProductUsageKey } from '../_productUsageCatalog.js';

/** POST /api/user/product-usage - Track page views and feature clicks (auth optional). */
export async function POST(request) {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const body = await request.json().catch(() => ({}));
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!isValidProductUsageKey(key)) return jsonResponse({ error: 'Invalid key' }, 400);
    await verifyFirebaseUser(request);
    await trackProductUsage(db, key);
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user product-usage POST', e);
    return jsonInternalServerError(e, 'api/_handlers/user/product-usage.js');
  }
}
