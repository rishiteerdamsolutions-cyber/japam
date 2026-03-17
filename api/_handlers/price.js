import { getPricing, jsonResponse, UNLOCK_PRICE_PAISE } from './_lib.js';

const DEFAULT_DISPLAY = 9900;
const LIVES_PRICE = 1900;
const APPOINTMENT_FEE = 10800;

/** GET /api/price — returns unlock + display + lives + appointment fee in paise */
export async function GET() {
  try {
    const { unlockPricePaise, displayPricePaise, livesPricePaise, appointmentFeePaise } = await getPricing();
    return jsonResponse({
      unlockPricePaise,
      displayPricePaise,
      livesPricePaise: livesPricePaise ?? LIVES_PRICE,
      appointmentFeePaise: appointmentFeePaise ?? APPOINTMENT_FEE,
    });
  } catch (e) {
    console.error('api/price', e);
    return jsonResponse({ unlockPricePaise: UNLOCK_PRICE_PAISE, displayPricePaise: DEFAULT_DISPLAY, livesPricePaise: LIVES_PRICE, appointmentFeePaise: APPOINTMENT_FEE }, 200);
  }
}
