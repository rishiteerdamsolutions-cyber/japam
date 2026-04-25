import admin from 'firebase-admin';
import {
  getDb,
  jsonResponse,
  verifyFirebaseUser,
  logAudit,
  jsonInternalServerError,
  getUserUnlockInfo,
  PREMIUM_BASE_AMOUNT_PAISE,
  PREMIUM_ACCESS_DURATION_MS,
  premiumYearsFromTotalPaise,
} from './_lib.js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
const LIFETIME_DONOR_PAISE = 5000000;
const MIN_DONATION_PAISE = 600000;
const DONATION_STEP_PAISE = 600000;

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

    // Donation is only allowed while monthly Pro is active (not after expiry, and not by premium-only status).
    const unlockInfo = await getUserUnlockInfo(db, uid);
    if (!unlockInfo.isActive) {
      return jsonResponse({ error: 'Pro member required to donate. Unlock full access first.' }, 403);
    }

    const orderAmount = data?.order_amount;
    const amountPaise = typeof orderAmount === 'number' ? Math.round(orderAmount * 100) : 0;

    if (amountPaise < MIN_DONATION_PAISE || amountPaise % DONATION_STEP_PAISE !== 0) {
      return jsonResponse({ error: 'Invalid donation amount for this order' }, 400);
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

    const donorRef = db.collection('donors').doc(uid);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const lifetimeDonor = amountPaise >= LIFETIME_DONOR_PAISE;

    // Premium window derives from total donations (₹6000 => 1y, ₹12000 => 2y, ₹24000 => 3y...).
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
        amount: newTotal, // legacy field used by some admin views
        lifetimeDonor: lifetimeDonor || prev.lifetimeDonor === true,
        donatedAt: nowIso,
        orderId: order_id,
        paymentId: order_id,
        premiumStartedAt: premiumYears ? new Date(premiumStartedAtMs).toISOString() : null,
        premiumExpiresAt: premiumExpiresAtMs ? new Date(premiumExpiresAtMs).toISOString() : null,
        premiumYears: premiumYears || null,
        premiumEligible: newTotal >= PREMIUM_BASE_AMOUNT_PAISE,
      },
      { merge: true }
    );

    try {
      await db.collection('orders').doc(String(order_id)).set(
        { status: 'paid', fulfilledAt: nowIso, fulfilledVia: 'verify-donate' },
        { merge: true },
      );
    } catch (e) {
      console.error('verify-donate: order mark paid failed (non-fatal)', e?.message || e);
    }

    await logAudit('donation_verified', { uid, orderId: order_id, amountPaise });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('verify-donate', e);
    return jsonInternalServerError(e, 'api/_handlers/verify-donate.js');
  }
}
