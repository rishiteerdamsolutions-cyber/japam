import { getRazorpay, jsonResponse } from './_lib.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SIglcNEf6QAT2M';

/** POST /api/donate-order - Create Razorpay order for donation. Body: { userId, amountPaise }. Amount min 100 paise. */
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

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    const razorpay = getRazorpay();
    const receipt = `japam-donate-${String(userId).slice(-12)}-${Date.now().toString(36).slice(-6)}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
    });
    return jsonResponse({ orderId: order.id, amount, keyId: RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('donate-order', e);
    return jsonResponse({ error: e?.message || 'Failed to create order' }, 500);
  }
}
