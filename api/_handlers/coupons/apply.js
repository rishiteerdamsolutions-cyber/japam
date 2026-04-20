import admin from 'firebase-admin';
import {
  getDb,
  jsonResponse,
  verifyFirebaseUser,
  jsonInternalServerError,
  logAudit,
  loadActiveCoupon,
  applyCouponPercent,
  assertCouponUsableByUser,
  couponUserUsageId,
  getUnlockPricePaise,
  UNLOCK_PRICE_PAISE,
  PRO_ACCESS_DURATION_MS,
} from '../_lib.js';

/**
 * POST /api/coupons/apply
 * Body: { code: string, redeem?: boolean }
 *
 * Preview (redeem=false):
 *   Validates the coupon + per-user eligibility + no active Pro. Returns the
 *   discounted price (for the UI). No writes.
 *
 * Redeem (redeem=true):
 *   Only valid for 100% coupons. Grants Pro unlock directly, atomically
 *   increments both the global usedCount and the per-user usage counter,
 *   respecting maxUses and perUserLimit. 100% coupons are the only path that
 *   skips payment, so the caps are enforced inside a single transaction.
 */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code : '';
    const redeem = Boolean(body?.redeem);

    const { ok, coupon, error } = await loadActiveCoupon(db, code);
    if (!ok) {
      await logAudit('coupon_apply_rejected', { uid, code: String(code).toUpperCase(), reason: error, stage: 'load' });
      return jsonResponse({ error: error || 'Invalid coupon' }, 400);
    }

    // Block abuse: per-user cap + active Pro guard apply to BOTH preview and redeem so the UI can
    // show a clear message before the user tries to hit Unlock.
    const elig = await assertCouponUsableByUser(db, coupon, uid);
    if (!elig.ok) {
      await logAudit('coupon_apply_rejected', { uid, code: coupon.code, reason: elig.error, stage: 'eligibility' });
      return jsonResponse({ error: elig.error }, 400);
    }

    let basePaise = UNLOCK_PRICE_PAISE;
    try { basePaise = await getUnlockPricePaise(); } catch {}
    const discountedPaise = applyCouponPercent(basePaise, coupon.percentOff);

    if (!redeem) {
      return jsonResponse({
        ok: true,
        code: coupon.code,
        percentOff: coupon.percentOff,
        basePricePaise: basePaise,
        discountedPricePaise: discountedPaise,
        fullyCovered: coupon.percentOff >= 100,
      });
    }

    if (coupon.percentOff < 100) {
      return jsonResponse({ error: 'Partial coupons must be applied at checkout' }, 400);
    }

    const now = Date.now();
    const unlockedAtIso = new Date(now).toISOString();
    const unlockExpiresAtIso = new Date(now + PRO_ACCESS_DURATION_MS).toISOString();

    // Atomic: re-check both caps against latest counters and increment together to prevent races.
    const couponRef = db.collection('coupons').doc(coupon.code);
    const userUsageRef = db.collection('couponUserUsage').doc(couponUserUsageId(coupon.code, uid));
    try {
      await db.runTransaction(async (tx) => {
        const [cSnap, uSnap] = await Promise.all([tx.get(couponRef), tx.get(userUsageRef)]);
        if (!cSnap.exists) throw new Error('Coupon not found');
        const cData = cSnap.data() || {};
        if (cData.active === false) throw new Error('Coupon is disabled');
        const used = typeof cData.usedCount === 'number' ? cData.usedCount : 0;
        const maxUses = typeof cData.maxUses === 'number' ? cData.maxUses : null;
        if (maxUses != null && used >= maxUses) throw new Error('Coupon usage limit reached');
        const prevUserCount = uSnap.exists ? (uSnap.data()?.count || 0) : 0;
        if (coupon.perUserLimit != null && prevUserCount >= coupon.perUserLimit) {
          throw new Error('You have already used this coupon the maximum number of times');
        }
        tx.update(couponRef, { usedCount: used + 1, lastUsedAt: unlockedAtIso });
        tx.set(userUsageRef, {
          code: coupon.code,
          uid,
          count: prevUserCount + 1,
          lastUsedAt: unlockedAtIso,
          firstUsedAt: uSnap.exists ? (uSnap.data()?.firstUsedAt || unlockedAtIso) : unlockedAtIso,
        }, { merge: true });
      });
    } catch (txErr) {
      const msg = txErr?.message || 'Coupon could not be applied';
      await logAudit('coupon_apply_rejected', { uid, code: coupon.code, reason: msg, stage: 'transaction' });
      return jsonResponse({ error: msg }, 400);
    }

    // Write unlock after caps have been safely claimed in the transaction above.
    await db.doc(`users/${uid}/data/unlock`).set(
      { levelsUnlocked: true, unlockedAt: unlockedAtIso, unlockExpiresAt: unlockExpiresAtIso },
      { merge: true },
    );
    let email = null;
    try { email = (await admin.auth().getUser(uid)).email || null; } catch {}
    await db.collection('unlockedUsers').doc(uid).set(
      { uid, email, unlockedAt: unlockedAtIso, unlockExpiresAt: unlockExpiresAtIso, couponCode: coupon.code },
      { merge: true },
    );
    await db.collection('couponRedemptions').add({
      code: coupon.code,
      uid,
      orderId: null,
      percentOff: coupon.percentOff,
      basePricePaise: basePaise,
      chargedPaise: 0,
      createdAt: unlockedAtIso,
      source: 'direct-redeem',
    });

    await logAudit('coupon_redeemed_full', { uid, code: coupon.code });
    return jsonResponse({
      ok: true,
      unlocked: true,
      code: coupon.code,
      percentOff: coupon.percentOff,
      unlockExpiresAt: unlockExpiresAtIso,
    });
  } catch (e) {
    console.error('coupons/apply', e);
    return jsonInternalServerError(e, 'api/_handlers/coupons/apply.js');
  }
}
