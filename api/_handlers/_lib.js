/**
 * Shared helpers for API handlers (used by api/proxy.js router).
 */
export const UNLOCK_PRICE_PAISE = 10800; // ₹108 default (auspicious); admin can override via /admin in rupees

import crypto from 'crypto';

/** IST (Asia/Kolkata) noon: 12:00 PM IST = 06:30 UTC. Refill boundary at noon IST for easy daytime testing. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_NOON_UTC_MS = 6 * 60 * 60 * 1000 + 30 * 60 * 1000; // 06:30 UTC = 12:00 PM IST

/** Refill at noon IST: if a new "noon boundary" has passed since lastRefillAt, refill. */
export function shouldRefillLivesAtNoonIST(now, lastRefillAt) {
  const lastIstDay = Math.floor((lastRefillAt - IST_NOON_UTC_MS) / MS_PER_DAY);
  const todayIstDay = Math.floor((now - IST_NOON_UTC_MS) / MS_PER_DAY);
  return todayIstDay > lastIstDay;
}

/** Next noon IST in ms since epoch. */
export function getNextNoonISTMs(now) {
  const todayIstDay = Math.floor((now - IST_NOON_UTC_MS) / MS_PER_DAY);
  return (todayIstDay + 1) * MS_PER_DAY + IST_NOON_UTC_MS;
}
import admin from 'firebase-admin';
import { withCache, cacheDelete, TTL } from './_cache.js';

let db = null;

const WEAK_SECRET = 'change-me-in-production';

function getAdminSecret() {
  const s = process.env.ADMIN_SECRET || process.env.JWT_SECRET || '';
  return s && s !== WEAK_SECRET ? s : null;
}

const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createAdminToken() {
  const secret = getAdminSecret();
  if (!secret) throw new Error('ADMIN_SECRET not configured (set in Vercel env vars)');
  const payload = JSON.stringify({ admin: true, exp: Date.now() + ADMIN_TOKEN_TTL_MS });
  const raw = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
  return raw + '.' + sig;
}

export function verifyAdminToken(token) {
  const secret = getAdminSecret();
  if (!secret) return false;
  if (!token || typeof token !== 'string') return false;
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (payload.exp < Date.now()) return false;
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
    return sig === expected;
  } catch {
    return false;
  }
}

/** Get admin token from request (Authorization header or X-Admin-Token only). Never from query params (URLs get logged). */
export function getAdminTokenFromRequest(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  const xToken = request?.headers?.get?.('x-admin-token') || request?.headers?.get?.('X-Admin-Token');
  if (xToken && typeof xToken === 'string') return xToken;
  return null;
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

/** Verify Firebase user ID token, return uid or null. Blocked users (custom claim) return null. */
export async function verifyFirebaseUser(request) {
  try {
    const database = getDb();
    if (!database) return null;
    const token = getBearerToken(request);
    if (!token) return null;
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded?.blocked === true) return null;
    return decoded?.uid || null;
  } catch (e) {
    console.error('verifyFirebaseUser failed:', e?.message || e);
    return null;
  }
}

/** One month of Pro access. 30 days is close enough to "one month" for billing purposes. */
export const PRO_ACCESS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function toMs(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === 'object' && typeof value.toMillis === 'function') {
    try { return value.toMillis(); } catch { return null; }
  }
  return null;
}

/** Get unlock info with monthly expiry applied. Returns { hasPaid, isActive, unlockedAt, unlockExpiresAt }. */
export async function getUserUnlockInfo(db, uid) {
  if (!uid || !db) return { hasPaid: false, isActive: false, unlockedAt: null, unlockExpiresAt: null };
  try {
    const [unlockSnap, unlockedUsersSnap] = await Promise.all([
      db.doc(`users/${uid}/data/unlock`).get(),
      db.collection('unlockedUsers').doc(uid).get(),
    ]);
    const unlockData = unlockSnap.exists ? unlockSnap.data() : null;
    const unlockedUsersData = unlockedUsersSnap.exists ? unlockedUsersSnap.data() : null;
    const hasPaid = Boolean(unlockData?.levelsUnlocked || unlockedUsersSnap.exists);
    if (!hasPaid) {
      return { hasPaid: false, isActive: false, unlockedAt: null, unlockExpiresAt: null };
    }
    const unlockedAtMs =
      toMs(unlockData?.unlockedAt) ??
      toMs(unlockedUsersData?.unlockedAt) ??
      null;
    const explicitExpiryMs =
      toMs(unlockData?.unlockExpiresAt) ??
      toMs(unlockedUsersData?.unlockExpiresAt) ??
      null;
    const expiryMs = explicitExpiryMs ?? (unlockedAtMs != null ? unlockedAtMs + PRO_ACCESS_DURATION_MS : null);
    const isActive = expiryMs == null ? false : Date.now() < expiryMs;
    return {
      hasPaid,
      isActive,
      unlockedAt: unlockedAtMs != null ? new Date(unlockedAtMs).toISOString() : null,
      unlockExpiresAt: expiryMs != null ? new Date(expiryMs).toISOString() : null,
    };
  } catch {
    return { hasPaid: false, isActive: false, unlockedAt: null, unlockExpiresAt: null };
  }
}

/** Check if user has active paid access (within 30-day window). */
export async function isUserUnlocked(db, uid) {
  const info = await getUserUnlockInfo(db, uid);
  return info.isActive;
}

const COUPON_CODE_MAX_LEN = 32;

export function normalizeCouponCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidCouponCodeFormat(code) {
  if (!code || typeof code !== 'string') return false;
  if (code.length < 3 || code.length > COUPON_CODE_MAX_LEN) return false;
  return /^[A-Z0-9_-]+$/.test(code);
}

/** Default per-user redemption cap for a coupon. Admin can override (0/null = unlimited per user, but discouraged). */
export const DEFAULT_COUPON_PER_USER_LIMIT = 1;

/** Doc id for the per-user usage counter. Safe because coupon code is [A-Z0-9_-] and uid is [A-Za-z0-9]. */
export function couponUserUsageId(code, uid) {
  return `${code}__${uid}`;
}

/** Validate a coupon from Firestore. Returns { ok, coupon?, error? } where coupon is the normalized doc data. */
export async function loadActiveCoupon(db, code) {
  const normalized = normalizeCouponCode(code);
  if (!isValidCouponCodeFormat(normalized)) {
    return { ok: false, error: 'Invalid coupon code' };
  }
  try {
    const snap = await db.collection('coupons').doc(normalized).get();
    if (!snap.exists) return { ok: false, error: 'Coupon not found' };
    const data = snap.data() || {};
    const percent = Number(data.percentOff);
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
      return { ok: false, error: 'Coupon is misconfigured' };
    }
    if (data.active === false) {
      return { ok: false, error: 'Coupon is disabled' };
    }
    const expMs = toMs(data.expiresAt);
    if (expMs != null && Date.now() > expMs) {
      return { ok: false, error: 'Coupon has expired' };
    }
    const maxUses = typeof data.maxUses === 'number' ? data.maxUses : null;
    const usedCount = typeof data.usedCount === 'number' ? data.usedCount : 0;
    if (maxUses != null && usedCount >= maxUses) {
      return { ok: false, error: 'Coupon usage limit reached' };
    }
    // perUserLimit: undefined (legacy docs) -> DEFAULT; 0 or null -> unlimited per user (admin opt-in).
    let perUserLimit;
    if (data.perUserLimit === null || data.perUserLimit === 0) {
      perUserLimit = null; // unlimited per user (must be explicitly set)
    } else if (typeof data.perUserLimit === 'number' && data.perUserLimit > 0) {
      perUserLimit = Math.round(data.perUserLimit);
    } else {
      perUserLimit = DEFAULT_COUPON_PER_USER_LIMIT;
    }
    return {
      ok: true,
      coupon: {
        code: normalized,
        percentOff: Math.round(percent),
        active: data.active !== false,
        expiresAt: expMs != null ? new Date(expMs).toISOString() : null,
        maxUses,
        usedCount,
        perUserLimit,
        note: typeof data.note === 'string' ? data.note : '',
      },
    };
  } catch (e) {
    console.error('loadActiveCoupon', e?.message || e);
    return { ok: false, error: 'Coupon lookup failed' };
  }
}

/**
 * Check if the given uid is allowed to use this coupon right now:
 *  - Per-user redemption cap not exceeded.
 *  - User does not already have active (non-expired) Pro access. Stacking coupons on active Pro is blocked
 *    to prevent users from extending their subscription indefinitely with 100% coupons.
 *
 * Returns { ok, error?, userUsedCount }.
 */
export async function assertCouponUsableByUser(db, coupon, uid) {
  if (!db || !coupon || !uid) return { ok: false, error: 'Invalid request' };
  try {
    const [usageSnap, unlockInfo] = await Promise.all([
      db.collection('couponUserUsage').doc(couponUserUsageId(coupon.code, uid)).get(),
      getUserUnlockInfo(db, uid),
    ]);
    if (unlockInfo.isActive) {
      return { ok: false, error: 'You already have active Pro access — coupons can only be applied after your current access expires' };
    }
    const prev = usageSnap.exists ? usageSnap.data() : null;
    const used = typeof prev?.count === 'number' ? prev.count : 0;
    if (coupon.perUserLimit != null && used >= coupon.perUserLimit) {
      return { ok: false, error: 'You have already used this coupon the maximum number of times' };
    }
    return { ok: true, userUsedCount: used };
  } catch (e) {
    console.error('assertCouponUsableByUser', e?.message || e);
    return { ok: false, error: 'Coupon check failed' };
  }
}

/** Compute discounted amount in paise given a base and a percent (1..100). Always >= 100 paise if non-zero. */
export function applyCouponPercent(basePaise, percentOff) {
  const base = Math.round(Number(basePaise));
  const pct = Math.round(Number(percentOff));
  if (!Number.isFinite(base) || base < 100) return base;
  if (!Number.isFinite(pct) || pct < 1) return base;
  if (pct >= 100) return 0;
  const discounted = Math.round(base * (1 - pct / 100));
  return Math.max(100, discounted);
}

const DEFAULT_DISPLAY_PRICE_PAISE = 9900; // ₹99 strikethrough
const DEFAULT_APPOINTMENT_FEE_PAISE = 10800; // ₹108 priest appointment fee

/** Current price: Firestore config/pricing if set by admin, else UNLOCK_PRICE_PAISE. Never returns < 100. */
export async function getUnlockPricePaise() {
  const { unlockPricePaise } = await getPricing();
  return unlockPricePaise;
}

const LIVES_PRICE_PAISE = 1900; // ₹19 for 5 lives

/** Priest appointment fee in paise (admin-configurable). */
export async function getAppointmentFeePaise() {
  const { appointmentFeePaise } = await getPricing();
  return appointmentFeePaise;
}

/** Returns both unlock (actual) and display (strikethrough) price in paise, plus lives and appointment fee. Cached for 5 min. */
export async function getPricing() {
  const database = getDb();
  if (database) {
    return withCache('pricing:config', TTL.CONFIG, async () => {
      try {
        const snap = await database.doc('config/pricing').get();
        const data = snap?.data();
        const unlock = data?.unlockPricePaise;
        const display = data?.displayPricePaise;
        const lives = data?.livesPricePaise;
        const appointmentFee = data?.appointmentFeePaise;
        return {
          unlockPricePaise: typeof unlock === 'number' && unlock >= 100 ? Math.round(unlock) : UNLOCK_PRICE_PAISE,
          displayPricePaise: typeof display === 'number' && display >= 100 ? Math.round(display) : DEFAULT_DISPLAY_PRICE_PAISE,
          livesPricePaise: typeof lives === 'number' && lives >= 100 ? Math.round(lives) : LIVES_PRICE_PAISE,
          appointmentFeePaise: typeof appointmentFee === 'number' && appointmentFee >= 100 ? Math.round(appointmentFee) : DEFAULT_APPOINTMENT_FEE_PAISE,
        };
      } catch {
        return {
          unlockPricePaise: UNLOCK_PRICE_PAISE,
          displayPricePaise: DEFAULT_DISPLAY_PRICE_PAISE,
          livesPricePaise: LIVES_PRICE_PAISE,
          appointmentFeePaise: DEFAULT_APPOINTMENT_FEE_PAISE,
        };
      }
    });
  }
  return {
    unlockPricePaise: UNLOCK_PRICE_PAISE,
    displayPricePaise: DEFAULT_DISPLAY_PRICE_PAISE,
    livesPricePaise: LIVES_PRICE_PAISE,
    appointmentFeePaise: DEFAULT_APPOINTMENT_FEE_PAISE,
  };
}

/** Call after admin updates pricing to ensure cache is fresh immediately. */
export function invalidatePricingCache() {
  cacheDelete('pricing:config');
}

/** Lives pack price in paise (5 lives). */
export async function getLivesPricePaise() {
  const { livesPricePaise } = await getPricing();
  return livesPricePaise;
}

function getPriestSecret() {
  const s = process.env.PRIEST_SECRET || getAdminSecret();
  return s || null;
}

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

/** Create priest JWT with templeId. Optional uid binds token to linked Gmail. */
export function createPriestToken(templeId, templeName, uid) {
  const secret = getPriestSecret();
  if (!secret) throw new Error('PRIEST_SECRET or ADMIN_SECRET not configured');
  const payload = { templeId, templeName, priest: true, exp: Date.now() + 24 * 60 * 60 * 1000 };
  if (uid) payload.uid = uid;
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
  return raw + '.' + sig;
}

/** Verify priest token, return { templeId, templeName, uid? } or null. */
export function verifyPriestToken(token) {
  const secret = getPriestSecret();
  if (!secret) return null;
  if (!token || typeof token !== 'string') return null;
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (payload.exp < Date.now() || !payload.templeId) return null;
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
    if (sig !== expected) return null;
    const result = { templeId: payload.templeId, templeName: payload.templeName || '' };
    if (payload.uid) result.uid = payload.uid;
    return result;
  } catch {
    return null;
  }
}

/** Verify priest token for API calls. For linked temples (priestUserId set), token must have matching uid. */
export async function verifyPriestForApi(token, db) {
  const priest = verifyPriestToken(token);
  if (!priest || !db) return null;
  try {
    const templeSnap = await db.collection('temples').doc(priest.templeId).get();
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

/** Validate Firestore document ID from user input - reject path chars and invalid length. */
export function isValidFirestoreDocId(id) {
  if (!id || typeof id !== 'string') return false;
  const s = id.trim();
  return s.length > 0 && s.length <= 1500 && !/[./\\]/.test(s);
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Never expose stack or internal exception text to API clients (production-safe 500). */
export const INTERNAL_SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again later.';

export function jsonInternalServerError(error, logTag) {
  if (error) console.error(logTag || 'api-handler', error?.message || error);
  return jsonResponse({ error: INTERNAL_SERVER_ERROR_MESSAGE }, 500);
}

/**
 * Compute the absolute URL Cashfree should POST webhooks to for a given order.
 * Used as `order_meta.notify_url` when creating an order. Prefers the explicit
 * CASHFREE_NOTIFY_URL env var (recommended in production), otherwise derives
 * from the request origin if it's https. Returns null if no safe URL is
 * available (localhost dev etc.) so we omit the field and Cashfree skips the
 * webhook call for that order.
 */
export function getCashfreeNotifyUrl(request) {
  const fromEnv = process.env.CASHFREE_NOTIFY_URL;
  if (fromEnv && /^https:\/\//.test(fromEnv)) return fromEnv.replace(/\/$/, '');
  try {
    const origin = request?.headers?.get?.('origin') || request?.headers?.get?.('referer') || '';
    if (!origin) return null;
    const u = new URL(origin);
    if (u.protocol !== 'https:') return null;
    return `${u.protocol}//${u.host}/api/cashfree-webhook`;
  } catch {
    return null;
  }
}

/** Audit log for sensitive actions. Logs to console; optionally to Firestore auditLogs collection. */
export async function logAudit(action, details = {}) {
  const entry = {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  };
  console.info('[Audit]', JSON.stringify(entry));
  const db = getDb();
  if (db && process.env.AUDIT_TO_FIRESTORE === 'true') {
    try {
      await db.collection('auditLogs').add(entry);
    } catch (e) {
      console.error('audit Firestore write failed', e?.message);
    }
  }
}
