import crypto from 'crypto';
import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import admin from 'firebase-admin';

function randomId() {
  return crypto.randomBytes(12).toString('base64url').replace(/[^a-zA-Z0-9_-]/g, 'x');
}

function randomToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function hashToken(t) {
  return crypto.createHash('sha256').update(String(t), 'utf8').digest('hex');
}

/** POST /api/occasions/anniversary/create — host starts a session; returns join link secret. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const hostRole = body.hostRole === 'wife' ? 'wife' : 'husband';
  const guestRole = hostRole === 'husband' ? 'wife' : 'husband';
  const gameMode = typeof body.gameMode === 'string' && body.gameMode.length <= 40 ? body.gameMode : 'general';
  const levelIndex = Number.isFinite(body.levelIndex) ? Math.max(0, Math.min(99, Math.floor(body.levelIndex))) : 0;

  const sessionId = randomId();
  const joinToken = randomToken();
  const joinTokenHash = hashToken(joinToken);

  await db.doc(`anniversarySessions/${sessionId}`).set({
    hostUid: uid,
    guestUid: null,
    hostRole,
    guestRole,
    joinTokenHash,
    gameMode,
    levelIndex,
    status: 'waiting',
    version: 0,
    completionWritten: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return jsonResponse({
    sessionId,
    joinToken,
    guestRole,
    hostRole,
    gameMode,
    levelIndex,
  });
}
