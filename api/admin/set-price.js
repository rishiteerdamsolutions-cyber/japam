import { getDb, verifyAdminToken, jsonResponse } from '../_lib.js';

function getAdminToken(request, body) {
  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getAdminToken(request, body);
    if (!verifyAdminToken(token)) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }
    const unlockPricePaise = Math.round(Number(body?.unlockPricePaise));
    if (!Number.isFinite(unlockPricePaise) || unlockPricePaise < 100) {
      return jsonResponse({ error: 'Invalid price (min 100 paise)' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    await db.doc('config/pricing').set({ unlockPricePaise });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('admin set-price', e);
    return jsonResponse({ error: e.message || 'Failed to save' }, 500);
  }
}
