import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked } from '../_lib.js';
import admin from 'firebase-admin';

/** POST /api/apavarga/custom-token - Exchange Firebase ID token for a custom token so Apavarga app can sign in without asking again. Pro only. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  if (!(await isUserUnlocked(db, uid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  try {
    const customToken = await admin.auth().createCustomToken(uid);
    return jsonResponse({ customToken }, 200);
  } catch (e) {
    console.error('apavarga custom-token', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
