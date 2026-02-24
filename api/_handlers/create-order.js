import { getRazorpay, getUnlockPricePaise, jsonResponse, UNLOCK_PRICE_PAISE } from './_lib.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SIglcNEf6QAT2M';

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

    let amount;
    try {
      amount = await getUnlockPricePaise();
    } catch (err) {
      console.error('create-order getUnlockPricePaise', err);
      amount = UNLOCK_PRICE_PAISE;
    }
    amount = Math.round(Number(amount));
    if (!Number.isFinite(amount) || amount < 100) amount = UNLOCK_PRICE_PAISE;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('create-order: RAZORPAY_KEY_SECRET not set');
      return jsonResponse({ error: 'Payment not configured (missing RAZORPAY_KEY_SECRET)' }, 503);
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `japam-unlock-${userId}-${Date.now()}`,
    });
    return jsonResponse({ orderId: order.id, amount, keyId: RAZORPAY_KEY_ID });
  } catch (e) {
    const msg = getErrorMessage(e);
    console.error('create-order', e);
    return jsonResponse({ error: msg }, 500);
  }
}
