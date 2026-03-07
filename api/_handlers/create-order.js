import { getDb, getUnlockPricePaise, jsonResponse, UNLOCK_PRICE_PAISE } from './_lib.js';
import admin from 'firebase-admin';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

function getErrorMessage(e) {
  if (!e) return 'Failed to create order';
  if (typeof e.message === 'string' && e.message) return e.message;
  if (e.error?.description) return e.error.description;
  if (e.description) return e.description;
  if (typeof e.error === 'string') return e.error;
  return 'Failed to create order';
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    if (!userId) return jsonResponse({ error: 'userId required' }, 400);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      console.error('create-order: CASHFREE_APP_ID or CASHFREE_SECRET not set');
      return jsonResponse({ error: 'Payment not configured (missing Cashfree keys)' }, 503);
    }

    let amountPaise;
    try {
      amountPaise = await getUnlockPricePaise();
    } catch (err) {
      console.error('create-order getUnlockPricePaise', err);
      amountPaise = UNLOCK_PRICE_PAISE;
    }
    amountPaise = Math.round(Number(amountPaise));
    if (!Number.isFinite(amountPaise) || amountPaise < 100) amountPaise = UNLOCK_PRICE_PAISE;

    getDb();
    const orderId = `japam-${String(userId).slice(-12)}-${Date.now().toString(36).slice(-6)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
    const orderAmount = (amountPaise / 100).toFixed(2);

    let customerEmail = 'user@japam.digital';
    let customerName = 'User';
    try {
      const userRecord = await admin.auth().getUser(userId);
      customerEmail = userRecord.email || customerEmail;
      customerName = (userRecord.displayName || userRecord.email || 'User').slice(0, 100);
    } catch {}

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://japam.digital';
    const baseUrl = origin.replace(/\/$/, '');
    const returnUrl = `${baseUrl}/?payment_return=1&order_id={order_id}`;

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
        order_meta: {
          return_url: returnUrl,
        },
        order_note: 'Japam Pro Unlock',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message || data?.error?.message || `Cashfree error: ${res.status}`;
      console.error('create-order Cashfree', res.status, data);
      return jsonResponse({ error: msg }, res.status >= 500 ? 500 : 400);
    }

    const paymentSessionId = data?.payment_session_id;
    if (!paymentSessionId) {
      console.error('create-order: no payment_session_id in response', data);
      return jsonResponse({ error: 'Invalid Cashfree response' }, 500);
    }

    // Use our order_id (merchant reference) - Cashfree GET order API expects this, not cf_order_id
    return jsonResponse({
      orderId,
      paymentSessionId,
      amount: amountPaise,
    });
  } catch (e) {
    const msg = getErrorMessage(e);
    console.error('create-order', e);
    return jsonResponse({ error: msg }, 500);
  }
}
