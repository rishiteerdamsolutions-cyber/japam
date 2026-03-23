import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';
import { computeDailyRetention, getDayKeyFromOffset } from '../_analytics.js';
import { runDailyAnalyticsAggregation } from '../cron/analytics-daily.js';

function tsToIso(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

/** GET /api/admin/analytics-overview - Cost-efficient snapshot for admin dashboard cards. */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token) return jsonResponse({ error: 'Missing token' }, 401);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    // Fallback path: if scheduled job missed today, run aggregation once on first admin hit.
    await runDailyAnalyticsAggregation(db);

    const today = getDayKeyFromOffset(0);
    const yesterday = getDayKeyFromOffset(-1);
    const retentionBase = getDayKeyFromOffset(-8);
    const [todaySnap, yesterdaySnap, topSnap, highValueInactiveSnap, onboardingStuckSnap, totalUsersAgg] = await Promise.all([
      db.doc(`analyticsDaily/${today}`).get(),
      db.doc(`analyticsDaily/${yesterday}`).get(),
      db.collection('analyticsUsers').orderBy('total_japam', 'desc').limit(10).get(),
      db.collection('analyticsUsers').where('drop_off_stage', '==', 'high_value_loss').limit(20).get(),
      db.collection('analyticsUsers').where('drop_off_stage', '==', 'no_start').limit(20).get(),
      db.collection('analyticsUsers').count().get(),
    ]);

    const todayData = todaySnap.exists ? todaySnap.data() || {} : {};
    const yesterdayData = yesterdaySnap.exists ? yesterdaySnap.data() || {} : {};
    const retention = await computeDailyRetention(db, retentionBase);

    const streakDistribution = todayData.streak_distribution || { zero: 0, oneToTwo: 0, threeToSix: 0, sevenPlus: 0 };

    const leaderboard = topSnap.docs.map((d) => {
      const data = d.data() || {};
      return {
        uid: d.id,
        total_japam: typeof data.total_japam === 'number' ? data.total_japam : 0,
        current_streak: typeof data.current_streak === 'number' ? data.current_streak : 0,
        user_type: typeof data.user_type === 'string' ? data.user_type : 'explorer',
        last_active_at: tsToIso(data.last_active_at),
      };
    });

    const streakBrokenYesterday = await db
      .collection('analyticsUsers')
      .where('current_streak', '==', 0)
      .where('last_japam_date', '==', yesterday)
      .limit(20)
      .get();

    return jsonResponse(
      {
        users: {
          total_users: totalUsersAgg?.data()?.count || 0,
          active_users_today: todayData.dau || 0,
          new_users_today: todayData.new_users || 0,
          returning_users_today: todayData.returning_users || 0,
        },
        retention: {
          day1_day2_retention_pct: retention.day1_day2_retention_pct,
          day1_day7_retention_pct: retention.day1_day7_retention_pct,
          streak_distribution: streakDistribution,
        },
        activity: {
          total_japam_today: todayData.total_japam || 0,
          avg_japam_per_user: todayData.dau > 0 ? Math.round(((todayData.total_japam || 0) / todayData.dau) * 100) / 100 : 0,
          top_users: leaderboard,
        },
        virality: {
          total_shares: todayData.total_shares || 0,
          rank_card_downloads: todayData.rank_card_downloads || 0,
          referral_growth: todayData.referral_growth || 0,
        },
        alerts: {
          high_value_users_inactive: highValueInactiveSnap.docs.map((d) => ({ uid: d.id, ...(d.data() || {}) })),
          broke_streak_yesterday: streakBrokenYesterday.docs.map((d) => ({ uid: d.id, ...(d.data() || {}) })),
          stuck_onboarding: onboardingStuckSnap.docs.map((d) => ({ uid: d.id, ...(d.data() || {}) })),
        },
        previous_day: {
          day: yesterday,
          dau: yesterdayData.dau || 0,
          total_japam: yesterdayData.total_japam || 0,
        },
      },
      200,
    );
  } catch (e) {
    console.error('admin analytics-overview GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
