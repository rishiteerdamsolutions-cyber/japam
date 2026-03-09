import { getDb, jsonResponse } from '../_lib.js';

/** GET /api/cron/update-maha-yagna-counters - Aggregate userJapas into currentJapas. Run daily via Vercel cron. */
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

    const activeSnap = await db.collection('mahaJapaYagnas').where('status', '==', 'active').get();
    let updated = 0;

    for (const yDoc of activeSnap.docs) {
      const yData = yDoc.data();
      const goalJapas = typeof yData.goalJapas === 'number' ? yData.goalJapas : 0;
      const usersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', yDoc.id).get();
      let sum = 0;
      for (const u of usersSnap.docs) {
        const uData = u.data();
        sum += typeof uData.userJapas === 'number' ? uData.userJapas : 0;
      }
      const updates = { currentJapas: sum };
      if (sum >= goalJapas) {
        updates.status = 'completed';
      }
      await yDoc.ref.update(updates);
      updated++;
    }

    return jsonResponse({ ok: true, updated }, 200);
  } catch (e) {
    console.error('cron update-maha-yagna-counters', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
