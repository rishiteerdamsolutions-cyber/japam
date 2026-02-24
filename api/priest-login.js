import { getDb, verifyPassword, createPriestToken, jsonResponse } from './_lib.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;
    if (!username?.trim() || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const templesRef = db.collection('temples');
    const snap = await templesRef.where('priestUsername', '==', username.trim()).limit(1).get();
    if (snap.empty) {
      return jsonResponse({ error: 'Invalid username or password' }, 401);
    }
    const doc = snap.docs[0];
    const data = doc.data();
    const templeId = doc.id;
    const templeName = data.name || '';

    if (!verifyPassword(password, data.priestPasswordHash)) {
      return jsonResponse({ error: 'Invalid username or password' }, 401);
    }

    const token = createPriestToken(templeId, templeName);
    return jsonResponse({ token, templeId, templeName });
  } catch (e) {
    console.error('priest-login', e);
    return jsonResponse({ error: e.message || 'Login failed' }, 500);
  }
}
