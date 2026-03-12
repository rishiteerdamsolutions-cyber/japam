import { getDb, verifyPassword, createPriestToken, jsonResponse, logAudit } from './_lib.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;
    if (!username?.trim() || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400);
    }
    const db = getDb();
    if (!db) {
      return jsonResponse(
        { error: 'Database not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON to .env (Firebase service account key as JSON string).' },
        503
      );
    }

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

    if (data.priestUserId) {
      return jsonResponse(
        { error: 'This priest account is linked. Sign in with Google at japam.digital and link from Settings.' },
        403
      );
    }

    await logAudit('priest_login', { templeId, templeName, priestUsername: username.trim() });
    const token = createPriestToken(templeId, templeName);
    return jsonResponse({ token, templeId, templeName });
  } catch (e) {
    console.error('priest-login', e);
    if (e?.message?.includes('not configured')) {
      return jsonResponse({ error: 'Priest login not configured (set ADMIN_SECRET or PRIEST_SECRET)' }, 503);
    }
    return jsonResponse({ error: e.message || 'Login failed' }, 500);
  }
}
