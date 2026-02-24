import crypto from 'crypto';
import { getDb, jsonResponse, verifyFirebaseUser } from './_lib.js';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (!RAZORPAY_KEY_SECRET) {
      return jsonResponse({ error: 'Payment not configured (missing RAZORPAY_KEY_SECRET)' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: 'Missing fields' }, 400);
    }
    const sigBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(sigBody).digest('hex');
    if (expected !== razorpay_signature) {
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    await db.doc(`users/${uid}/data/unlock`).set({ levelsUnlocked: true }, { merge: true });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('verify-unlock', e);
    return jsonResponse({ error: e.message || 'Verification failed' }, 500);
  }
}
