import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked, isValidFirestoreDocId, getAppointmentFeePaise } from '../_lib.js';
import admin from 'firebase-admin';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** POST /api/apavarga/appointments/pay-order - Create payment order for ₹108. Body: { appointmentId } */
export async function POST(request) {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const firebaseUid = await verifyFirebaseUser(request);
    if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) {
      return jsonResponse({ error: 'Payment not configured (missing Cashfree keys)' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const { appointmentId } = body;
    if (!appointmentId || !isValidFirestoreDocId(appointmentId)) return jsonResponse({ error: 'appointmentId required' }, 400);

    const snap = await db.collection('apavargaAppointments').doc(appointmentId).get();
    if (!snap.exists) return jsonResponse({ error: 'Appointment not found' }, 404);
    const data = snap.data();
    if (data.seekerUid !== firebaseUid) return jsonResponse({ error: 'Forbidden' }, 403);
    if (data.status !== 'accepted') return jsonResponse({ error: 'Appointment must be accepted by priest first' }, 400);

    let amountPaise;
    try {
      amountPaise = await getAppointmentFeePaise();
    } catch (err) {
      console.error('appointments-pay-order getAppointmentFeePaise', err);
      amountPaise = 10800;
    }
    amountPaise = Math.round(Number(amountPaise));
    if (!Number.isFinite(amountPaise) || amountPaise < 100) amountPaise = 10800;

    const orderId = `apav-apt-${appointmentId.slice(-12)}-${Date.now().toString(36).slice(-6)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
    const orderAmount = (amountPaise / 100).toFixed(2);

    let customerEmail = 'user@japam.digital';
    let customerName = 'User';
    try {
      const userRecord = await admin.auth().getUser(firebaseUid);
      customerEmail = userRecord.email || customerEmail;
      customerName = (userRecord.displayName || userRecord.email || data.seekerDisplayName || 'User').slice(0, 100);
    } catch {}

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://japam.digital';
    const baseUrl = (origin || '').replace(/\/$/, '');
    const returnUrl = `${baseUrl}/apavarga/?appointment_return=1&order_id={order_id}`;

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
          customer_id: firebaseUid.slice(-20),
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: '9999999999',
        },
        order_meta: { return_url: returnUrl },
        order_note: `Darshan appointment - ${data.templeName || 'Temple'}`,
      }),
    });

    const cfData = await res.json();
    if (!res.ok) {
      return jsonResponse({ error: cfData?.message || 'Cashfree error' }, res.status >= 500 ? 500 : 400);
    }

    const paymentSessionId = cfData?.payment_session_id;
    if (!paymentSessionId) return jsonResponse({ error: 'Invalid Cashfree response' }, 500);

    await db.collection('apavargaAppointments').doc(appointmentId).update({
      paymentOrderId: orderId,
      paymentOrderCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return jsonResponse({ orderId, paymentSessionId, amount: amountPaise }, 200);
  } catch (e) {
    console.error('appointments-pay-order', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
