import { getDb, jsonResponse, jsonInternalServerError } from '../_lib.js';

/** GET /api/public/app-config — public feature flags (no auth). */
export async function GET() {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ apavargaLaunched: false }, 200);
    const snap = await db.doc('config/app').get();
    const data = snap.exists ? snap.data() || {} : {};
    const apavargaLaunched = data.apavargaLaunched === true;
    return jsonResponse({ apavargaLaunched }, 200);
  } catch (e) {
    console.error('public app-config', e);
    return jsonInternalServerError(e, 'api/_handlers/public/app-config.js');
  }
}
