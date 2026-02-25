import { getDb, jsonResponse, verifyAdminToken, getAdminTokenFromRequest } from '../_lib.js';

const DEFAULT_MAX_REVEALED = 49;

/** GET /api/admin/levels - Admin. Returns current levels config. */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const snap = await db.doc('config/game').get();
    const data = snap.exists ? snap.data() : null;
    const maxRevealedLevelIndex =
      typeof data?.maxRevealedLevelIndex === 'number' && data.maxRevealedLevelIndex >= 0
        ? Math.min(999, Math.floor(data.maxRevealedLevelIndex))
        : DEFAULT_MAX_REVEALED;
    return jsonResponse({ maxRevealedLevelIndex, revealedCount: maxRevealedLevelIndex + 1 });
  } catch (e) {
    console.error('admin levels GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/admin/levels - Admin. Set how many levels are revealed. Body: { maxRevealedLevelIndex } or { revealCount }. */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body?.token && typeof body.token === 'string') ? body.token : getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    let maxRevealedLevelIndex =
      typeof body.maxRevealedLevelIndex === 'number' ? body.maxRevealedLevelIndex : undefined;
    if (maxRevealedLevelIndex === undefined && typeof body.revealCount === 'number') {
      maxRevealedLevelIndex = body.revealCount <= 0 ? 0 : body.revealCount - 1;
    }
    if (maxRevealedLevelIndex === undefined) {
      return jsonResponse({ error: 'maxRevealedLevelIndex or revealCount required' }, 400);
    }
    const value = Math.max(0, Math.min(999, Math.floor(maxRevealedLevelIndex)));
    await db.doc('config/game').set({ maxRevealedLevelIndex: value }, { merge: true });
    return jsonResponse({ ok: true, maxRevealedLevelIndex: value, revealedCount: value + 1 });
  } catch (e) {
    console.error('admin levels POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
