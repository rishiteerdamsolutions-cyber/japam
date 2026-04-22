import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError, getCashfreeNotifyUrl } from './_lib.js';
import admin from 'firebase-admin';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

/** Min ₹6000; amounts must be whole multiples of ₹6000 (600000 paise). */
const MIN_DONATION_PAISE = 600000;
const DONATION_STEP_PAISE = 600000;
const MAX_DONATION_PAISE = 10000000; // ₹100,000 cap per order

/** POST /api/donate-order - Create Cashfree order for donation. Body: { userId, amountPaise }. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await request.json().catch(() => ({}));
    const { userId, amountPaise } = body;
    if (!userId) return jsonResponse({ error: 'userId required' }, 400);
    if (userId !== uid) return jsonResponse({ error: 'userId must match authenticated user' }, 403);

    const amount = Math.round(Number(amountPaise));
    if (!Number.isFinite(amount) || amount < MIN_DONATION_PAISE) {
      return jsonResponse({ error: 'Minimum donation is ₹6,000' }, 400);
    }
    if (amount % DONATION_STEP_PAISE !== 0) {
      return jsonResponse({ error: 'Donation must be a multiple of ₹6,000 (e.g. ₹6,000, ₹12,000, ₹18,000…)' }, 400);
    }
    if (amount > MAX_DONATION_PAISE) return jsonResponse({ error: 'Amount too large' }, 400);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    const db = getDb();
    const orderId = `japam-donate-${String(userId).slice(-12)}-${Date.now().toString(36).slice(-6)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
    const orderAmount = (amount / 100).toFixed(2);

    let customerEmail = 'user@japam.digital';
    let customerName = 'Donor';
    try {
      const userRecord = await admin.auth().getUser(userId);
      customerEmail = userRecord.email || customerEmail;
      customerName = (userRecord.displayName || userRecord.email || 'Donor').slice(0, 100);
    } catch {}

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://japam.digital';
    const baseUrl = origin.replace(/\/$/, '');
    const returnUrl = `${baseUrl}/?donate_return=1&order_id={order_id}`;
    const notifyUrl = getCashfreeNotifyUrl(request);

    const orderMeta = { return_url: returnUrl };
    if (notifyUrl) orderMeta.notify_url = notifyUrl;

    const res = await fetch(`${CASHFREE_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-version': '2023-08-01',
        'X-Client-Id': CASHFREE_APP_ID,
        'X-Client-Secret': CASHFREE_SECRET,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: parseFloat(orderAmount),
        order_currency: 'INR',
        customer_details: {
          customer_id: userId.slice(-20),
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: '9999999999',
        },
        order_meta: orderMeta,
        order_note: 'Japam Donation',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('donate-order Cashfree', res.status, data);
      if (res.status >= 500) {
        return jsonInternalServerError(new Error(`Cashfree ${res.status}`), 'donate-order-cashfree');
      }
      const msg =
        data?.message || data?.error?.message || 'Payment provider rejected the request';
      return jsonResponse({ error: msg }, 400);
    }

    const paymentSessionId = data?.payment_session_id;
    if (!paymentSessionId) {
      return jsonResponse({ error: 'Invalid Cashfree response' }, 500);
    }

    // Persist an orders/{orderId} row so the webhook handler can tell this is a
    // donation (not an unlock). The webhook is idempotent and guards on `status`.
    if (db) {
      try {
        await db.collection('orders').doc(orderId).set({
          uid: userId,
          purpose: 'donate',
          isDonation: true,
          amountPaise: amount,
          createdAt: new Date().toISOString(),
          status: 'created',
        });
      } catch (e) {
        console.error('donate-order: failed to write orders doc (non-fatal)', e?.message || e);
      }
    }

    // Use our order_id - Cashfree GET order API expects merchant order_id, not cf_order_id
    return jsonResponse({ orderId, paymentSessionId, amount });
  } catch (e) {
    console.error('donate-order', e);
    return jsonInternalServerError(e, 'api/_handlers/donate-order.js');
  }
}
