import { getDb, verifyPassword, createPriestToken, jsonResponse } from '../../_lib.js';

/** POST /api/priest/link - Link Google user to priest account. Body: { userId, priestUsername, priestPassword } */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, priestUsername, priestPassword } = body;
    if (!userId?.trim() || !priestUsername?.trim() || !priestPassword) {
      return jsonResponse({ error: 'userId, priestUsername and priestPassword required' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const templesRef = db.collection('temples');
    const snap = await templesRef.where('priestUsername', '==', priestUsername.trim()).limit(1).get();
    if (snap.empty) {
      return jsonResponse({ error: 'Invalid username or password' }, 401);
    }
    const doc = snap.docs[0];
    const data = doc.data();
    const templeId = doc.id;
    const templeName = data.name || '';

    if (!verifyPassword(priestPassword, data.priestPasswordHash)) {
      return jsonResponse({ error: 'Invalid username or password' }, 401);
    }

    await doc.ref.update({ priestUserId: userId.trim() });
    const token = createPriestToken(templeId, templeName);
    return jsonResponse({ ok: true, token, templeId, templeName });
  } catch (e) {
    console.error('priest link', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
