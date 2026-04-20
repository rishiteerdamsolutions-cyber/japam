import {
  getDb,
  jsonResponse,
  jsonInternalServerError,
  normalizeCouponCode,
  isValidCouponCodeFormat,
  logAudit,
  DEFAULT_COUPON_PER_USER_LIMIT,
} from '../_lib.js';

/**
 * Admin coupon CRUD.
 *
 * GET    /api/admin/coupons            -> list coupons
 * POST   /api/admin/coupons            -> create/update. Body: { code, percentOff, active?, expiresAt?, maxUses?, note? }
 * DELETE /api/admin/coupons?code=CODE  -> delete coupon (accepts { code } body too)
 *
 * Admin gate is enforced by proxy.js.
 */

function serializeCoupon(id, data) {
  let perUserLimit;
  if (data?.perUserLimit === null || data?.perUserLimit === 0) {
    perUserLimit = null;
  } else if (typeof data?.perUserLimit === 'number' && data.perUserLimit > 0) {
    perUserLimit = Math.round(data.perUserLimit);
  } else {
    perUserLimit = DEFAULT_COUPON_PER_USER_LIMIT;
  }
  return {
    code: id,
    percentOff: typeof data?.percentOff === 'number' ? data.percentOff : null,
    active: data?.active !== false,
    expiresAt: data?.expiresAt || null,
    maxUses: typeof data?.maxUses === 'number' ? data.maxUses : null,
    perUserLimit,
    usedCount: typeof data?.usedCount === 'number' ? data.usedCount : 0,
    note: typeof data?.note === 'string' ? data.note : '',
    createdAt: data?.createdAt || null,
    updatedAt: data?.updatedAt || null,
    lastUsedAt: data?.lastUsedAt || null,
  };
}

export async function GET(_request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.collection('coupons').get();
    const coupons = snap.docs
      .map((d) => serializeCoupon(d.id, d.data()))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return jsonResponse({ coupons });
  } catch (e) {
    return jsonInternalServerError(e, 'admin/coupons GET');
  }
}

export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const rawCode = typeof body?.code === 'string' ? body.code : '';
    const code = normalizeCouponCode(rawCode);
    if (!isValidCouponCodeFormat(code)) {
      return jsonResponse({ error: 'Code must be 3–32 chars: A–Z, 0–9, hyphen or underscore' }, 400);
    }
    const percentOff = Math.round(Number(body?.percentOff));
    if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
      return jsonResponse({ error: 'percentOff must be 1–100' }, 400);
    }
    const active = body?.active === undefined ? true : Boolean(body.active);
    const note = typeof body?.note === 'string' ? body.note.slice(0, 200) : '';
    let expiresAt = null;
    if (body?.expiresAt) {
      const t = Date.parse(String(body.expiresAt));
      if (!Number.isFinite(t)) return jsonResponse({ error: 'expiresAt must be a valid ISO date' }, 400);
      expiresAt = new Date(t).toISOString();
    }
    let maxUses = null;
    if (body?.maxUses != null && body.maxUses !== '') {
      const n = Math.round(Number(body.maxUses));
      if (!Number.isFinite(n) || n < 1) return jsonResponse({ error: 'maxUses must be a positive integer' }, 400);
      maxUses = n;
    }
    // perUserLimit: defaults to 1 on create; admin can set any positive integer, or 0 to mean "unlimited per user".
    let perUserLimit = DEFAULT_COUPON_PER_USER_LIMIT;
    if (body?.perUserLimit != null && body.perUserLimit !== '') {
      const n = Math.round(Number(body.perUserLimit));
      if (!Number.isFinite(n) || n < 0) {
        return jsonResponse({ error: 'perUserLimit must be 0 (unlimited) or a positive integer' }, 400);
      }
      perUserLimit = n === 0 ? null : n;
    }

    // Hard safety rail for 100% coupons: these skip payment entirely, so an unbounded 100% coupon is a
    // direct financial loss. Require an expiry AND at least one usage cap (total or per-user).
    if (percentOff >= 100) {
      if (!expiresAt) {
        return jsonResponse({ error: '100% coupons must have an expiry date' }, 400);
      }
      if (maxUses == null && perUserLimit == null) {
        return jsonResponse({ error: '100% coupons must have a total "max uses" cap or a per-user cap (not both unlimited)' }, 400);
      }
    }

    const ref = db.collection('coupons').doc(code);
    const existing = await ref.get();
    const nowIso = new Date().toISOString();
    const payload = {
      code,
      percentOff,
      active,
      note,
      expiresAt,
      maxUses,
      perUserLimit,
      updatedAt: nowIso,
    };
    if (!existing.exists) {
      payload.createdAt = nowIso;
      payload.usedCount = 0;
    }
    await ref.set(payload, { merge: true });
    await logAudit(existing.exists ? 'coupon_updated' : 'coupon_created', { code, percentOff, active });
    const fresh = await ref.get();
    return jsonResponse({ ok: true, coupon: serializeCoupon(code, fresh.data()) });
  } catch (e) {
    return jsonInternalServerError(e, 'admin/coupons POST');
  }
}

export async function DELETE(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const url = new URL(request.url);
    let code = url.searchParams.get('code') || '';
    if (!code) {
      const body = await request.json().catch(() => ({}));
      code = typeof body?.code === 'string' ? body.code : '';
    }
    const normalized = normalizeCouponCode(code);
    if (!isValidCouponCodeFormat(normalized)) {
      return jsonResponse({ error: 'Invalid coupon code' }, 400);
    }
    await db.collection('coupons').doc(normalized).delete();
    await logAudit('coupon_deleted', { code: normalized });
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonInternalServerError(e, 'admin/coupons DELETE');
  }
}
