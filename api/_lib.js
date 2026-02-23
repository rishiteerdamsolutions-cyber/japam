/**
 * Shared helpers for Vercel serverless API routes.
 * File is prefixed with _ so Vercel does not expose it as a route.
 *
 * Default unlock price: UNLOCK_PRICE_PAISE. Can be overridden by admin dashboard (saved to Firestore).
 */
export const UNLOCK_PRICE_PAISE = 9900; // ₹99 — default; admin can override via /admin dashboard

import crypto from 'crypto';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';

let db = null;
let razorpay = null;

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.JWT_SECRET || 'change-me-in-production';

export function createAdminToken() {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + 60 * 60 * 1000 });
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
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

export function getRazorpay() {
  if (razorpay) return razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SIglcNEf6QAT2M';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'iDY2XaMKT5k22g39pOU27X1t';
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

/** Current price: Firestore config/pricing if set by admin, else UNLOCK_PRICE_PAISE. */
export async function getUnlockPricePaise() {
  const database = getDb();
  if (database) {
    try {
      const snap = await database.doc('config/pricing').get();
      const data = snap?.data();
      if (data?.unlockPricePaise != null) return data.unlockPricePaise;
    } catch {}
  }
  return UNLOCK_PRICE_PAISE;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
