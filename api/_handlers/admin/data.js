/**
 * POST /api/admin/data - Single admin endpoint. Body: { type: "temples" | "marathons" | "users" }
 * Token: Authorization: Bearer <token> or X-Admin-Token.
 */
import {
  getDb,
  verifyAdminToken,
  jsonResponse,
  getAdminTokenFromRequest,
  jsonInternalServerError,
  isPremiumActiveFromDonorData,
} from '../_lib.js';
import admin from 'firebase-admin';

const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getAdminTokenFromRequest(request);
    if (!token) return jsonResponse({ error: 'Missing token' }, 401);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    let type = body?.type;
    if (!type) {
      try {
        const url = new URL(request.url);
        type = url.searchParams.get('type') || null;
      } catch {}
    }

    if (type === 'temples') {
      const snap = await db.collection('temples').orderBy('createdAt', 'desc').get();
      const temples = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        state: d.data().state,
        district: d.data().district,
        cityTownVillage: d.data().cityTownVillage,
        area: d.data().area,
        priestUsername: d.data().priestUsername,
      }));
      return jsonResponse({ temples });
    }

    if (type === 'marathons') {
      const marathonsSnap = await db.collection('marathons').get();
      const marathons = [];
      for (const d of marathonsSnap.docs) {
        const data = d.data();
        const isCommunity = data.isCommunity === true && data.communityName;
        let templeName = '—';
        let priestUsername = '—';
        if (isCommunity) {
          templeName = data.communityName || 'Community';
          priestUsername = '(Admin)';
        } else {
          const templeSnap = data.templeId ? await db.doc(`temples/${data.templeId}`).get() : null;
          const temple = templeSnap?.exists ? templeSnap.data() : null;
          templeName = temple?.name || '—';
          priestUsername = temple?.priestUsername || '—';
        }
        const participationsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
        const participants = participationsSnap.docs.map((p) => {
          const pData = p.data();
          return {
            userId: pData.userId,
            displayName: (typeof pData.displayName === 'string' && pData.displayName.trim())
              ? pData.displayName.trim()
              : (pData.userId?.slice(0, 12) || '—'),
            japasCount: pData.japasCount ?? 0
          };
        });
        participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
        marathons.push({
          id: d.id,
          templeId: data.templeId || null,
          isCommunity: !!isCommunity,
          templeName,
          priestUsername,
          deityId: data.deityId,
          deityName: DEITY_NAMES[data.deityId] || data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          topParticipants: participants.slice(0, 5),
        });
      }
      marathons.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      return jsonResponse({ marathons });
    }

    if (type === 'users') {
      const [unlockedSnap, blockedSnap, donorsSnap] = await Promise.all([
        db.collection('unlockedUsers').get(),
        db.collection('blockedUsers').get(),
        db.collection('donors').get(),
      ]);
      const blockedSet = new Set(blockedSnap.docs.map((d) => d.id));

      const unlockMetaByUid = new Map(
        unlockedSnap.docs.map((d) => {
          const data = d.data() || {};
          const uid = data.uid || d.id;
          return [uid, { unlockedAt: data.unlockedAt || null, email: data.email || null }];
        }),
      );

      const donorByUid = new Map(donorsSnap.docs.map((d) => [d.id, d.data() || {}]));

      let authRecords = [];
      let pageToken = undefined;
      try {
        do {
          const result = await admin.auth().listUsers(1000, pageToken);
          authRecords = authRecords.concat(result.users);
          pageToken = result.pageToken;
        } while (pageToken);
      } catch (e) {
        console.error('admin listUsers', e);
        return jsonResponse({ error: 'Could not list Firebase Auth users.' }, 503);
      }

      let activityByUid = new Map();
      try {
        const chunk = 400;
        for (let i = 0; i < authRecords.length; i += chunk) {
          const slice = authRecords.slice(i, i + chunk);
          const refs = slice.map((u) => db.doc(`users/${u.uid}/data/activity`));
          const snaps = refs.length ? await db.getAll(...refs) : [];
          for (let j = 0; j < snaps.length; j++) {
            const s = snaps[j];
            const uid = slice[j]?.uid;
            if (!s.exists || !uid) continue;
            const data = s.data() || {};
            const ts = data.lastActiveAt;
            const iso =
              ts && typeof ts.toDate === 'function'
                ? ts.toDate().toISOString()
                : typeof ts === 'string'
                  ? ts
                  : null;
            if (iso) activityByUid.set(uid, iso);
          }
        }
      } catch {
        activityByUid = new Map();
      }

      const users = authRecords
        .map((rec) => {
          const uid = rec.uid;
          const email = rec.email || unlockMetaByUid.get(uid)?.email || null;
          const unlockMeta = unlockMetaByUid.get(uid);
          const unlockedAt = unlockMeta?.unlockedAt || null;
          const hasUnlockRecord = unlockMeta != null;
          const donor = donorByUid.get(uid) || null;
          const donationAmountPaise = donor && typeof donor.amount === 'number' ? donor.amount : null;
          const lifetimeDonor = donor ? donor.lifetimeDonor === true : false;
          const premiumActive = isPremiumActiveFromDonorData(donor);
          const premiumExpiresAtMs =
            donor && typeof donor.premiumExpiresAt === 'string' ? Date.parse(donor.premiumExpiresAt) : NaN;

          let tier = 'free';
          if (premiumActive) tier = 'premium';
          else if (hasUnlockRecord) tier = 'pro';

          const lastSignInAt =
            typeof rec.metadata?.lastSignInTime === 'string' ? rec.metadata.lastSignInTime : null;
          const createdAt = typeof rec.metadata?.creationTime === 'string' ? rec.metadata.creationTime : null;

          return {
            uid,
            email,
            unlockedAt,
            tier,
            isPremium: tier === 'premium',
            donationAmountPaise,
            lifetimeDonor,
            premiumExpiresAt:
              premiumActive && Number.isFinite(premiumExpiresAtMs)
                ? new Date(premiumExpiresAtMs).toISOString()
                : null,
            isBlocked: blockedSet.has(uid),
            lastActiveAt: activityByUid.get(uid) || null,
            lastSignInAt,
            createdAt,
          };
        })
        .sort((a, b) => (b.lastSignInAt || '').localeCompare(a.lastSignInAt || ''));

      return jsonResponse({ users, total: users.length });
    }

    return jsonResponse({ error: 'Invalid type. Use temples, marathons, or users.' }, 400);
  } catch (e) {
    console.error('admin data', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/data.js');
  }
}
