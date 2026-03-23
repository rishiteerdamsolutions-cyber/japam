import admin from 'firebase-admin';
import { getDb, jsonResponse } from '../_lib.js';
import { applyChampionClassification, computeDailyRetention, getDayKeyFromOffset } from '../_analytics.js';

export async function runDailyAnalyticsAggregation(db) {
  const today = getDayKeyFromOffset(0);
  const stateRef = db.doc('config/analyticsDailyState');
  let shouldRun = false;

  await db.runTransaction(async (tx) => {
    const stateSnap = await tx.get(stateRef);
    const lastRunDay = stateSnap.exists ? stateSnap.data()?.lastRunDay : null;
    if (lastRunDay === today) return;
    shouldRun = true;
    tx.set(
      stateRef,
      {
        lastRunDay: today,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  if (!shouldRun) {
    return { ok: true, day: today, skipped: true, reason: 'already-ran-today' };
  }

  const retentionBase = getDayKeyFromOffset(-8);
  const [todaySnap, usersSnap] = await Promise.all([db.doc(`analytics/daily/${today}`).get(), db.collection('analyticsUsers').get()]);
  const todayData = todaySnap.exists ? todaySnap.data() || {} : {};
  const dau = todayData.dau || 0;
  const totalJapam = todayData.total_japam || 0;
  const avgJapamPerUser = dau > 0 ? Math.round((totalJapam / dau) * 100) / 100 : 0;
  const retention = await computeDailyRetention(db, retentionBase);
  const champions = await applyChampionClassification(db);
  const streakDistribution = { zero: 0, oneToTwo: 0, threeToSix: 0, sevenPlus: 0 };
  for (const d of usersSnap.docs) {
    const s = d.data()?.current_streak || 0;
    if (s <= 0) streakDistribution.zero += 1;
    else if (s <= 2) streakDistribution.oneToTwo += 1;
    else if (s <= 6) streakDistribution.threeToSix += 1;
    else streakDistribution.sevenPlus += 1;
  }

  await db.doc(`analytics/daily/${today}`).set(
    {
      day: today,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      total_users: usersSnap.size,
      avg_japam_per_user: avgJapamPerUser,
      streak_distribution: streakDistribution,
      day1_day2_retention_pct: retention.day1_day2_retention_pct,
      day1_day7_retention_pct: retention.day1_day7_retention_pct,
      champion_count: champions.championIds.size,
    },
    { merge: true },
  );

  return {
    ok: true,
    day: today,
    skipped: false,
    totalUsers: usersSnap.size,
    championCount: champions.championIds.size,
    avgJapamPerUser,
  };
}

/** GET /api/cron/analytics-daily - Daily heavy aggregation (run once/day). */
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
    const result = await runDailyAnalyticsAggregation(db);
    return jsonResponse(result, 200);
  } catch (e) {
    console.error('cron analytics-daily GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
