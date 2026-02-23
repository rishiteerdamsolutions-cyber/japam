import crypto from 'crypto';
import { getDb, jsonResponse } from './_lib.js';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'iDY2XaMKT5k22g39pOU27X1t';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: 'Missing fields' }, 400);
    }
    const sigBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(sigBody).digest('hex');
    if (expected !== razorpay_signature) {
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    await db.doc(`users/${userId}/data/unlock`).set({ levelsUnlocked: true });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('verify-unlock', e);
    return jsonResponse({ error: e.message || 'Verification failed' }, 500);
  }
}
