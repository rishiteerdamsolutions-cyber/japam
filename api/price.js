import { getPricing, jsonResponse } from './_lib.js';

/** GET /api/price — returns unlock + display price in paise (used by frontend for paywall) */
export async function GET() {
  const { unlockPricePaise, displayPricePaise } = await getPricing();
  return jsonResponse({ unlockPricePaise, displayPricePaise });
}
