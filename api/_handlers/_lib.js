/**
 * Shared helpers for API handlers (used by api/proxy.js router).
 */
export const UNLOCK_PRICE_PAISE = 1000; // ₹10 default (Razorpay uses paise); admin can override via /admin in rupees

import crypto from 'crypto';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';

let db = null;
let razorpay = null;

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.JWT_SECRET || 'change-me-in-production';

const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createAdminToken() {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + ADMIN_TOKEN_TTL_MS });
  const raw = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(raw).digest('base64url');
  return raw + '.' + sig;
}

export function verifyAdminToken(token) {
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

/** Get admin token from request (header, X-Admin-Token, or query). Use for admin API handlers. */
export function getAdminTokenFromRequest(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  const xToken = request?.headers?.get?.('x-admin-token') || request?.headers?.get?.('X-Admin-Token');
  if (xToken && typeof xToken === 'string') return xToken;
  try {
    const url = new URL(request.url);
    return url.searchParams.get('token') || null;
  } catch {
    return null;
  }
}

export function getDb() {
  if (db) return db;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const serviceAccount = JSON.parse(json);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    return db;
  } catch (e) {
    console.error('Firebase init failed:', e.message);
    return null;
  }
}

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** Verify Firebase user ID token, return uid or null. */
export async function verifyFirebaseUser(request) {
  try {
    // Ensure admin app initialized (for admin.auth()).
    const database = getDb();
    if (!database) return null;
    const token = getBearerToken(request);
    if (!token) return null;
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded?.uid || null;
  } catch (e) {
    console.error('verifyFirebaseUser failed:', e?.message || e);
    return null;
  }
}

/** Check if user has paid (unlocked). Uses unlockedUsers collection. */
export async function isUserUnlocked(db, uid) {
  if (!uid) return false;
  try {
    const snap = await db.collection('unlockedUsers').doc(uid).get();
    return snap.exists;
  } catch {
    return false;
  }
}

/** Check if user is blocked from login/using app. Uses blockedUsers collection. */
export async function isUserBlocked(db, uid) {
  if (!uid) return false;
  try {
    const snap = await db.collection('blockedUsers').doc(uid).get();
    return snap.exists;
  } catch {
    return false;
  }
}

export function getRazorpay() {
  if (razorpay) return razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SIglcNEf6QAT2M';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'iDY2XaMKT5k22g39pOU27X1t';
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

const DEFAULT_DISPLAY_PRICE_PAISE = 9900; // ₹99 strikethrough

/** Current price: Firestore config/pricing if set by admin, else UNLOCK_PRICE_PAISE. Never returns < 100 (Razorpay minimum). */
export async function getUnlockPricePaise() {
  const { unlockPricePaise } = await getPricing();
  return unlockPricePaise;
}

/** Returns both unlock (actual) and display (strikethrough) price in paise. */
export async function getPricing() {
  const database = getDb();
  if (database) {
    try {
      const snap = await database.doc('config/pricing').get();
      const data = snap?.data();
      const unlock = data?.unlockPricePaise;
      const display = data?.displayPricePaise;
      return {
        unlockPricePaise: typeof unlock === 'number' && unlock >= 100 ? Math.round(unlock) : UNLOCK_PRICE_PAISE,
        displayPricePaise: typeof display === 'number' && display >= 100 ? Math.round(display) : DEFAULT_DISPLAY_PRICE_PAISE,
      };
    } catch {}
  }
  return { unlockPricePaise: UNLOCK_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY_PRICE_PAISE };
}

const PRIEST_SECRET = process.env.PRIEST_SECRET || process.env.ADMIN_SECRET || process.env.JWT_SECRET || 'change-me-in-production';

/** Generate priest username from temple name: pujari@slug */
export function generatePriestUsername(templeName) {
  const slug = (templeName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30) || 'temple';
  const base = `pujari@${slug}`;
  return base.length >= 12 && base.length <= 50 ? base : `pujari@${slug}-${Date.now().toString(36).slice(-4)}`;
}

/** Generate random priest password: 2 caps, 2 digits, 2 small, 2 symbols; 10-20 chars */
export function generatePriestPassword() {
  const caps = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const small = 'abcdefghjkmnpqrstuvwxyz';
  const symbols = '@!#$%&*';
  const pick = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
  const parts = [pick(caps, 2), pick(digits, 2), pick(small, 2), pick(symbols, 2)];
  const rest = pick(caps + digits + small + symbols, 4);
  const shuffled = [...parts.join(''), ...rest].sort(() => Math.random() - 0.5).join('');
  return shuffled;
}

/** Hash password for priest (scrypt). Returns "salt:hash" hex. */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** Validate priest username: pujari@templename */
export function validatePriestUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const u = username.trim();
  return /^pujari@[a-zA-Z0-9_-]+$/.test(u) && u.length >= 12 && u.length <= 50;
}

/** Validate priest password: 2 caps, 2 digits, 2 small, 2 symbols; 10-20 chars */
export function validatePriestPassword(password) {
  if (!password || typeof password !== 'string') return false;
  const p = password;
  if (p.length < 10 || p.length > 20) return false;
  const caps = (p.match(/[A-Z]/g) || []).length;
  const digits = (p.match(/[0-9]/g) || []).length;
  const small = (p.match(/[a-z]/g) || []).length;
  const symbols = (p.match(/[^A-Za-z0-9]/g) || []).length;
  return caps >= 2 && digits >= 2 && small >= 2 && symbols >= 2;
}

/** Verify priest password against stored "salt:hash". */
export function verifyPassword(password, stored) {
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

/** Create priest JWT with templeId. */
export function createPriestToken(templeId, templeName) {
  const payload = JSON.stringify({ templeId, templeName, priest: true, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const raw = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', PRIEST_SECRET).update(raw).digest('base64url');
  return raw + '.' + sig;
}

/** Verify priest token, return { templeId, templeName } or null. */
export function verifyPriestToken(token) {
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

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
