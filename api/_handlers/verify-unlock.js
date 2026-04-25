import admin from 'firebase-admin';
import {
  getDb,
  jsonResponse,
  verifyFirebaseUser,
  logAudit,
  jsonInternalServerError,
  PRO_ACCESS_DURATION_MS,
  couponUserUsageId,
} from './_lib.js';

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

    const now = Date.now();
    const unlockedAtIso = new Date(now).toISOString();
    const unlockExpiresAtIso = new Date(now + PRO_ACCESS_DURATION_MS).toISOString();

    await db.doc(`users/${uid}/data/unlock`).set({
      levelsUnlocked: true,
      unlockedAt: unlockedAtIso,
      unlockExpiresAt: unlockExpiresAtIso,
    }, { merge: true });

    let email = null;
    try {
      const userRecord = await admin.auth().getUser(uid);
      email = userRecord.email || null;
    } catch {}
    await db.collection('unlockedUsers').doc(uid).set(
      { uid, email, unlockedAt: unlockedAtIso, unlockExpiresAt: unlockExpiresAtIso },
      { merge: true }
    );

    try {
      await db.collection('orders').doc(String(order_id)).set(
        { status: 'paid', fulfilledAt: unlockedAtIso, fulfilledVia: 'verify-unlock' },
        { merge: true },
      );
    } catch (e) {
      console.error('verify-unlock: order mark paid failed (non-fatal)', e?.message || e);
    }

    // If a coupon was attached to this order, atomically increment the global and per-user counters.
    // Idempotent: the same order_id can be verified twice (e.g. user refreshes), so we guard with a flag
    // on the order doc (`couponApplied: true`) and only increment once.
    try {
      const orderRef = db.collection('orders').doc(String(order_id));
      const orderSnap = await orderRef.get();
      const orderData = orderSnap.exists ? orderSnap.data() : null;
      const couponCode = orderData?.couponCode ? String(orderData.couponCode) : null;
      if (couponCode && orderData?.couponApplied !== true) {
        const couponRef = db.collection('coupons').doc(couponCode);
        const userUsageRef = db.collection('couponUserUsage').doc(couponUserUsageId(couponCode, uid));
        await db.runTransaction(async (tx) => {
          const [cSnap, uSnap, oSnap] = await Promise.all([
            tx.get(couponRef),
            tx.get(userUsageRef),
            tx.get(orderRef),
          ]);
          if (oSnap.exists && oSnap.data()?.couponApplied === true) return; // already applied
          if (!cSnap.exists) {
            tx.set(orderRef, { couponApplied: true, couponAppliedAt: unlockedAtIso }, { merge: true });
            return;
          }
          const cData = cSnap.data() || {};
          const used = typeof cData.usedCount === 'number' ? cData.usedCount : 0;
          const maxUses = typeof cData.maxUses === 'number' ? cData.maxUses : null;
          const prevUserCount = uSnap.exists ? (uSnap.data()?.count || 0) : 0;
          // We always flag the order as applied to avoid double-counting on retries.
          tx.set(orderRef, { couponApplied: true, couponAppliedAt: unlockedAtIso }, { merge: true });
          if (maxUses != null && used >= maxUses) {
            // Payment already cleared; don't refund — just skip incrementing, log a warning.
            return;
          }
          tx.update(couponRef, { usedCount: used + 1, lastUsedAt: unlockedAtIso });
          tx.set(userUsageRef, {
            code: couponCode,
            uid,
            count: prevUserCount + 1,
            lastUsedAt: unlockedAtIso,
            firstUsedAt: uSnap.exists ? (uSnap.data()?.firstUsedAt || unlockedAtIso) : unlockedAtIso,
          }, { merge: true });
        });
        await db.collection('couponRedemptions').add({
          code: couponCode,
          uid,
          orderId: order_id,
          percentOff: orderData?.couponPercentOff ?? null,
          basePricePaise: orderData?.basePricePaise ?? null,
          chargedPaise: orderData?.chargedPaise ?? null,
          createdAt: unlockedAtIso,
          source: 'order',
        });
      }
    } catch (e) {
      console.error('verify-unlock coupon usage increment failed (non-fatal)', e?.message || e);
    }

    await logAudit('payment_unlock_verified', { uid, orderId: order_id });
    return jsonResponse({ ok: true, unlockExpiresAt: unlockExpiresAtIso });
  } catch (e) {
    console.error('verify-unlock', e);
    return jsonInternalServerError(e, 'api/_handlers/verify-unlock.js');
  }
}
