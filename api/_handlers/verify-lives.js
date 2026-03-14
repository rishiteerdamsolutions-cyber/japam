import { getDb, jsonResponse, verifyFirebaseUser, logAudit } from './_lib.js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
const MAX_LIVES = 5;

export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { order_id } = body;
    if (!order_id || !String(order_id).startsWith('japam-lives-')) {
      return jsonResponse({ error: 'Invalid order_id' }, 400);
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
    if (!res.ok) return jsonResponse({ error: data?.message || 'Verification failed' }, 400);
    if (data?.order_status !== 'PAID') return jsonResponse({ error: 'Payment not completed' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const ref = db.doc(`users/${uid}/data/lives`);
    const snap = await ref.get();
    const now = Date.now();
    let lives = MAX_LIVES;
    let lastRefillAt = now;

    if (snap.exists) {
      const d = snap.data();
      lives = typeof d.lives === 'number' ? Math.min(MAX_LIVES, Math.max(0, d.lives)) : 0;
      const ts = d.lastRefillAt;
      lastRefillAt = ts?.toMillis ? ts.toMillis() : (typeof ts === 'number' ? ts : now);
    }

    const newLives = Math.min(MAX_LIVES, lives + 5);
    await ref.set({ lives: newLives, lastRefillAt: new Date(lastRefillAt) }, { merge: true });

    await logAudit('payment_lives_verified', { uid, orderId: order_id, livesGranted: 5 });
    return jsonResponse({ ok: true, lives: newLives });
  } catch (e) {
    console.error('verify-lives', e);
    return jsonResponse({ error: e?.message || 'Verification failed' }, 500);
  }
}
