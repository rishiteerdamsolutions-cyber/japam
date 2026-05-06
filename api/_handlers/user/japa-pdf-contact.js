import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import admin from 'firebase-admin';

function cleanText(v, max = 80) {
  if (typeof v !== 'string') return '';
  const out = v.trim().replace(/\s+/g, ' ');
  return out.slice(0, max);
}

function cleanMobile(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^\d+]/g, '').slice(0, 20);
}

/** POST /api/user/japa-pdf-contact - Save optional PDF contact details for admin follow-up. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const body = await request.json().catch(() => ({}));
    const name = cleanText(body?.name, 80);
    const gotram = cleanText(body?.gotram, 80);
    const mobileNumber = cleanMobile(body?.mobileNumber);
    const deityName = cleanText(body?.deityName, 60);
    const count = Math.max(0, Math.round(Number(body?.count) || 0));

    if (!name && !gotram && !mobileNumber) {
      return jsonResponse({ ok: true, skipped: true }, 200);
    }

    const id = `${uid}_${Date.now()}`;
    await db.collection('japaPdfContacts').doc(id).set({
      uid,
      name: name || null,
      gotram: gotram || null,
      mobileNumber: mobileNumber || null,
      deityName: deityName || null,
      count: count || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user japa-pdf-contact POST', e);
    return jsonInternalServerError(e, 'api/_handlers/user/japa-pdf-contact.js');
  }
}

