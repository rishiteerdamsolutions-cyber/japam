import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import { FUNNEL_TYPES, recordFunnelEvent } from '../_utsavAnalytics.js';

const PUBLIC_TYPES = new Set(['landing', 'skip']);

/** POST /api/satsang/analytics-event — landing/skip (optional auth), share/pdf/kids_enter. */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ ok: true }, 200);
  try {
    const body = await request.json().catch(() => ({}));
    const type = FUNNEL_TYPES.includes(body?.type) ? body.type : '';
    if (!type || type === 'join' || type === 'complete') {
      return jsonResponse({ error: 'Invalid type' }, 400);
    }
    const uid = await verifyFirebaseUser(request);
    if (!PUBLIC_TYPES.has(type) && !uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    await recordFunnelEvent(db, {
      type,
      eventId: typeof body.eventId === 'string' ? body.eventId : null,
      orgName: typeof body.orgName === 'string' ? body.orgName : null,
      uid: uid || null,
    });
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ ok: true }, 200);
  }
}
