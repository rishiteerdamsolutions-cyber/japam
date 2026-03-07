import { getDb, jsonResponse } from './_lib.js';
import admin from 'firebase-admin';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

/** POST /api/donate-order - Create Cashfree order for donation. Body: { userId, amountPaise }. Amount min 100 paise. */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, amountPaise } = body;
    if (!userId) return jsonResponse({ error: 'userId required' }, 400);

    const amount = Math.round(Number(amountPaise));
    if (!Number.isFinite(amount) || amount < 100) {
      return jsonResponse({ error: 'Minimum donation is ₹1 (100 paise)' }, 400);
    }
    if (amount > 10000000) return jsonResponse({ error: 'Amount too large' }, 400);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    getDb();
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
        order_meta: { return_url: returnUrl },
        order_note: 'Japam Donation',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message || data?.error?.message || `Cashfree error: ${res.status}`;
      console.error('donate-order Cashfree', res.status, data);
      return jsonResponse({ error: msg }, res.status >= 500 ? 500 : 400);
    }

    const paymentSessionId = data?.payment_session_id;
    if (!paymentSessionId) {
      return jsonResponse({ error: 'Invalid Cashfree response' }, 500);
    }

    // Use our order_id - Cashfree GET order API expects merchant order_id, not cf_order_id
    return jsonResponse({ orderId, paymentSessionId, amount });
  } catch (e) {
    console.error('donate-order', e);
    return jsonResponse({ error: e?.message || 'Failed to create order' }, 500);
  }
}
