import { getDb, jsonResponse, jsonInternalServerError } from '../_lib.js';
import {
  SATSANG_CAP,
  normalizeSatsangCode,
  isValidSatsangCodeFormat,
  istYmd,
  sittingIdFor,
} from '../_satsang.js';

/** GET /api/public/satsang-report?code= — view-only names card payload. No gotra/mobile. */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const url = new URL(request.url);
    const code = normalizeSatsangCode(url.searchParams.get('code'));
    if (!isValidSatsangCodeFormat(code)) {
      return jsonResponse({ error: 'This satsang code is not live today.', code: 'bad_code' }, 400);
    }
    const lookupSnap = await db.doc(`satsangCodes/${code}`).get();
    if (!lookupSnap.exists) {
      return jsonResponse({ error: 'This satsang code is not live today.', code: 'bad_code' }, 400);
    }
    const lookup = lookupSnap.data() || {};
    const eventSnap = await db.doc(`satsangEvents/${lookup.eventId}`).get();
    if (!eventSnap.exists) {
      return jsonResponse({ error: 'This satsang is closed.', code: 'closed' }, 400);
    }
    const event = eventSnap.data() || {};
    const today = istYmd();
    const kind = lookup.kind === 'trial' ? 'trial' : 'live';
    if (kind === 'live' && lookup.ymd !== today) {
      return jsonResponse({ error: 'This satsang code is not live today.', code: 'bad_code' }, 400);
    }
    const sittingId = sittingIdFor(kind, today);
    const sittingRef = db.doc(`satsangEvents/${lookup.eventId}/sittings/${sittingId}`);
    const sittingSnap = await sittingRef.get();
    const seatsSnap = await sittingRef.collection('seats').limit(SATSANG_CAP).get();
    const names = seatsSnap.docs
      .map((d) => {
        const data = d.data() || {};
        const n = typeof data.displayName === 'string' ? data.displayName.trim() : '';
        return n || d.id.slice(0, 8);
      })
      .slice(0, SATSANG_CAP);

    return jsonResponse({
      ok: true,
      orgName: event.orgName || '',
      eventName: event.eventName || '',
      place: event.place || null,
      date: today,
      isTrial: kind === 'trial',
      participantCount: sittingSnap.exists
        ? Math.max(0, Math.round(Number(sittingSnap.data()?.participantCount) || names.length))
        : names.length,
      cap: SATSANG_CAP,
      names,
    });
  } catch (e) {
    return jsonInternalServerError(e, 'public/satsang-report GET');
  }
}
