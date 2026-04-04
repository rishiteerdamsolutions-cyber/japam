import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import admin from 'firebase-admin';

/** POST /api/occasions/birthday/complete — record a finished birthday japa session. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const mode = typeof body.mode === 'string' && body.mode.length <= 40 ? body.mode : 'general';
  const japasTotal = Math.max(0, Math.floor(Number(body.japasTotal) || 0));
  const japasByDeity =
    body.japasByDeity && typeof body.japasByDeity === 'object' ? body.japasByDeity : {};

  await db.collection(`users/${uid}/occasions`).add({
    type: 'birthday',
    mode,
    japasTotal,
    japasByDeity,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return jsonResponse({ ok: true });
}
