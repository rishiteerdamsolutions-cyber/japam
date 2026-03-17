import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import admin from 'firebase-admin';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

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

function createPriestToken(templeId, templeName, uid) {
  const payload = { templeId, templeName, priest: true, exp: Date.now() + 24 * 60 * 60 * 1000 };
  if (uid) payload.uid = uid;
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
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
const DEFAULT_APPOINTMENT_FEE_PAISE = 10800; // ₹108 priest appointment

async function getPricing() {
  if (!db) return { unlockPricePaise: DEFAULT_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PAISE, livesPricePaise: 1900, appointmentFeePaise: DEFAULT_APPOINTMENT_FEE_PAISE };
  try {
    const snap = await db.doc('config/pricing').get();
    const data = snap.data();
    const unlock = data?.unlockPricePaise;
    const display = data?.displayPricePaise;
    const lives = data?.livesPricePaise;
    const appointmentFee = data?.appointmentFeePaise;
    return {
      unlockPricePaise: typeof unlock === 'number' && unlock >= 100 ? Math.round(unlock) : DEFAULT_PRICE_PAISE,
      displayPricePaise: typeof display === 'number' && display >= 100 ? Math.round(display) : DEFAULT_DISPLAY_PAISE,
      livesPricePaise: typeof lives === 'number' && lives >= 100 ? Math.round(lives) : 1900,
      appointmentFeePaise: typeof appointmentFee === 'number' && appointmentFee >= 100 ? Math.round(appointmentFee) : DEFAULT_APPOINTMENT_FEE_PAISE,
    };
  } catch (e) {
    console.error('getPricing', e);
    return { unlockPricePaise: DEFAULT_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PAISE, livesPricePaise: 1900, appointmentFeePaise: DEFAULT_APPOINTMENT_FEE_PAISE };
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
    res.status(500).json({ unlockPricePaise: DEFAULT_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PAISE, livesPricePaise: 1900, appointmentFeePaise: DEFAULT_APPOINTMENT_FEE_PAISE });
  }
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) return res.status(503).json({ error: 'Payment not configured' });
    const amountPaise = await getUnlockPricePaise();
    const orderId = `japam-${String(userId).slice(-12)}-${Date.now().toString(36).slice(-6)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
    const orderAmount = (amountPaise / 100).toFixed(2);
    const origin = req.headers.origin || req.headers.referer || 'https://japam.digital';
    const baseUrl = (origin || '').replace(/\/$/, '') || 'https://japam.digital';
    const returnUrl = `${baseUrl}/?payment_return=1&order_id={order_id}`;
    let customerEmail = 'user@japam.digital', customerName = 'User';
    try {
      const u = await admin.auth().getUser(userId);
      customerEmail = u.email || customerEmail;
      customerName = (u.displayName || u.email || 'User').slice(0, 100);
    } catch {}
    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'x-api-version': '2023-08-01', 'X-Client-Id': CASHFREE_APP_ID, 'X-Client-Secret': CASHFREE_SECRET },
      body: JSON.stringify({
        order_id: orderId, order_amount: parseFloat(orderAmount), order_currency: 'INR',
        customer_details: { customer_id: userId.slice(-20), customer_email: customerEmail, customer_name: customerName, customer_phone: '9999999999' },
        order_meta: { return_url: returnUrl }, order_note: 'Japam Pro Unlock',
      }),
    });
    const data = await cfRes.json();
    if (!cfRes.ok) return res.status(cfRes.status >= 500 ? 500 : 400).json({ error: data?.message || 'Cashfree error' });
    const paymentSessionId = data?.payment_session_id;
    if (!paymentSessionId) return res.status(500).json({ error: 'Invalid Cashfree response' });
    res.json({ orderId, paymentSessionId, amount: amountPaise });
  } catch (e) {
    console.error('create-order', e);
    res.status(500).json({ error: e.message || 'Failed to create order' });
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
    const appointmentFeePaise = req.body?.appointmentFeePaise != null ? Math.round(Number(req.body.appointmentFeePaise)) : undefined;
    const safeAppointmentFee = appointmentFeePaise != null && Number.isFinite(appointmentFeePaise) && appointmentFeePaise >= 100 ? appointmentFeePaise : undefined;
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const update = { unlockPricePaise, displayPricePaise: safeDisplay };
    if (safeAppointmentFee != null) update.appointmentFeePaise = safeAppointmentFee;
    await db.doc('config/pricing').set(update, { merge: true });
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
    const linkedUid = data.priestUserId;
    const currentUid = userId.trim();
    if (linkedUid && linkedUid !== currentUid) {
      return res.status(403).json({ error: 'This priest account is already linked to another Google account.' });
    }
    await doc.ref.update({ priestUserId: currentUid });
    const token = createPriestToken(templeId, templeName, currentUid);
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
    if (data.priestUserId) {
      return res.status(403).json({
        error: 'This priest account is linked. Sign in with Google at japam.digital and link from Settings.',
      });
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
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
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
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return res.status(401).json({ error: 'Invalid or expired session' });
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
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return res.status(401).json({ error: 'Invalid or expired session' });
    const { deityId, targetJapas, startDate } = req.body || {};
    if (!deityId || !targetJapas || !startDate) return res.status(400).json({ error: 'deityId, targetJapas, startDate required' });
    const target = Math.round(Number(targetJapas));
    if (!Number.isFinite(target) || target < 1) return res.status(400).json({ error: 'targetJapas must be positive' });
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
    const result = { templeId: payload.templeId, templeName: payload.templeName || '' };
    if (payload.uid) result.uid = payload.uid;
    return result;
  } catch {
    return null;
  }
}

async function verifyPriestForApi(token, database) {
  const priest = verifyPriestToken(token);
  if (!priest || !database) return null;
  try {
    const templeSnap = await database.collection('temples').doc(priest.templeId).get();
    const temple = templeSnap.data();
    const linkedUid = temple?.priestUserId;
    if (linkedUid) {
      if (!priest.uid || priest.uid !== linkedUid) return null;
    }
    return priest;
  } catch {
    return null;
  }
}

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

app.get('/api/marathons/discover', async (req, res) => {
  try {
    const { state, district, cityTownVillage, area } = req.query;
    const stateVal = (state || '').trim();
    const districtVal = (district || '').trim();
    const cityVal = (cityTownVillage || '').trim();
    const areaVal = (area || '').trim();
    if (!db) return res.json({ temples: [], marathonsByTemple: {} });
    const templesSnap = await db.collection('temples').get();
    let temples = templesSnap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, name: data.name, state: data.state, district: data.district, cityTownVillage: data.cityTownVillage, area: data.area };
    });
    if (stateVal) temples = temples.filter((t) => t.state === stateVal);
    if (districtVal) temples = temples.filter((t) => t.district === districtVal);
    if (cityVal) {
      const q = normalize(cityVal);
      temples = temples.filter((t) => normalize(t.cityTownVillage).includes(q) || q.includes(normalize(t.cityTownVillage)));
    }
    if (areaVal) {
      const q = normalize(areaVal);
      temples = temples.filter((t) => normalize(t.area).includes(q) || q.includes(normalize(t.area)));
    }
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

async function verifyFirebaseUser(req) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && String(auth).startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token || !db) return null;
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded?.blocked === true) return null;
    return decoded?.uid || null;
  } catch { return null; }
}

app.post('/api/verify-unlock', async (req, res) => {
  try {
    const uid = await verifyFirebaseUser(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const { order_id } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'order_id required' });
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) return res.status(503).json({ error: 'Payment not configured' });
    const cfRes = await fetch(`${CASHFREE_BASE}/orders/${encodeURIComponent(order_id)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'x-api-version': '2023-08-01', 'X-Client-Id': CASHFREE_APP_ID, 'X-Client-Secret': CASHFREE_SECRET },
    });
    const data = await cfRes.json();
    if (!cfRes.ok || data?.order_status !== 'PAID') return res.status(400).json({ error: 'Payment not completed' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    await db.doc(`users/${uid}/data/unlock`).set({ levelsUnlocked: true });
    let email = null;
    try { email = (await admin.auth().getUser(uid)).email || null; } catch {}
    await db.collection('unlockedUsers').doc(uid).set({ uid, email, unlockedAt: new Date().toISOString() }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('verify-unlock', e);
    res.status(500).json({ error: e.message || 'Verification failed' });
  }
});

app.post('/api/donate-order', async (req, res) => {
  try {
    const { userId, amountPaise } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const amount = Math.round(Number(amountPaise));
    if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: 'Minimum donation is ₹1 (100 paise)' });
    if (amount > 10000000) return res.status(400).json({ error: 'Amount too large' });
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) return res.status(503).json({ error: 'Payment not configured' });
    const orderId = `japam-donate-${String(userId).slice(-12)}-${Date.now().toString(36).slice(-6)}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
    const orderAmount = (amount / 100).toFixed(2);
    const origin = req.headers.origin || req.headers.referer || 'https://japam.digital';
    const baseUrl = (origin || '').replace(/\/$/, '') || 'https://japam.digital';
    const returnUrl = `${baseUrl}/?donate_return=1&order_id={order_id}`;
    let customerEmail = 'user@japam.digital', customerName = 'Donor';
    try {
      const u = await admin.auth().getUser(userId);
      customerEmail = u.email || customerEmail;
      customerName = (u.displayName || u.email || 'Donor').slice(0, 100);
    } catch {}
    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'x-api-version': '2023-08-01', 'X-Client-Id': CASHFREE_APP_ID, 'X-Client-Secret': CASHFREE_SECRET },
      body: JSON.stringify({
        order_id: orderId, order_amount: parseFloat(orderAmount), order_currency: 'INR',
        customer_details: { customer_id: userId.slice(-20), customer_email: customerEmail, customer_name: customerName, customer_phone: '9999999999' },
        order_meta: { return_url: returnUrl }, order_note: 'Japam Donation',
      }),
    });
    const data = await cfRes.json();
    if (!cfRes.ok) return res.status(cfRes.status >= 500 ? 500 : 400).json({ error: data?.message || 'Cashfree error' });
    const paymentSessionId = data?.payment_session_id;
    if (!paymentSessionId) return res.status(500).json({ error: 'Invalid Cashfree response' });
    res.json({ orderId, paymentSessionId, amount });
  } catch (e) {
    console.error('donate-order', e);
    res.status(500).json({ error: e.message || 'Failed to create order' });
  }
});

app.post('/api/verify-donate', async (req, res) => {
  try {
    const uid = await verifyFirebaseUser(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const { order_id, displayName } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'order_id required' });
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET) return res.status(503).json({ error: 'Payment not configured' });
    const cfRes = await fetch(`${CASHFREE_BASE}/orders/${encodeURIComponent(order_id)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'x-api-version': '2023-08-01', 'X-Client-Id': CASHFREE_APP_ID, 'X-Client-Secret': CASHFREE_SECRET },
    });
    const data = await cfRes.json();
    if (!cfRes.ok || data?.order_status !== 'PAID') return res.status(400).json({ error: 'Payment not completed' });
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const unlockedSnap = await db.collection('unlockedUsers').doc(uid).get();
    if (!unlockedSnap.exists) return res.status(403).json({ error: 'Pro member required to donate' });
    const orderAmount = data?.order_amount;
    const amountPaise = typeof orderAmount === 'number' ? Math.round(orderAmount * 100) : 0;
    let name = displayName || '';
    if (!name) try { const u = await admin.auth().getUser(uid); name = u.displayName || u.email || uid.slice(0, 12); } catch { name = uid.slice(0, 12); }
    const lifetimeDonor = amountPaise >= 5000000;
    await db.collection('donors').doc(uid).set({ uid, displayName: String(name).trim() || 'Anonymous', amount: amountPaise, lifetimeDonor, donatedAt: new Date().toISOString(), orderId: order_id, paymentId: order_id }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('verify-donate', e);
    res.status(500).json({ error: e.message || 'Verification failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Japam API on port ${PORT}`));
