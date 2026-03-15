import { getDb, jsonResponse, getAdminTokenFromRequest, verifyAdminToken } from '../_lib.js';

/** GET /api/admin/reward-video-analytics - Aggregated analytics for Adyathmika & Advertisement reward videos. */
export async function GET(request) {
  const token = getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from'); // ISO date or ms
    const toParam = url.searchParams.get('to');
    let fromMs = 0;
    let toMs = Date.now() + 86400000;
    if (fromParam) {
      const n = Number(fromParam);
      fromMs = Number.isFinite(n) ? n : new Date(fromParam).getTime();
    }
    if (toParam) {
      const n = Number(toParam);
      toMs = Number.isFinite(n) ? n : new Date(toParam).getTime();
    }

    const snapshot = await db.collection('rewardVideoEvents').get();
    const events = [];
    snapshot.docs.forEach((d) => {
      const data = d.data();
      const ts = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt && typeof data.createdAt === 'number' ? data.createdAt : 0);
      if (ts >= fromMs && ts <= toMs) {
        events.push({
          userId: data.userId,
          videoId: data.videoId,
          type: data.type || 'adyathmika',
          event: data.event,
          rewardType: data.rewardType,
        });
      }
    });

    const byVideo = new Map();
    const byType = { adyathmika: { started: 0, completed: 0, continueClicked: 0, uniqueViewers: new Set(), repeatViewerIds: new Set() }, advertisement: { started: 0, completed: 0, continueClicked: 0, uniqueViewers: new Set(), repeatViewerIds: new Set() } };

    const startedByVideoUser = new Map();
    for (const e of events) {
      const key = `${e.videoId}|${e.type}`;
      if (!byVideo.has(key)) {
        byVideo.set(key, {
          videoId: e.videoId,
          type: e.type,
          started: 0,
          completed: 0,
          continueClicked: 0,
          uniqueViewers: new Set(),
          repeatViewerIds: new Set(),
        });
      }
      const row = byVideo.get(key);
      const typeRow = byType[e.type] || byType.adyathmika;

      if (e.event === 'started') {
        row.started++;
        typeRow.started++;
        row.uniqueViewers.add(e.userId);
        typeRow.uniqueViewers.add(e.userId);
        const userKey = `${e.videoId}|${e.type}|${e.userId}`;
        const count = (startedByVideoUser.get(userKey) || 0) + 1;
        startedByVideoUser.set(userKey, count);
        if (count > 1) {
          row.repeatViewerIds.add(e.userId);
          typeRow.repeatViewerIds.add(e.userId);
        }
      } else if (e.event === 'completed') {
        row.completed++;
        typeRow.completed++;
      } else if (e.event === 'continue_clicked') {
        row.continueClicked++;
        typeRow.continueClicked++;
      }
    }

    const byVideoList = Array.from(byVideo.entries()).map(([k, v]) => ({
      videoId: v.videoId,
      type: v.type,
      started: v.started,
      completed: v.completed,
      continueClicked: v.continueClicked,
      uniqueViewers: v.uniqueViewers.size,
      repeatViewers: v.repeatViewerIds.size,
      completionRatePct: v.started ? Math.round((v.completed / v.started) * 100) : 0,
      continueRatePct: v.completed ? Math.round((v.continueClicked / v.completed) * 100) : 0,
    }));

    const summary = {
      adyathmika: {
        totalStarted: byType.adyathmika.started,
        totalCompleted: byType.adyathmika.completed,
        totalContinueClicked: byType.adyathmika.continueClicked,
        uniqueViewers: byType.adyathmika.uniqueViewers.size,
        repeatViewers: byType.adyathmika.repeatViewerIds.size,
        completionRatePct: byType.adyathmika.started ? Math.round((byType.adyathmika.completed / byType.adyathmika.started) * 100) : 0,
        continueRatePct: byType.adyathmika.completed ? Math.round((byType.adyathmika.continueClicked / byType.adyathmika.completed) * 100) : 0,
      },
      advertisement: {
        totalStarted: byType.advertisement.started,
        totalCompleted: byType.advertisement.completed,
        totalContinueClicked: byType.advertisement.continueClicked,
        uniqueViewers: byType.advertisement.uniqueViewers.size,
        repeatViewers: byType.advertisement.repeatViewerIds.size,
        completionRatePct: byType.advertisement.started ? Math.round((byType.advertisement.completed / byType.advertisement.started) * 100) : 0,
        continueRatePct: byType.advertisement.completed ? Math.round((byType.advertisement.continueClicked / byType.advertisement.completed) * 100) : 0,
      },
      totalEvents: events.length,
    };

    return jsonResponse({
      byVideo: byVideoList,
      byType: summary,
      fromMs,
      toMs,
    });
  } catch (e) {
    console.error('admin reward-video-analytics', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
