import { getUnlockPricePaise, jsonResponse } from './_lib.js';

/** GET /api/price — returns unlock price in paise (used by frontend for paywall display) */
export async function GET() {
  const unlockPricePaise = await getUnlockPricePaise();
  return jsonResponse({ unlockPricePaise });
}
