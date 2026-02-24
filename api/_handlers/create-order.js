import { getRazorpay, getUnlockPricePaise, jsonResponse } from './_lib.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SIglcNEf6QAT2M';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    if (!userId) return jsonResponse({ error: 'userId required' }, 400);
    const amount = await getUnlockPricePaise();
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `japam-unlock-${userId}-${Date.now()}`,
    });
    return jsonResponse({ orderId: order.id, amount, keyId: RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('create-order', e);
    return jsonResponse({ error: e.message || 'Failed to create order' }, 500);
  }
}
