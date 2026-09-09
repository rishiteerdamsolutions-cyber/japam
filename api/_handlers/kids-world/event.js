import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import { recordKidsCert } from '../_utsavAnalytics.js';

/** POST /api/kids-world/event — durable kids-world analytics (certificate, etc). */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Sign in required' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ ok: true }, 200);
    const body = await request.json().catch(() => ({}));
    const type = typeof body?.type === 'string' ? body.type : '';
    if (type === 'cert_download') {
      await recordKidsCert(db, uid);
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: 'Invalid type' }, 400);
  } catch {
    return jsonResponse({ ok: true }, 200);
  }
}
