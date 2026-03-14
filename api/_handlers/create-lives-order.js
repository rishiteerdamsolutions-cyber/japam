import { getDb, getLivesPricePaise, jsonResponse } from './_lib.js';
import admin from 'firebase-admin';

const LIVES_PRICE_PAISE = 1900;
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    if (!userId) return jsonResponse({ error: 'userId required' }, 400);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured (missing Cashfree keys)' }, 503);
    }

    let amountPaise;
    try {
      amountPaise = await getLivesPricePaise();
    } catch {
      amountPaise = LIVES_PRICE_PAISE;
    }
    amountPaise = Math.round(Number(amountPaise));
    if (!Number.isFinite(amountPaise) || amountPaise < 100) amountPaise = LIVES_PRICE_PAISE;

    getDb();
    const orderId = `japam-lives-${String(userId).slice(-12)}-${Date.now().toString(36).slice(-6)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
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
    const returnUrl = `${baseUrl}/?payment_return=lives&order_id={order_id}`;

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
        order_note: 'Japam 5 Lives',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return jsonResponse({ error: data?.message || 'Cashfree error' }, res.status >= 500 ? 500 : 400);
    }

    const paymentSessionId = data?.payment_session_id;
    if (!paymentSessionId) return jsonResponse({ error: 'Invalid Cashfree response' }, 500);

    return jsonResponse({ orderId, paymentSessionId, amount: amountPaise });
  } catch (e) {
    console.error('create-lives-order', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
