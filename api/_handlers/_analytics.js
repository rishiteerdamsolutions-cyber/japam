import admin from 'firebase-admin';
import { isUserUnlocked } from './_lib.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHAMPION_TOP_N = 10;

function toIsoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function parseIsoDay(day) {
  if (!day || typeof day !== 'string') return null;
  const ms = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function daysBetween(fromDay, toDay) {
  const a = parseIsoDay(fromDay);
  const b = parseIsoDay(toDay);
  if (a == null || b == null) return 0;
  return Math.floor((b - a) / DAY_MS);
}

function normalizeNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function classifyUser(behavior, isChampion = false) {
  const totalJapam = normalizeNumber(behavior.total_japam, 0);
  const currentStreak = normalizeNumber(behavior.current_streak, 0);
  const lastJapamDate = typeof behavior.last_japam_date === 'string' ? behavior.last_japam_date : null;
  const inactiveDays = lastJapamDate ? daysBetween(lastJapamDate, toIsoDay(Date.now())) : 999;

  if (inactiveDays >= 3) return 'dormant';
  if (isChampion) return 'champion';
  if (currentStreak >= 3) return 'devotee';
  if (totalJapam >= 108) return 'engaged';
  if (totalJapam > 0 && totalJapam < 50) return 'beginner';
  return 'explorer';
}

export function detectDropOffStage(behavior) {
  const totalJapam = normalizeNumber(behavior.total_japam, 0);
  const maxStreak = normalizeNumber(behavior.max_streak, 0);
  const lastJapamDate = typeof behavior.last_japam_date === 'string' ? behavior.last_japam_date : null;

  if (totalJapam <= 0) return 'no_start';
  if (!lastJapamDate) return 'active';
  const inactivityDays = daysBetween(lastJapamDate, toIsoDay(Date.now()));
  if (maxStreak >= 7 && inactivityDays >= 2) return 'high_value_loss';
  if (inactivityDays >= 2 && totalJapam < 108) return 'early_drop';
  return 'active';
}

function streakFromLastDate(lastJapamDate, todayDay, currentStreak) {
  if (!lastJapamDate) return { current_streak: 1, streak_updated: true };
  const gap = daysBetween(lastJapamDate, todayDay);
  if (gap <= 0) return { current_streak: currentStreak, streak_updated: false };
  if (gap === 1) return { current_streak: currentStreak + 1, streak_updated: true };
  return { current_streak: 1, streak_updated: true };
}

async function markDailyActivity(db, uid, behaviorRef, now, todayDay) {
  const markerRef = db.doc(`analyticsActivity/${todayDay}_${uid}`);
  const dailyRef = db.doc(`analyticsDaily/${todayDay}`);
  let becameActiveToday = false;
  let firstTrackedToday = false;

  await db.runTransaction(async (tx) => {
    const [markerSnap, behaviorSnap] = await Promise.all([tx.get(markerRef), tx.get(behaviorRef)]);
    if (!markerSnap.exists) {
      becameActiveToday = true;
      const behavior = behaviorSnap.exists ? behaviorSnap.data() || {} : {};
      const createdAtDay = typeof behavior.created_at_day === 'string' ? behavior.created_at_day : null;
      firstTrackedToday = createdAtDay === todayDay || !createdAtDay;
      tx.set(markerRef, {
        uid,
        day: todayDay,
        createdAt: now,
        isNewUserForDay: firstTrackedToday,
      });
      tx.set(
        dailyRef,
        {
          day: todayDay,
          updated_at: now,
          dau: admin.firestore.FieldValue.increment(1),
          new_users: admin.firestore.FieldValue.increment(firstTrackedToday ? 1 : 0),
          returning_users: admin.firestore.FieldValue.increment(firstTrackedToday ? 0 : 1),
        },
        { merge: true },
      );
    }
  });

  return { becameActiveToday, firstTrackedToday };
}

async function syncBehaviorMirror(db, uid, payload) {
  await db.doc(`analyticsUsers/${uid}`).set(
    {
      uid,
      ...payload,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function touchUserLogin(db, uid) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayDay = toIsoDay(Date.now());
  const behaviorRef = db.doc(`users/${uid}/data/behavior`);
  const snap = await behaviorRef.get();
  const existing = snap.exists ? snap.data() || {} : {};
  const next = {
    created_at: existing.created_at || now,
    created_at_day: existing.created_at_day || todayDay,
    last_login: now,
    last_active_at: now,
    total_sessions: normalizeNumber(existing.total_sessions, 0),
    total_japam: normalizeNumber(existing.total_japam, 0),
    current_streak: normalizeNumber(existing.current_streak, 0),
    max_streak: normalizeNumber(existing.max_streak, 0),
    shared_count: normalizeNumber(existing.shared_count, 0),
    referred_users_count: normalizeNumber(existing.referred_users_count, 0),
    referral_code: typeof existing.referral_code === 'string' && existing.referral_code ? existing.referral_code : uid.slice(0, 8).toUpperCase(),
    is_paid: existing.is_paid === true,
  };
  next.user_type = classifyUser(next, existing.user_type === 'champion');
  next.drop_off_stage = detectDropOffStage(next);
  await behaviorRef.set(next, { merge: true });
  await syncBehaviorMirror(db, uid, next);
  await markDailyActivity(db, uid, behaviorRef, now, todayDay);
}

export async function upsertBehaviorFromJapa(db, uid, counts, prev) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayDay = toIsoDay(Date.now());
  const behaviorRef = db.doc(`users/${uid}/data/behavior`);
  const behaviorSnap = await behaviorRef.get();
  const existing = behaviorSnap.exists ? behaviorSnap.data() || {} : {};
  const prevTotal = normalizeNumber(prev?.total, 0);
  const nextTotal = normalizeNumber(counts?.total, 0);
  const japamDelta = Math.max(0, nextTotal - prevTotal);

  const curStreak = normalizeNumber(existing.current_streak, 0);
  const lastJapamDate = typeof existing.last_japam_date === 'string' ? existing.last_japam_date : null;
  const streakCalc = streakFromLastDate(lastJapamDate, todayDay, curStreak);
  const maxStreak = Math.max(normalizeNumber(existing.max_streak, 0), streakCalc.current_streak);
  const isPaid = await isUserUnlocked(db, uid);

  const next = {
    created_at: existing.created_at || now,
    created_at_day: existing.created_at_day || todayDay,
    last_login: existing.last_login || now,
    last_active_at: now,
    last_japam_date: todayDay,
    total_japam: Math.max(normalizeNumber(existing.total_japam, 0), nextTotal),
    total_sessions: normalizeNumber(existing.total_sessions, 0) + (daysBetween(lastJapamDate, todayDay) > 0 ? 1 : 0),
    current_streak: streakCalc.current_streak,
    max_streak: maxStreak,
    streak_updated_at: streakCalc.streak_updated ? now : existing.streak_updated_at || now,
    shared_count: normalizeNumber(existing.shared_count, 0),
    referral_code: typeof existing.referral_code === 'string' && existing.referral_code ? existing.referral_code : uid.slice(0, 8).toUpperCase(),
    referred_users_count: normalizeNumber(existing.referred_users_count, 0),
    is_paid: isPaid === true,
  };
  next.user_type = classifyUser(next, existing.user_type === 'champion');
  next.drop_off_stage = detectDropOffStage(next);

  await behaviorRef.set(next, { merge: true });
  await syncBehaviorMirror(db, uid, next);

  const { becameActiveToday } = await markDailyActivity(db, uid, behaviorRef, now, todayDay);
  const dailyUpdates = {
    day: todayDay,
    updated_at: now,
    total_japam: admin.firestore.FieldValue.increment(japamDelta),
  };
  if (becameActiveToday) {
    dailyUpdates.avg_japam_per_user = 0;
  }
  await db.doc(`analyticsDaily/${todayDay}`).set(dailyUpdates, { merge: true });
}

export async function trackShareEvent(db, uid, eventType) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayDay = toIsoDay(Date.now());
  const behaviorRef = db.doc(`users/${uid}/data/behavior`);
  const snap = await behaviorRef.get();
  const existing = snap.exists ? snap.data() || {} : {};
  const sharedCount = normalizeNumber(existing.shared_count, 0) + 1;
  const next = {
    created_at: existing.created_at || now,
    created_at_day: existing.created_at_day || todayDay,
    last_login: existing.last_login || now,
    last_active_at: now,
    shared_count: sharedCount,
    referral_code: typeof existing.referral_code === 'string' && existing.referral_code ? existing.referral_code : uid.slice(0, 8).toUpperCase(),
    total_japam: normalizeNumber(existing.total_japam, 0),
    total_sessions: normalizeNumber(existing.total_sessions, 0),
    current_streak: normalizeNumber(existing.current_streak, 0),
    max_streak: normalizeNumber(existing.max_streak, 0),
    referred_users_count: normalizeNumber(existing.referred_users_count, 0),
    is_paid: existing.is_paid === true,
  };
  next.user_type = classifyUser(next, existing.user_type === 'champion');
  next.drop_off_stage = detectDropOffStage(next);
  await behaviorRef.set(next, { merge: true });
  await syncBehaviorMirror(db, uid, next);
  await markDailyActivity(db, uid, behaviorRef, now, todayDay);
  await db.doc(`analyticsDaily/${todayDay}`).set(
    {
      day: todayDay,
      updated_at: now,
      total_shares: admin.firestore.FieldValue.increment(1),
      rank_card_downloads: admin.firestore.FieldValue.increment(eventType === 'rank_card_download' ? 1 : 0),
      share_clicks: admin.firestore.FieldValue.increment(eventType === 'share_click' ? 1 : 0),
    },
    { merge: true },
  );
}

export async function trackReferral(db, uid, referredUid = null) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayDay = toIsoDay(Date.now());
  const behaviorRef = db.doc(`users/${uid}/data/behavior`);
  const snap = await behaviorRef.get();
  const existing = snap.exists ? snap.data() || {} : {};
  const next = {
    created_at: existing.created_at || now,
    created_at_day: existing.created_at_day || todayDay,
    last_login: existing.last_login || now,
    last_active_at: now,
    shared_count: normalizeNumber(existing.shared_count, 0),
    referral_code: typeof existing.referral_code === 'string' && existing.referral_code ? existing.referral_code : uid.slice(0, 8).toUpperCase(),
    total_japam: normalizeNumber(existing.total_japam, 0),
    total_sessions: normalizeNumber(existing.total_sessions, 0),
    current_streak: normalizeNumber(existing.current_streak, 0),
    max_streak: normalizeNumber(existing.max_streak, 0),
    referred_users_count: normalizeNumber(existing.referred_users_count, 0) + 1,
    is_paid: existing.is_paid === true,
  };
  next.user_type = classifyUser(next, existing.user_type === 'champion');
  next.drop_off_stage = detectDropOffStage(next);
  await behaviorRef.set(next, { merge: true });
  await syncBehaviorMirror(db, uid, next);
  await db.doc(`analyticsDaily/${todayDay}`).set(
    {
      day: todayDay,
      updated_at: now,
      referral_growth: admin.firestore.FieldValue.increment(1),
    },
    { merge: true },
  );
  if (referredUid) {
    await db.doc(`analytics/referrals/${uid}_${referredUid}`).set(
      {
        referrerUid: uid,
        referredUid,
        createdAt: now,
      },
      { merge: true },
    );
  }
}

export function getDayKeyFromOffset(days = 0) {
  return toIsoDay(Date.now() + days * DAY_MS);
}

export async function computeDailyRetention(db, baseDay) {
  const d1 = baseDay;
  const d2 = toIsoDay(parseIsoDay(baseDay) + DAY_MS);
  const d7 = toIsoDay(parseIsoDay(baseDay) + 7 * DAY_MS);

  const [day1Snap, day2Snap, day7Snap] = await Promise.all([
    db.collection('analyticsActivity').where('day', '==', d1).get(),
    db.collection('analyticsActivity').where('day', '==', d2).get(),
    db.collection('analyticsActivity').where('day', '==', d7).get(),
  ]);
  const toUid = (d) => d.data()?.uid || (d.id.includes('_') ? d.id.split('_')[1] : d.id);
  const day1Set = new Set(day1Snap.docs.map(toUid).filter(Boolean));
  const day2Set = new Set(day2Snap.docs.map(toUid).filter(Boolean));
  const day7Set = new Set(day7Snap.docs.map(toUid).filter(Boolean));
  let retained2 = 0;
  let retained7 = 0;
  for (const uid of day1Set) {
    if (day2Set.has(uid)) retained2 += 1;
    if (day7Set.has(uid)) retained7 += 1;
  }
  const baseCount = day1Set.size;
  return {
    day1_users: baseCount,
    day1_day2_retained: retained2,
    day1_day7_retained: retained7,
    day1_day2_retention_pct: baseCount > 0 ? Math.round((retained2 / baseCount) * 10000) / 100 : 0,
    day1_day7_retention_pct: baseCount > 0 ? Math.round((retained7 / baseCount) * 10000) / 100 : 0,
  };
}

export async function applyChampionClassification(db) {
  const snap = await db.collection('analyticsUsers').orderBy('current_streak', 'desc').orderBy('total_japam', 'desc').limit(CHAMPION_TOP_N).get();
  const championIds = new Set(snap.docs.map((d) => d.id));
  const updates = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const userType = classifyUser(data, true);
    const dropOff = detectDropOffStage(data);
    updates.push(
      docSnap.ref.set({ user_type: userType, drop_off_stage: dropOff, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
      db.doc(`users/${docSnap.id}/data/behavior`).set({ user_type: userType, drop_off_stage: dropOff }, { merge: true }),
    );
  }
  return { championIds, updatesCount: updates.length };
}
