import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import admin from 'firebase-admin';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SIglcNEf6QAT2M';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'iDY2XaMKT5k22g39pOU27X1t';

let db = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
  } catch (e) {
    console.error('Firebase init failed:', e.message);
  }
}

const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

async function getUnlockPricePaise() {
  if (!db) return 9900;
  const snap = await db.doc('config/pricing').get();
  const data = snap.data();
  return data?.unlockPricePaise ?? 9900;
}

app.post('/api/create-order', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).send('userId required');
    const amount = await getUnlockPricePaise();
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `japam-unlock-${userId}-${Date.now()}`
    });
    res.json({ orderId: order.id, amount, keyId: RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('create-order', e);
    res.status(500).send(e.message || 'Failed to create order');
  }
});

app.post('/api/verify-unlock', async (req, res) => {
  try {
    const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).send('Missing fields');
    }
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).send('Invalid signature');
    if (!db) return res.status(503).send('Database not configured');
    await db.doc(`users/${userId}/data/unlock`).set({ levelsUnlocked: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('verify-unlock', e);
    res.status(500).send(e.message || 'Verification failed');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Japam API on port ${PORT}`));
