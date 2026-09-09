/**
 * Isolated kids-world live roster.
 * Collection: kidsWorldLive — not used by satsang, japa, or any other Japam feature.
 * Only signed-in users who opened For KIDS are written here.
 */
import admin from 'firebase-admin';
import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import { upsertKidsVisit } from '../_utsavAnalytics.js';

const COL = 'kidsWorldLive';
const TTL_MS = 90 * 1000;

function firstHalfName(full) {
  const s = String(full || '').trim();
  if (!s) return 'Guest';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[0];
  return s.slice(0, Math.max(2, Math.ceil(s.length / 2)));
}

function familyFromName(full) {
  const s = String(full || '').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' ');
  return 'Parivar';
}

function toMember(data) {
  return {
    id: String(data.id || ''),
    n: String(data.n || 'Guest'),
    f: String(data.f || 'Parivar'),
    c: typeof data.c === 'number' ? data.c : 0x12c46a,
    av: data.av === '👧' ? '👧' : '👦',
    day: typeof data.day === 'number' ? data.day : 1,
    doneCount: typeof data.doneCount === 'number' ? data.doneCount : 0,
    stage: typeof data.stage === 'string' ? data.stage : 'home',
  };
}

async function listLive(db) {
  const cutoff = Date.now() - TTL_MS;
  let docs = [];
  try {
    const snap = await db.collection(COL).where('seenAtMs', '>=', cutoff).limit(20).get();
    docs = snap.docs;
  } catch {
    const snap = await db.collection(COL).limit(40).get();
    docs = snap.docs.filter((d) => (d.data().seenAtMs || 0) >= cutoff);
  }
  return docs.map((d) => toMember(d.data() || {})).filter((m) => m.id);
}

export async function GET() {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ members: [] }, 200);
    return jsonResponse({ members: await listLive(db) }, 200);
  } catch {
    return jsonResponse({ members: [] }, 200);
  }
}

export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Sign in required' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ members: [] }, 200);
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const rawName = String(body.n || '');
    // Client already sends first-half `n`. Don't slice again (that would turn "Aditya" into "Adi").
    const n = (rawName.includes(' ') ? firstHalfName(rawName) : rawName.trim()) || 'Guest';
    const f = String(body.f || '').trim() || familyFromName(rawName);
    const c = typeof body.c === 'number' ? body.c : parseInt(String(body.c || ''), 16);
    const day = typeof body.day === 'number' ? body.day : 1;
    const doneCount = typeof body.doneCount === 'number' ? body.doneCount : 0;
    const stage = typeof body.stage === 'string' ? body.stage : 'home';
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim().slice(0, 80) : '';
    await db.collection(COL).doc(uid).set(
      {
        id: uid,
        n,
        f: f || 'Parivar',
        c: Number.isFinite(c) ? c : 0x12c46a,
        av: body.av === '👧' ? '👧' : '👦',
        day,
        doneCount,
        stage,
        eventId: eventId || null,
        seenAtMs: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    try {
      await upsertKidsVisit(db, {
        uid,
        n,
        f: f || 'Parivar',
        day,
        doneCount,
        stage,
        eventId: body.eventId,
        nimDone: body.nimDone === true || stage === 'done',
      });
    } catch {}
    return jsonResponse({ members: await listLive(db) }, 200);
  } catch {
    return jsonResponse({ members: [] }, 200);
  }
}
