import { getDb, jsonResponse } from '../_lib.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** GET /api/cron/refresh-active-users - Refresh active users cache. Call via Vercel cron at 3 AM IST. */
export async function GET(request) {
  try {
    const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
    const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('x-cron-secret');
    const authMatch = secret && (auth === `Bearer ${secret}` || auth === secret);
    if (!authMatch) {
      return jsonResponse({ error: 'Unauthorized (CRON_SECRET or ADMIN_SECRET required)' }, 401);
    }

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const cutoff = new Date(Date.now() - DAY_MS);
    let docs = [];
    try {
      const snap = await db
        .collection('publicUsers')
        .where('lastActiveAt', '>=', cutoff)
        .orderBy('lastActiveAt', 'desc')
        .limit(50)
        .get();
      docs = snap.docs;
    } catch {
      // lastActiveAt index may not exist
    }
    if (docs.length === 0) {
      const fallback = await db
        .collection('publicUsers')
        .where('updatedAt', '>=', cutoff)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();
      docs = fallback.docs;
    }

    const users = docs.map((d) => {
      const data = d.data() || {};
      const ts = data.lastActiveAt ?? data.updatedAt;
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

    await db.doc('config/activeUsersCache').set({ users, updatedAt: Date.now() }, { merge: true });
    return jsonResponse({ ok: true, count: users.length }, 200);
  } catch (e) {
    console.error('cron refresh-active-users', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
