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
const PRIEST_SECRET = process.env.PRIEST_SECRET || ADMIN_SECRET;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!password || !stored || typeof stored !== 'string') return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return derived === hash;
  } catch {
    return false;
  }
}

function validatePriestUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const u = username.trim();
  return /^pujari@[a-zA-Z0-9_-]+$/.test(u) && u.length >= 12 && u.length <= 50;
}

function validatePriestPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 10 || password.length > 20) return false;
  const caps = (password.match(/[A-Z]/g) || []).length;
  const digits = (password.match(/[0-9]/g) || []).length;
  const small = (password.match(/[a-z]/g) || []).length;
  const symbols = (password.match(/[^A-Za-z0-9]/g) || []).length;
  return caps >= 2 && digits >= 2 && small >= 2 && symbols >= 2;
}

function createPriestToken(templeId, templeName) {
  const payload = JSON.stringify({ templeId, templeName, priest: true, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const raw = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', PRIEST_SECRET).update(raw).digest('base64url');
  return raw + '.' + sig;
}

function createAdminToken() {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + 60 * 60 * 1000 });
  const raw = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(raw).digest('base64url');
  return raw + '.' + sig;
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
const DEFAULT_DISPLAY_PAISE = 9900; // ₹99 strikethrough

async function getPricing() {
  if (!db) return { unlockPricePaise: DEFAULT_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PAISE };
  try {
    const snap = await db.doc('config/pricing').get();
    const data = snap.data();
    const unlock = data?.unlockPricePaise;
    const display = data?.displayPricePaise;
    return {
      unlockPricePaise: typeof unlock === 'number' && unlock >= 100 ? Math.round(unlock) : DEFAULT_PRICE_PAISE,
      displayPricePaise: typeof display === 'number' && display >= 100 ? Math.round(display) : DEFAULT_DISPLAY_PAISE,
    };
  } catch (e) {
    console.error('getPricing', e);
    return { unlockPricePaise: DEFAULT_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PAISE };
  }
}

async function getUnlockPricePaise() {
  const { unlockPricePaise } = await getPricing();
  return unlockPricePaise;
}

app.get('/api/price', async (req, res) => {
  try {
    const pricing = await getPricing();
    res.json(pricing);
  } catch (e) {
    console.error('get price', e);
    res.status(500).json({ unlockPricePaise: DEFAULT_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PAISE });
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
    const displayPricePaise = Math.round(Number(req.body?.displayPricePaise ?? 9900));
    const safeDisplay = Number.isFinite(displayPricePaise) && displayPricePaise >= 100 ? displayPricePaise : 9900;
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    await db.doc('config/pricing').set({ unlockPricePaise, displayPricePaise: safeDisplay }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin set-price', e);
    res.status(500).json({ error: e.message || 'Failed to save' });
  }
});

app.post('/api/priest/link', async (req, res) => {
  try {
    const { userId, priestUsername, priestPassword } = req.body || {};
    if (!userId?.trim() || !priestUsername?.trim() || !priestPassword) {
      return res.status(400).json({ error: 'userId, priestUsername and priestPassword required' });
    }
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const snap = await db.collection('temples').where('priestUsername', '==', priestUsername.trim()).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Invalid username or password' });
    const doc = snap.docs[0];
    const data = doc.data();
    const templeId = doc.id;
    const templeName = data.name || '';
    if (!verifyPassword(priestPassword, data.priestPasswordHash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    await doc.ref.update({ priestUserId: userId.trim() });
    const token = createPriestToken(templeId, templeName);
    res.json({ ok: true, token, templeId, templeName });
  } catch (e) {
    console.error('priest link', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/priest-login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const snap = await db.collection('temples').where('priestUsername', '==', username.trim()).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const doc = snap.docs[0];
    const data = doc.data();
    const templeId = doc.id;
    const templeName = data.name || '';
    if (!verifyPassword(password, data.priestPasswordHash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = createPriestToken(templeId, templeName);
    res.json({ token, templeId, templeName });
  } catch (e) {
    console.error('priest-login', e);
    res.status(500).json({ error: e.message || 'Login failed' });
  }
});

function generatePriestUsername(templeName) {
  const slug = (templeName || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 30) || 'temple';
  const base = `pujari@${slug}`;
  return base.length >= 12 && base.length <= 50 ? base : `pujari@${slug}-${Date.now().toString(36).slice(-4)}`;
}

function generatePriestPassword() {
  const caps = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const small = 'abcdefghjkmnpqrstuvwxyz';
  const symbols = '@!#$%&*';
  const pick = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
  const parts = [pick(caps, 2), pick(digits, 2), pick(small, 2), pick(symbols, 2)];
  const rest = pick(caps + digits + small + symbols, 4);
  return [...parts.join(''), ...rest].sort(() => Math.random() - 0.5).join('');
}

app.post('/api/admin/create-temple', async (req, res) => {
  try {
    const token = getAdminToken(req);
    if (!verifyAdminToken(token)) return res.status(401).json({ error: 'Invalid or expired session' });
    const { state, district, cityTownVillage, area, templeName } = req.body || {};
    if (!state || !district || !cityTownVillage || !area?.trim() || !templeName?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const name = templeName.trim();
    let priestUsername = generatePriestUsername(name);
    let priestPassword = generatePriestPassword();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.collection('temples').where('priestUsername', '==', priestUsername).limit(1).get();
      if (existing.empty) break;
      priestUsername = generatePriestUsername(name + '-' + attempts);
      attempts++;
    }
    const priestPasswordHash = hashPassword(priestPassword);
    const temple = {
      name,
      state,
      district,
      cityTownVillage,
      area: area.trim(),
      priestUsername,
      priestPasswordHash,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('temples').add(temple);
    res.json({ ok: true, templeId: docRef.id, priestUsername, priestPassword });
  } catch (e) {
    console.error('admin create-temple', e);
    res.status(500).json({ error: e.message || 'Failed to create temple' });
  }
});

app.get('/api/admin/marathons', async (req, res) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!verifyAdminToken(token)) return res.status(401).json({ error: 'Invalid or expired session' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const marathonsSnap = await db.collection('marathons').get();
    const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };
    const marathons = [];
    for (const d of marathonsSnap.docs) {
      const data = d.data();
      const templeSnap = await db.doc(`temples/${data.templeId}`).get();
      const temple = templeSnap.exists ? templeSnap.data() : null;
      const participationsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
      const participants = participationsSnap.docs.map((p) => {
        const pData = p.data();
        return { userId: pData.userId, displayName: (pData.userId || '').slice(0, 12) || '—', japasCount: pData.japasCount ?? 0 };
      });
      participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
      marathons.push({
        id: d.id,
        templeId: data.templeId,
        templeName: temple?.name || '—',
        priestUsername: temple?.priestUsername || '—',
        deityId: data.deityId,
        deityName: DEITY_NAMES[data.deityId] || data.deityId,
        targetJapas: data.targetJapas,
        startDate: data.startDate,
        joinedCount: data.joinedCount ?? 0,
        topParticipants: participants.slice(0, 10),
      });
    }
    marathons.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    res.json({ marathons });
  } catch (e) {
    console.error('admin marathons', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/list-temples', async (req, res) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.query.token || null;
    if (!verifyAdminToken(token)) return res.status(401).json({ error: 'Invalid or expired session' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const snap = await db.collection('temples').orderBy('createdAt', 'desc').get();
    const temples = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      state: d.data().state,
      district: d.data().district,
      cityTownVillage: d.data().cityTownVillage,
      area: d.data().area,
      priestUsername: d.data().priestUsername,
    }));
    res.json({ temples });
  } catch (e) {
    console.error('admin list-temples', e);
    res.status(500).json({ error: e.message || 'Failed to list temples' });
  }
});

app.get('/api/priest/marathons', async (req, res) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    const priest = verifyPriestToken(token);
    if (!priest) return res.status(401).json({ error: 'Invalid or expired session' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const snap = await db.collection('marathons').where('templeId', '==', priest.templeId).get();
    const marathons = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, templeId: data.templeId, deityId: data.deityId, targetJapas: data.targetJapas, startDate: data.startDate, joinedCount: data.joinedCount ?? 0, japasToday: data.japasToday ?? 0, totalJapas: data.totalJapas ?? 0 };
    }).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    res.json({ marathons });
  } catch (e) {
    console.error('priest marathons', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/priest/marathons', async (req, res) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    const priest = verifyPriestToken(token);
    if (!priest) return res.status(401).json({ error: 'Invalid or expired session' });
    const { deityId, targetJapas, startDate } = req.body || {};
    if (!deityId || !targetJapas || !startDate) return res.status(400).json({ error: 'deityId, targetJapas, startDate required' });
    const target = Math.round(Number(targetJapas));
    if (!Number.isFinite(target) || target < 1) return res.status(400).json({ error: 'targetJapas must be positive' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const marathon = { templeId: priest.templeId, deityId, targetJapas: target, startDate, joinedCount: 0, japasToday: 0, totalJapas: 0, createdAt: new Date().toISOString() };
    const docRef = await db.collection('marathons').add(marathon);
    res.json({ ok: true, marathonId: docRef.id });
  } catch (e) {
    console.error('priest create marathon', e);
    res.status(500).json({ error: e.message });
  }
});

function verifyPriestToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (payload.exp < Date.now() || !payload.templeId) return null;
    const expected = crypto.createHmac('sha256', PRIEST_SECRET).update(raw).digest('base64url');
    if (sig !== expected) return null;
    return { templeId: payload.templeId, templeName: payload.templeName || '' };
  } catch {
    return null;
  }
}

app.get('/api/marathons/discover', async (req, res) => {
  try {
    const { state, district, cityTownVillage } = req.query;
    if (!db) return res.json({ temples: [], marathonsByTemple: {} });
    const templesSnap = await db.collection('temples').get();
    let temples = templesSnap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, name: data.name, state: data.state, district: data.district, cityTownVillage: data.cityTownVillage, area: data.area };
    });
    if (state) temples = temples.filter((t) => t.state === state);
    if (district) temples = temples.filter((t) => t.district === district);
    if (cityTownVillage) temples = temples.filter((t) => t.cityTownVillage === cityTownVillage);
    const marathonsByTemple = {};
    for (const t of temples) {
      const mSnap = await db.collection('marathons').where('templeId', '==', t.id).get();
      marathonsByTemple[t.id] = await Promise.all(mSnap.docs.map(async (d) => {
        const data = d.data();
        const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
        const participants = partsSnap.docs.map((p) => ({ userId: p.data().userId, japasCount: p.data().japasCount ?? 0 }));
        participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
        return {
          id: d.id,
          templeId: data.templeId,
          deityId: data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          leaderboard: participants.slice(0, 10).map((p, i) => ({ rank: i + 1, userId: (p.userId || '').slice(0, 8), japasCount: p.japasCount })),
        };
      }));
    }
    res.json({ temples, marathonsByTemple });
  } catch (e) {
    console.error('marathons discover', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/marathons/join', async (req, res) => {
  try {
    const { marathonId, userId } = req.body || {};
    if (!marathonId || !userId) return res.status(400).json({ error: 'marathonId and userId required' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const participationRef = db.doc(`marathonParticipations/${marathonId}_${userId}`);
    const existing = await participationRef.get();
    if (existing.exists) return res.json({ ok: true, alreadyJoined: true });
    await participationRef.set({ marathonId, userId, joinedAt: new Date().toISOString(), japasCount: 0 });
    const marathonRef = db.doc(`marathons/${marathonId}`);
    const marathonSnap = await marathonRef.get();
    if (marathonSnap.exists) {
      const data = marathonSnap.data();
      await marathonRef.update({ joinedCount: (data.joinedCount ?? 0) + 1 });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('marathons join', e);
    res.status(500).json({ error: e.message });
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
