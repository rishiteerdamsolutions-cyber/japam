import {
  getDb,
  verifyAdminToken,
  getAdminTokenFromRequest,
  jsonResponse,
  logAudit,
  jsonInternalServerError,
} from '../_lib.js';

/** GET /api/admin/app-config — read app flags (admin). */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!verifyAdminToken(token)) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const snap = await db.doc('config/app').get();
    const data = snap.exists ? snap.data() || {} : {};
    return jsonResponse({ apavargaLaunched: data.apavargaLaunched === true }, 200);
  } catch (e) {
    console.error('admin app-config GET', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/app-config.js');
  }
}

/** POST /api/admin/app-config — set app flags. Body: { apavargaLaunched: boolean } */
export async function POST(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!verifyAdminToken(token)) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }
    const body = await request.json().catch(() => ({}));
    if (typeof body?.apavargaLaunched !== 'boolean') {
      return jsonResponse({ error: 'apavargaLaunched boolean required' }, 400);
    }
    const { apavargaLaunched } = body;
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    await db.doc('config/app').set({ apavargaLaunched }, { merge: true });
    await logAudit('admin_app_config', { apavargaLaunched });
    return jsonResponse({ ok: true, apavargaLaunched }, 200);
  } catch (e) {
    console.error('admin app-config POST', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/app-config.js');
  }
}
