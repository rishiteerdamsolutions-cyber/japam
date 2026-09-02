import { getDb, jsonResponse, jsonInternalServerError } from '../_lib.js';
import { SATSANG_CAP, SATSANG_YAGNA_TARGET, SATSANG_SITTING_JAPAS, hasAnyOpenSatsangEvent } from '../_satsang.js';

/** GET /api/public/satsang-status — QR gate. No codes, no mandap names. */
export async function GET(_request) {
  const db = getDb();
  if (!db) return jsonResponse({ open: false }, 200);
  try {
    const open = await hasAnyOpenSatsangEvent(db);
    if (!open) return jsonResponse({ open: false }, 200);
    return jsonResponse({
      open: true,
      cap: SATSANG_CAP,
      yagnaTarget: SATSANG_YAGNA_TARGET,
      sittingTarget: SATSANG_SITTING_JAPAS,
    });
  } catch (e) {
    return jsonInternalServerError(e, 'public/satsang-status GET');
  }
}
