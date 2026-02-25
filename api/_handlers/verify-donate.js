import crypto from 'crypto';
import admin from 'firebase-admin';
import { getDb, getRazorpay, jsonResponse, verifyFirebaseUser, isUserBlocked } from './_lib.js';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const LIFETIME_DONOR_PAISE = 5000000; // ₹50,000+ = Lifetime Donor

/** POST /api/verify-donate - Verify Razorpay donation and add to donors. Requires pro user. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (!RAZORPAY_KEY_SECRET) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, displayName } = body;
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
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const unlockedSnap = await db.collection('unlockedUsers').doc(uid).get();
    if (!unlockedSnap.exists) {
      return jsonResponse({ error: 'Pro member required to donate. Unlock the game first.' }, 403);
    }

    let amountPaise = 0;
    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.fetch(razorpay_order_id);
      amountPaise = order?.amount ? Number(order.amount) : 0;
    } catch (err) {
      console.error('verify-donate fetch order', err?.message || err);
    }

    let name = displayName || '';
    if (!name) {
      try {
        const userRecord = await admin.auth().getUser(uid);
        name = userRecord.displayName || userRecord.email || uid.slice(0, 12);
      } catch {
        name = uid.slice(0, 12);
      }
    }

    const orderId = razorpay_order_id;
    const paymentId = razorpay_payment_id;
    const lifetimeDonor = amountPaise >= LIFETIME_DONOR_PAISE;
    await db.collection('donors').doc(uid).set(
      { uid, displayName: String(name).trim() || 'Anonymous', amount: amountPaise, lifetimeDonor, donatedAt: new Date().toISOString(), orderId, paymentId },
      { merge: true }
    );

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('verify-donate', e);
    return jsonResponse({ error: e?.message || 'Verification failed' }, 500);
  }
}
