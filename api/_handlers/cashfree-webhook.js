/**
 * Cashfree webhook receiver (production hardening).
 *
 * Why this exists:
 *   `verify-unlock` only runs when the user's browser returns to the site after
 *   a Cashfree payment. If the user closes the tab, drops connectivity, or
 *   their battery dies between "paid" and "redirect back", we never unlock
 *   their account — they are charged but get nothing.
 *
 * What this does:
 *   Cashfree calls this endpoint server-to-server as soon as the payment
 *   status changes. We verify the signature, look up the order we created
 *   in `create-order.js` or `donate-order.js`, and run the same unlock /
 *   donation recording logic that the user-return path does. This path is
 *   fully idempotent — duplicate events are a no-op.
 *
 * Route: POST /api/cashfree-webhook
 *
 * Env vars:
 *   CASHFREE_WEBHOOK_SECRET   (preferred) — value you see in Cashfree
 *                              Dashboard → Developers → Webhooks when you
 *                              create the endpoint. If not set, we fall back
 *                              to CASHFREE_SECRET which also works for many
 *                              accounts. Set both to be safe.
 *
 * Register in Cashfree Dashboard:
 *   URL:     https://japam.digital/api/cashfree-webhook
 *   Events:  PAYMENT_SUCCESS_WEBHOOK  (and optionally PAYMENT_FAILED_WEBHOOK,
 *            PAYMENT_USER_DROPPED_WEBHOOK — we log them but do not act)
 *   Version: 2023-08-01 (or whatever matches the "x-api-version" you use in
 *            create-order.js / verify-unlock.js)
 */

import admin from 'firebase-admin';
import crypto from 'crypto';
import {
  getDb,
  jsonResponse,
  logAudit,
  PRO_ACCESS_DURATION_MS,
  couponUserUsageId,
  getUserUnlockInfo,
  PREMIUM_BASE_AMOUNT_PAISE,
  PREMIUM_ACCESS_DURATION_MS,
  premiumYearsFromTotalPaise,
} from './_lib.js';

const CASHFREE_WEBHOOK_SECRET =
  process.env.CASHFREE_WEBHOOK_SECRET ||
  process.env.CASHFREE_SECRET ||
  process.env.CASHFREE_CLIENT_SECRET ||
  '';

const LIFETIME_DONOR_PAISE = 5000000; // kept in sync with verify-donate.js

/** Cashfree v2 signature: base64( HMAC-SHA256(timestamp + rawBody, secret) ) */
function computeSignature(timestamp, rawBody, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(String(timestamp) + rawBody)
    .digest('base64');
}

function timingSafeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function handleUnlockPaid(db, orderId, uid, nowIso, orderData) {
  // Mirror verify-unlock.js so both paths converge on the same docs.
  const unlockExpiresAtIso = new Date(Date.parse(nowIso) + PRO_ACCESS_DURATION_MS).toISOString();

  await db.doc(`users/${uid}/data/unlock`).set(
    { levelsUnlocked: true, unlockedAt: nowIso, unlockExpiresAt: unlockExpiresAtIso },
    { merge: true },
  );

  let email = null;
  try {
    const userRecord = await admin.auth().getUser(uid);
    email = userRecord.email || null;
  } catch {}

  await db.collection('unlockedUsers').doc(uid).set(
    { uid, email, unlockedAt: nowIso, unlockExpiresAt: unlockExpiresAtIso },
    { merge: true },
  );

  // Apply the coupon counters atomically, guarded by `couponApplied` on the order doc.
  const couponCode = orderData?.couponCode ? String(orderData.couponCode) : null;
  if (couponCode && orderData?.couponApplied !== true) {
    const orderRef = db.collection('orders').doc(String(orderId));
    const couponRef = db.collection('coupons').doc(couponCode);
    const userUsageRef = db.collection('couponUserUsage').doc(couponUserUsageId(couponCode, uid));
    try {
      await db.runTransaction(async (tx) => {
        const [cSnap, uSnap, oSnap] = await Promise.all([
          tx.get(couponRef),
          tx.get(userUsageRef),
          tx.get(orderRef),
        ]);
        if (oSnap.exists && oSnap.data()?.couponApplied === true) return;
        tx.set(orderRef, { couponApplied: true, couponAppliedAt: nowIso }, { merge: true });
        if (!cSnap.exists) return;
        const cData = cSnap.data() || {};
        const used = typeof cData.usedCount === 'number' ? cData.usedCount : 0;
        const maxUses = typeof cData.maxUses === 'number' ? cData.maxUses : null;
        const prevUserCount = uSnap.exists ? (uSnap.data()?.count || 0) : 0;
        if (maxUses != null && used >= maxUses) return;
        tx.update(couponRef, { usedCount: used + 1, lastUsedAt: nowIso });
        tx.set(
          userUsageRef,
          {
            code: couponCode,
            uid,
            count: prevUserCount + 1,
            lastUsedAt: nowIso,
            firstUsedAt: uSnap.exists ? (uSnap.data()?.firstUsedAt || nowIso) : nowIso,
          },
          { merge: true },
        );
      });
      await db.collection('couponRedemptions').add({
        code: couponCode,
        uid,
        orderId,
        percentOff: orderData?.couponPercentOff ?? null,
        basePricePaise: orderData?.basePricePaise ?? null,
        chargedPaise: orderData?.chargedPaise ?? null,
        createdAt: nowIso,
        source: 'webhook',
      });
    } catch (e) {
      console.error('cashfree-webhook coupon increment failed (non-fatal)', e?.message || e);
    }
  }

  // Mark the order itself as fulfilled so repeated webhooks are a no-op.
  await db.collection('orders').doc(String(orderId)).set(
    { status: 'paid', fulfilledAt: nowIso, fulfilledVia: 'webhook' },
    { merge: true },
  );
}

async function handleDonationPaid(db, orderId, uid, nowIso, amountPaise) {
  // Mirror verify-donate.js. Donations require *active monthly Pro* at donation time.
  const unlockInfo = await getUserUnlockInfo(db, uid);
  if (!unlockInfo.isActive) {
    await logAudit('cashfree_webhook_donation_without_active_pro', { uid, orderId });
    return;
  }
  let name = '';
  try {
    const userRecord = await admin.auth().getUser(uid);
    name = userRecord.displayName || userRecord.email || uid.slice(0, 12);
  } catch {
    name = uid.slice(0, 12);
  }
  const donorRef = db.collection('donors').doc(uid);
  const nowMs = Date.now();
  const lifetimeDonor = amountPaise >= LIFETIME_DONOR_PAISE;
  const donorSnap = await donorRef.get();
  const prev = donorSnap.exists ? (donorSnap.data() || {}) : {};
  const prevTotal = typeof prev.totalAmountPaise === 'number'
    ? prev.totalAmountPaise
    : (typeof prev.amount === 'number' ? prev.amount : 0);
  const newTotal = Math.max(0, Math.round(prevTotal)) + Math.max(0, Math.round(amountPaise));

  const prevStartedAtMs = typeof prev.premiumStartedAt === 'string' ? Date.parse(prev.premiumStartedAt) : NaN;
  const prevExpiresAtMs = typeof prev.premiumExpiresAt === 'string' ? Date.parse(prev.premiumExpiresAt) : NaN;
  const hadActivePremium = Number.isFinite(prevExpiresAtMs) && nowMs < prevExpiresAtMs;
  const premiumStartedAtMs = hadActivePremium && Number.isFinite(prevStartedAtMs) ? prevStartedAtMs : nowMs;

  const premiumYears = premiumYearsFromTotalPaise(newTotal);
  const premiumExpiresAtMs = premiumYears ? premiumStartedAtMs + premiumYears * PREMIUM_ACCESS_DURATION_MS : null;

  await donorRef.set(
    {
      uid,
      displayName: String(name).trim() || 'Anonymous',
      totalAmountPaise: newTotal,
      amount: newTotal,
      lifetimeDonor: lifetimeDonor || prev.lifetimeDonor === true,
      donatedAt: nowIso,
      orderId,
      paymentId: orderId,
      premiumStartedAt: premiumYears ? new Date(premiumStartedAtMs).toISOString() : null,
      premiumExpiresAt: premiumExpiresAtMs ? new Date(premiumExpiresAtMs).toISOString() : null,
      premiumYears: premiumYears || null,
      premiumEligible: newTotal >= PREMIUM_BASE_AMOUNT_PAISE,
    },
    { merge: true },
  );
}

export async function POST(request) {
  // Always return 200 to Cashfree for events we *processed* (even no-ops), so
  // they stop retrying. Return 4xx only for invalid signatures / malformed
  // payloads so the retry mechanism surfaces the problem.
  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ error: 'Invalid body' }, 400);
  }

  if (!CASHFREE_WEBHOOK_SECRET) {
    console.error('cashfree-webhook: no CASHFREE_WEBHOOK_SECRET/CASHFREE_SECRET set — rejecting');
    return jsonResponse({ error: 'Webhook not configured' }, 503);
  }

  const timestamp =
    request.headers.get('x-webhook-timestamp') ||
    request.headers.get('X-Webhook-Timestamp') ||
    '';
  const receivedSignature =
    request.headers.get('x-webhook-signature') ||
    request.headers.get('X-Webhook-Signature') ||
    '';
  if (!timestamp || !receivedSignature) {
    await logAudit('cashfree_webhook_missing_headers', {});
    return jsonResponse({ error: 'Missing webhook headers' }, 400);
  }

  const expected = computeSignature(timestamp, rawBody, CASHFREE_WEBHOOK_SECRET);
  if (!timingSafeEq(expected, receivedSignature)) {
    await logAudit('cashfree_webhook_bad_signature', { timestamp });
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  // Reject events older than 10 minutes to make replay attacks harder.
  const tsMs = Number(timestamp) * (String(timestamp).length > 10 ? 1 : 1000);
  if (Number.isFinite(tsMs) && Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) {
    await logAudit('cashfree_webhook_stale_timestamp', { timestamp });
    return jsonResponse({ error: 'Stale webhook' }, 400);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Malformed JSON' }, 400);
  }

  const eventType = payload?.type || payload?.event || '';
  const data = payload?.data || {};
  const order = data?.order || {};
  const payment = data?.payment || {};
  const orderId = order?.order_id || payment?.order_id || '';
  const orderStatus =
    payment?.payment_status ||
    order?.order_status ||
    '';

  // Non-paid events are informational — log and ack so Cashfree stops retrying.
  if (eventType && eventType !== 'PAYMENT_SUCCESS_WEBHOOK' && orderStatus !== 'SUCCESS' && orderStatus !== 'PAID') {
    await logAudit('cashfree_webhook_non_success', { eventType, orderId, orderStatus });
    return jsonResponse({ ok: true, ignored: true });
  }

  if (!orderId) {
    await logAudit('cashfree_webhook_no_order_id', { eventType });
    return jsonResponse({ error: 'No order_id' }, 400);
  }

  const db = getDb();
  if (!db) {
    // Return 503 so Cashfree retries; do not lose the event.
    return jsonResponse({ error: 'Database not configured' }, 503);
  }

  try {
    const orderRef = db.collection('orders').doc(String(orderId));
    const orderSnap = await orderRef.get();
    const orderData = orderSnap.exists ? orderSnap.data() : null;
    const nowIso = new Date().toISOString();

    // Idempotency: skip if we already fulfilled this order via either path.
    if (orderData?.status === 'paid' || orderData?.fulfilledAt) {
      return jsonResponse({ ok: true, duplicate: true });
    }

    // Unlock orders are the ones `create-order.js` wrote. Donation orders are
    // written by `donate-order.js`. We distinguish by presence of a `purpose`
    // field if set, otherwise by the presence of `couponCode` / base price
    // (unlock) vs just an amount (donate).
    const amountPaise = Math.round(Number(order?.order_amount || 0) * 100);
    const uid =
      orderData?.uid ||
      payment?.customer_details?.customer_id ||
      order?.customer_details?.customer_id ||
      '';

    const purpose = orderData?.purpose || (orderData?.isDonation ? 'donate' : 'unlock');

    if (!uid) {
      await logAudit('cashfree_webhook_no_uid', { orderId });
      // Ack to stop retries — nothing more we can do without a uid.
      return jsonResponse({ ok: true, ignored: 'no-uid' });
    }

    if (purpose === 'donate') {
      await handleDonationPaid(db, orderId, uid, nowIso, amountPaise);
      await logAudit('cashfree_webhook_donation_ok', { uid, orderId, amountPaise });
    } else {
      await handleUnlockPaid(db, orderId, uid, nowIso, orderData);
      await logAudit('cashfree_webhook_unlock_ok', { uid, orderId, amountPaise });
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('cashfree-webhook', e?.message || e);
    // 500 so Cashfree retries — the event is not lost.
    return jsonResponse({ error: 'Webhook processing failed' }, 500);
  }
}
