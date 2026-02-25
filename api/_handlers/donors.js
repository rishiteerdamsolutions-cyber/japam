import { getDb, jsonResponse } from './_lib.js';

/** GET /api/donors - Public list of donors for thank-you box. No auth required. */
export async function GET(_request) {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ donors: [] }, 200);

    const snap = await db.collection('donors').orderBy('donatedAt', 'desc').get();
    const donors = snap.docs.map((d) => {
      const data = d.data();
      return {
        displayName: data.displayName || 'Anonymous',
        donatedAt: data.donatedAt || null,
      };
    });

    return jsonResponse({ donors });
  } catch (e) {
    console.error('donors GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
