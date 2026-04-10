import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import { trackShareEvent } from '../_analytics.js';

const VALID_EVENTS = new Set([
  'share_click',
  'marathon_rank_card',
  'maha_yagna_rank_card',
  'japa_pdf',
]);

/** POST /api/user/share-event - Track lightweight share actions for virality analytics. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const body = await request.json().catch(() => ({}));
    const event = typeof body.event === 'string' ? body.event.trim() : '';
    if (!VALID_EVENTS.has(event)) return jsonResponse({ error: 'Invalid event' }, 400);
    await trackShareEvent(db, uid, event);
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user share-event POST', e);
    return jsonInternalServerError(e, 'api/_handlers/user/share-event.js');
  }
}
