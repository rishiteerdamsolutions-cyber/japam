import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import {
  istMonthKey,
  parseMonthKeyParam,
  publicFieldAutoDeity,
  publicFieldManualDeity,
} from '../_japamCounterMonth.js';
import { parseJapamCounterDeityParam } from '../_japamCounterDeity.js';

const TOP_N = 12;

/**
 * GET /api/public/japam-counter-leaderboard?month=YYYY-MM&mode=manual|auto|all&deity=shakthi
 * Rows: rank, uid, name, counterMode ('manual'|'auto'), japasCount (for that deity).
 */
export async function GET(request) {
  try {
    const viewerUid = (await verifyFirebaseUser(request)) || null;
    const db = getDb();
    if (!db) return jsonResponse({ leaderboard: [], monthKey: istMonthKey() }, 200);

    const url = new URL(request.url);
    const monthKey = parseMonthKeyParam(url.searchParams.get('month'));
    const modeParam = (url.searchParams.get('mode') || 'all').trim().toLowerCase();
    const deity = parseJapamCounterDeityParam(url.searchParams.get('deity'));
    if (!deity) {
      return jsonResponse({ error: 'deity query parameter is required' }, 400);
    }
    const fManual = publicFieldManualDeity(monthKey, deity);
    const fAuto = publicFieldAutoDeity(monthKey, deity);

    async function fetchByField(field) {
      try {
        const snap = await db
          .collection('publicUsers')
          .where(field, '>', 0)
          .orderBy(field, 'desc')
          .limit(60)
          .get();
        return snap.docs;
      } catch (e) {
        console.warn('japam-counter-leaderboard query', field, e?.message || e);
        return [];
      }
    }

    const docs = new Map();
    if (modeParam === 'manual' || modeParam === 'all') {
      for (const d of await fetchByField(fManual)) docs.set(d.id, d);
    }
    if (modeParam === 'auto' || modeParam === 'all') {
      for (const d of await fetchByField(fAuto)) docs.set(d.id, d);
    }

    const rows = [];
    for (const d of docs.values()) {
      const data = d.data() || {};
      const uid = String(data.uid || d.id);
      const name =
        typeof data.name === 'string' && data.name.trim()
          ? data.name.trim().slice(0, 80)
          : uid.slice(0, 8);
      if (modeParam === 'manual' || modeParam === 'all') {
        const n = Math.max(0, Math.round(Number(data[fManual]) || 0));
        if (n > 0) rows.push({ uid, name, counterMode: 'manual', japasCount: n });
      }
      if (modeParam === 'auto' || modeParam === 'all') {
        const n = Math.max(0, Math.round(Number(data[fAuto]) || 0));
        if (n > 0) rows.push({ uid, name, counterMode: 'auto', japasCount: n });
      }
    }

    rows.sort((a, b) => b.japasCount - a.japasCount);

    const top = rows.slice(0, TOP_N).map((p, i) => ({
      rank: i + 1,
      uid: p.uid,
      name: p.name,
      counterMode: p.counterMode,
      japasCount: p.japasCount,
    }));

    if (viewerUid) {
      for (const mine of rows.filter((r) => r.uid === viewerUid)) {
        if (!top.some((e) => e.uid === mine.uid && e.counterMode === mine.counterMode)) {
          const rank = rows.findIndex((r) => r.uid === mine.uid && r.counterMode === mine.counterMode) + 1;
          if (rank > 0 && mine.japasCount > 0) {
            top.push({
              rank,
              uid: mine.uid,
              name: mine.name,
              counterMode: mine.counterMode,
              japasCount: mine.japasCount,
            });
          }
        }
      }
    }

    let viewerManual = 0;
    let viewerAuto = 0;
    if (viewerUid) {
      try {
        const snap = await db.doc(`publicUsers/${viewerUid}`).get();
        const data = snap.exists ? snap.data() || {} : {};
        viewerManual = Math.max(0, Math.round(Number(data[fManual]) || 0));
        viewerAuto = Math.max(0, Math.round(Number(data[fAuto]) || 0));
      } catch {
        /* ignore */
      }
    }

    return jsonResponse({ leaderboard: top, monthKey, deity, viewerManual, viewerAuto }, 200);
  } catch (e) {
    console.error('japam-counter-leaderboard', e);
    return jsonInternalServerError(e, 'api/_handlers/public/japam-counter-leaderboard.js');
  }
}
