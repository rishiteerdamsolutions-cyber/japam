import { getDb, jsonResponse } from './_lib.js';
import { withCache, TTL } from './_cache.js';

/** GET /api/donors - Public list of donors for thank-you box. No auth required. Capped at 200, cached 60s. */
export async function GET(_request) {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ donors: [] }, 200);

    const donors = await withCache('donors:list', TTL.PUBLIC_LIST, async () => {
      const snap = await db
        .collection('donors')
        .orderBy('donatedAt', 'desc')
        .limit(200)
        .get();
      return snap.docs
        .map((d) => {
          const data = d.data();
          const amount = typeof data.amount === 'number' ? data.amount : 0;
          const label = data.lifetimeDonor === true || amount >= 5000000 ? 'Lifetime Donor' : 'Donor';
          return {
            displayName: data.displayName || 'Anonymous',
            donatedAt: data.donatedAt || null,
            label,
          };
        })
        .filter((d) => d.displayName !== '[deleted]');
    });

    return jsonResponse({ donors });
  } catch (e) {
    console.error('donors GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
