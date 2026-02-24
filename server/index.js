import 'dotenv/config';
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

const ADMIN_ID = process.env.ADMIN_ID || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.JWT_SECRET || 'change-me-in-production';

function createAdminToken() {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + 60 * 60 * 1000 });
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (payload.exp < Date.now()) return false;
    const expected = crypto.createHmac('sha256', ADMIN_SECRET).update(raw).digest('base64url');
    return sig === expected;
  } catch {
    return false;
  }
}

const DEFAULT_PRICE_PAISE = 1000; // ₹10

async function getUnlockPricePaise() {
  if (!db) return DEFAULT_PRICE_PAISE;
  try {
    const snap = await db.doc('config/pricing').get();
    const data = snap.data();
    const p = data?.unlockPricePaise;
    if (typeof p === 'number' && p >= 100) return Math.round(p);
  } catch (e) {
    console.error('getUnlockPricePaise', e);
  }
  return DEFAULT_PRICE_PAISE;
}

app.get('/api/price', async (req, res) => {
  try {
    const amount = await getUnlockPricePaise();
    res.json({ unlockPricePaise: amount });
  } catch (e) {
    console.error('get price', e);
    res.status(500).json({ unlockPricePaise: DEFAULT_PRICE_PAISE });
  }
});

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

app.post('/api/admin-login', (req, res) => {
  try {
    const { adminId, password } = req.body || {};
    if (!ADMIN_ID || !ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin not configured' });
    if (String(adminId).trim() !== ADMIN_ID || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Wrong Admin ID or password' });
    }
    const token = createAdminToken();
    res.json({ token });
  } catch (e) {
    console.error('admin-login', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

function getAdminToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return (req.body && req.body.token) || null;
}

app.post('/api/admin/set-price', async (req, res) => {
  try {
    const token = getAdminToken(req);
    if (!verifyAdminToken(token)) return res.status(401).json({ error: 'Invalid or expired session' });
    const unlockPricePaise = Math.round(Number(req.body?.unlockPricePaise));
    if (!Number.isFinite(unlockPricePaise) || unlockPricePaise < 100) {
      return res.status(400).json({ error: 'Invalid price (min 100 paise)' });
    }
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    await db.doc('config/pricing').set({ unlockPricePaise });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin set-price', e);
    res.status(500).json({ error: e.message || 'Failed to save' });
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
