import { getDb, jsonResponse } from '../_lib.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function mapDocToUser(d, data) {
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
}

/** GET /api/public/active-users - Read cached active users (refreshed daily at 3 AM IST). Fallback to live query if cache empty. */
export async function GET() {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ users: [] }, 200);

    const snap = await db.doc('config/activeUsersCache').get();
    let users = [];
    if (snap.exists) {
      const data = snap.data() || {};
      users = Array.isArray(data.users) ? data.users : [];
    }
    // Fallback: if cache empty (e.g. first deploy before cron runs), do live query once
    if (users.length === 0) {
      const cutoff = new Date(Date.now() - DAY_MS);
      const liveSnap = await db
        .collection('publicUsers')
        .where('lastActiveAt', '>=', cutoff)
        .orderBy('lastActiveAt', 'desc')
        .limit(50)
        .get();
      users = liveSnap.docs.map((d) => mapDocToUser(d, d.data() || {}));
      users.sort((a, b) => (b.totalJapas || 0) - (a.totalJapas || 0));
    }

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('public active-users GET', e);
    return jsonResponse({ users: [], error: e?.message || 'Failed' }, 200);
  }
}
