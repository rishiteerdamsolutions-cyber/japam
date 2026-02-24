import { getPricing, jsonResponse, UNLOCK_PRICE_PAISE } from './_lib.js';

const DEFAULT_DISPLAY = 9900;

/** GET /api/price — returns unlock + display price in paise (used by frontend for paywall) */
export async function GET() {
  try {
    const { unlockPricePaise, displayPricePaise } = await getPricing();
    return jsonResponse({ unlockPricePaise, displayPricePaise });
  } catch (e) {
    console.error('api/price', e);
    return jsonResponse({ unlockPricePaise: UNLOCK_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY }, 200);
  }
}
