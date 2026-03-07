import admin from 'firebase-admin';
import { getDb, jsonResponse, verifyFirebaseUser } from './_lib.js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured (missing Cashfree keys)' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { order_id } = body;
    if (!order_id) {
      return jsonResponse({ error: 'order_id required' }, 400);
    }

    const res = await fetch(`${CASHFREE_BASE}/orders/${encodeURIComponent(order_id)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-version': '2023-08-01',
        'X-Client-Id': CASHFREE_APP_ID,
        'X-Client-Secret': CASHFREE_SECRET,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('verify-unlock Cashfree GET order', res.status, data);
      return jsonResponse({ error: data?.message || 'Failed to verify payment' }, 400);
    }

    const orderStatus = data?.order_status;
    if (orderStatus !== 'PAID') {
      return jsonResponse({ error: 'Payment not completed' }, 400);
    }

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    await db.doc(`users/${uid}/data/unlock`).set({ levelsUnlocked: true }, { merge: true });

    let email = null;
    try {
      const userRecord = await admin.auth().getUser(uid);
      email = userRecord.email || null;
    } catch {}
    await db.collection('unlockedUsers').doc(uid).set(
      { uid, email, unlockedAt: new Date().toISOString() },
      { merge: true }
    );

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('verify-unlock', e);
    return jsonResponse({ error: e.message || 'Verification failed' }, 500);
  }
}
