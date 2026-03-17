import { getDb, jsonResponse, verifyFirebaseUser, logAudit } from '../_lib.js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

/** POST /api/apavarga/appointments/pay-verify - Verify payment and confirm appointment. Body: { order_id } */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { order_id } = body;
    if (!order_id || !String(order_id).startsWith('apav-apt-')) {
      return jsonResponse({ error: 'Invalid order_id' }, 400);
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
    if (!res.ok) return jsonResponse({ error: data?.message || 'Verification failed' }, 400);
    if (data?.order_status !== 'PAID') return jsonResponse({ error: 'Payment not completed' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const aptSnap = await db.collection('apavargaAppointments')
      .where('paymentOrderId', '==', order_id)
      .limit(1)
      .get();

    if (aptSnap.empty) return jsonResponse({ error: 'Appointment not found for this order' }, 404);
    const aptDoc = aptSnap.docs[0];
    const aptData = aptDoc.data();
    if (aptData.seekerUid !== uid) return jsonResponse({ error: 'Forbidden' }, 403);
    if (aptData.status === 'confirmed') return jsonResponse({ ok: true, status: 'confirmed' }, 200);

    const now = new Date().toISOString();
    await aptDoc.ref.update({
      status: 'confirmed',
      confirmedAt: now,
      paymentOrderId: order_id,
      paymentVerifiedAt: now,
      updatedAt: now,
    });

    await logAudit('payment_appointment_verified', { uid, orderId: order_id, appointmentId: aptDoc.id });
    return jsonResponse({ ok: true, status: 'confirmed', appointmentId: aptDoc.id }, 200);
  } catch (e) {
    console.error('appointments-pay-verify', e);
    return jsonResponse({ error: e?.message || 'Verification failed' }, 500);
  }
}
