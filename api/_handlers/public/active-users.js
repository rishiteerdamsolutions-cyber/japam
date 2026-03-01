import { getDb, jsonResponse } from '../_lib.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** GET /api/public/active-users - Public list of users active in last 24 hours (limited fields). */
export async function GET() {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ users: [] }, 200);

    const cutoff = new Date(Date.now() - DAY_MS);
    const snap = await db
      .collection('publicUsers')
      .where('lastActiveAt', '>=', cutoff)
      .orderBy('lastActiveAt', 'desc')
      .limit(100)
      .get();

    const users = snap.docs.map((d) => {
      const data = d.data() || {};
      const ts = data.lastActiveAt;
      const lastActiveAt = ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null;
      const updatedTs = data.updatedAt;
      const updatedAt = updatedTs && typeof updatedTs.toDate === 'function' ? updatedTs.toDate().toISOString() : null;
      const appreciations = data.appreciations && typeof data.appreciations === 'object' ? data.appreciations : {};
      return {
        uid: String(data.uid || d.id),
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : null,
        totalJapas: typeof data.totalJapas === 'number' ? data.totalJapas : 0,
        appreciations: {
          heart: typeof appreciations.heart === 'number' ? appreciations.heart : 0,
          like: typeof appreciations.like === 'number' ? appreciations.like : 0,
          clap: typeof appreciations.clap === 'number' ? appreciations.clap : 0,
        },
        lastActiveAt,
        updatedAt,
      };
    });

    users.sort((a, b) => (b.totalJapas || 0) - (a.totalJapas || 0));
    return jsonResponse({ users }, 200);
  } catch (e) {
    console.error('public active-users GET', e);
    return jsonResponse({ users: [], error: e?.message || 'Failed' }, 200);
  }
}

