import admin from 'firebase-admin';
import { getDb, jsonResponse, verifyFirebaseUser } from './_lib.js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
const LIFETIME_DONOR_PAISE = 5000000;

/** POST /api/verify-donate - Verify Cashfree donation and add to donors. Requires pro user. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { order_id, displayName } = body;
    if (!order_id) return jsonResponse({ error: 'order_id required' }, 400);

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
      console.error('verify-donate Cashfree GET order', res.status, data);
      return jsonResponse({ error: data?.message || 'Failed to verify payment' }, 400);
    }

    if (data?.order_status !== 'PAID') {
      return jsonResponse({ error: 'Payment not completed' }, 400);
    }

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const unlockedSnap = await db.collection('unlockedUsers').doc(uid).get();
    if (!unlockedSnap.exists) {
      return jsonResponse({ error: 'Pro member required to donate. Unlock full access first.' }, 403);
    }

    const orderAmount = data?.order_amount;
    const amountPaise = typeof orderAmount === 'number' ? Math.round(orderAmount * 100) : 0;

    let name = displayName || '';
    if (!name) {
      try {
        const userRecord = await admin.auth().getUser(uid);
        name = userRecord.displayName || userRecord.email || uid.slice(0, 12);
      } catch {
        name = uid.slice(0, 12);
      }
    }

    const lifetimeDonor = amountPaise >= LIFETIME_DONOR_PAISE;
    await db.collection('donors').doc(uid).set(
      { uid, displayName: String(name).trim() || 'Anonymous', amount: amountPaise, lifetimeDonor, donatedAt: new Date().toISOString(), orderId: order_id, paymentId: order_id },
      { merge: true }
    );

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('verify-donate', e);
    return jsonResponse({ error: e?.message || 'Verification failed' }, 500);
  }
}
