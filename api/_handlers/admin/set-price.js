import {
  getDb,
  verifyAdminToken,
  getAdminTokenFromRequest,
  jsonResponse,
  logAudit,
  invalidatePricingCache,
  jsonInternalServerError,
} from '../_lib.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getAdminTokenFromRequest(request);
    if (!verifyAdminToken(token)) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }
    const unlockPricePaise = Math.round(Number(body?.unlockPricePaise));
    if (!Number.isFinite(unlockPricePaise) || unlockPricePaise < 100) {
      return jsonResponse({ error: 'Invalid price (min 100 paise)' }, 400);
    }
    const displayPricePaise = Math.round(Number(body?.displayPricePaise ?? 9900));
    const safeDisplay = Number.isFinite(displayPricePaise) && displayPricePaise >= 100 ? displayPricePaise : 9900;
    const appointmentFeePaise = body?.appointmentFeePaise != null ? Math.round(Number(body.appointmentFeePaise)) : undefined;
    const safeAppointmentFee = appointmentFeePaise != null && Number.isFinite(appointmentFeePaise) && appointmentFeePaise >= 100 ? appointmentFeePaise : undefined;
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const update = { unlockPricePaise, displayPricePaise: safeDisplay };
    if (safeAppointmentFee != null) update.appointmentFeePaise = safeAppointmentFee;
    await db.doc('config/pricing').set(update, { merge: true });
    invalidatePricingCache();
    await logAudit('admin_set_price', { unlockPricePaise, displayPricePaise: safeDisplay, appointmentFeePaise: safeAppointmentFee });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('admin set-price', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/set-price.js');
  }
}
