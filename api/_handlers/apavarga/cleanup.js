import { getDb, jsonResponse } from '../_lib.js';

/** POST /api/apavarga/cleanup - Delete expired statuses (24h). Call via cron. */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('x-cron-secret');
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection('apavargaStatus').where('expiresAt', '<', cutoff).limit(100).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return jsonResponse({ deleted: snap.size }, 200);
}
