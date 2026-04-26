import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';

const TOP_N = 12;

/** Must match `DEITY_IDS` in `api/_handlers/user/japa.js` (Firestore `pd_{id}` public fields). */
const DEITY_IDS = new Set([
  'rama',
  'shiva',
  'ganesh',
  'surya',
  'shakthi',
  'krishna',
  'shanmukha',
  'venkateswara',
  'hanuman',
  'narasimha',
  'lakshmi',
  'durga',
  'saraswati',
  'ayyappan',
  'jagannath',
  'dattatreya',
  'saiBaba',
  'narayana',
  'iskcon',
  'guru',
  'shani',
  'rahu',
  'ketu',
  'bramhamgaaru',
]);

/**
 * GET /api/public/pushpa-abhisheka-leaderboard (Pushpa Aradhana — flowers offered; UI route `/pushpa-aradhana`).
 * - No `deity`: top by lifetime flower sum (`pushpaAbhishekaJapa` on publicUsers).
 * - `?deity=rama`: top by that Devatā (`pd_rama`).
 * Optional Authorization: when signed in, appends your row if you are outside the top list.
 */
export async function GET(request) {
  try {
    const viewerUid = (await verifyFirebaseUser(request)) || null;
    const db = getDb();
    if (!db) return jsonResponse({ leaderboard: [] }, 200);

    const url = new URL(request.url);
    const deityParam = (url.searchParams.get('deity') || '').trim().toLowerCase();
    const useDeity = deityParam && DEITY_IDS.has(deityParam) ? deityParam : null;
    const sortField = useDeity ? `pd_${useDeity}` : 'pushpaAbhishekaJapa';

    let snap;
    try {
      snap = await db
        .collection('publicUsers')
        .where(sortField, '>', 0)
        .orderBy(sortField, 'desc')
        .limit(80)
        .get();
    } catch (e) {
      console.warn('pushpa-abhisheka-leaderboard query', e?.message || e);
      return jsonResponse({ leaderboard: [] }, 200);
    }

    const rows = snap.docs.map((d) => {
      const data = d.data() || {};
      const uid = String(data.uid || d.id);
      const name =
        typeof data.name === 'string' && data.name.trim()
          ? data.name.trim().slice(0, 80)
          : uid.slice(0, 8);
      let pushpaCount = 0;
      if (useDeity) {
        const k = `pd_${useDeity}`;
        pushpaCount = typeof data[k] === 'number' ? Math.max(0, Math.round(data[k])) : 0;
      } else {
        pushpaCount =
          typeof data.pushpaAbhishekaJapa === 'number'
            ? Math.max(0, Math.round(data.pushpaAbhishekaJapa))
            : 0;
      }
      return { uid, name, pushpaCount };
    });
    rows.sort((a, b) => b.pushpaCount - a.pushpaCount);

    const top = rows.slice(0, TOP_N).map((p, i) => ({
      rank: i + 1,
      uid: p.uid,
      name: p.name,
      pushpaCount: p.pushpaCount,
    }));

    if (viewerUid && !top.some((e) => e.uid === viewerUid)) {
      const mine = rows.find((r) => r.uid === viewerUid);
      if (mine && mine.pushpaCount > 0) {
        const rank = rows.findIndex((r) => r.uid === viewerUid) + 1;
        top.push({
          rank,
          uid: mine.uid,
          name: mine.name,
          pushpaCount: mine.pushpaCount,
        });
      }
    }

    return jsonResponse({ leaderboard: top }, 200);
  } catch (e) {
    console.error('pushpa-abhisheka-leaderboard', e);
    return jsonInternalServerError(e, 'api/_handlers/public/pushpa-abhisheka-leaderboard.js');
  }
}
