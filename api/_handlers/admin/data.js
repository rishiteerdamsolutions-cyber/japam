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
const DEITY_IDS = [
  'rama', 'shiva', 'ganesh', 'surya', 'shakthi', 'krishna', 'shanmukha', 'venkateswara',
  'hanuman', 'narasimha', 'lakshmi', 'durga', 'saraswati', 'ayyappan', 'jagannath', 'dattatreya',
  'saiBaba', 'narayana', 'iskcon', 'guru', 'shani', 'rahu', 'ketu', 'bramhamgaaru',
];
const MAX_ADMIN_USERS_SCAN = Math.max(500, Math.min(10000, Number(process.env.ADMIN_USERS_MAX_SCAN || 3000) || 3000));

function sanitizePhoneForWhatsapp(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let n = raw.replace(/[^\d]/g, '');
  if (!n) return null;
  if (n.length === 11 && n.startsWith('0')) n = n.slice(1);
  if (n.length === 10) n = `91${n}`;
  return n.length >= 10 ? n : null;
}

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
      const [unlockedSnap, blockedSnap, donorsSnap, paidOrdersSnap, marathonPartsSnap, yagnaUsersSnap, pdfContactsSnap] = await Promise.all([
        db.collection('unlockedUsers').get(),
        db.collection('blockedUsers').get(),
        db.collection('donors').get(),
        db.collection('orders').where('status', '==', 'paid').limit(5000).get().catch(() => ({ docs: [] })),
        db.collection('marathonParticipations').limit(10000).get().catch(() => ({ docs: [] })),
        db.collection('mahaJapaYagnaUsers').limit(10000).get().catch(() => ({ docs: [] })),
        db.collection('japaPdfContacts').orderBy('createdAt', 'desc').limit(5000).get().catch(() => ({ docs: [] })),
      ]);
      const blockedSet = new Set(blockedSnap.docs.map((d) => d.id));
      const paidByUid = new Set(
        paidOrdersSnap.docs
          .map((d) => d.data()?.uid)
          .filter((v) => typeof v === 'string' && v),
      );
      const marathonByUid = new Set(
        marathonPartsSnap.docs
          .map((d) => d.data()?.userId)
          .filter((v) => typeof v === 'string' && v),
      );
      const yagnaByUid = new Set(
        yagnaUsersSnap.docs
          .map((d) => d.data()?.userId)
          .filter((v) => typeof v === 'string' && v),
      );
      const contactsByUid = new Map();
      for (const d of pdfContactsSnap.docs || []) {
        const c = d.data() || {};
        const uid = typeof c.uid === 'string' ? c.uid : null;
        if (!uid) continue;
        const list = contactsByUid.get(uid) || [];
        if (list.length >= 5) continue;
        const mobileRaw = typeof c.mobileNumber === 'string' ? c.mobileNumber : '';
        const waNum = sanitizePhoneForWhatsapp(mobileRaw);
        const waText = encodeURIComponent(
          `Namaste${c.name ? ` ${String(c.name)}` : ''}${c.gotram ? ` (${String(c.gotram)})` : ''},\nJai Shri Ram. This is from Japam with updates on special programs and offers.`,
        );
        list.push({
          id: d.id,
          name: typeof c.name === 'string' ? c.name : '',
          gotram: typeof c.gotram === 'string' ? c.gotram : '',
          mobileNumber: mobileRaw,
          deityName: typeof c.deityName === 'string' ? c.deityName : '',
          count: typeof c.count === 'number' ? c.count : 0,
          createdAt: toIso(c.createdAt),
          whatsappUrl: waNum ? `https://wa.me/${waNum}?text=${waText}` : null,
        });
        contactsByUid.set(uid, list);
      }

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
          if (authRecords.length >= MAX_ADMIN_USERS_SCAN) {
            authRecords = authRecords.slice(0, MAX_ADMIN_USERS_SCAN);
            pageToken = undefined;
            break;
          }
          pageToken = result.pageToken;
        } while (pageToken);
      } catch (e) {
        console.error('admin listUsers fallback', e);
        const uids = new Set([
          ...unlockedSnap.docs.map((d) => d.id),
          ...blockedSnap.docs.map((d) => d.id),
          ...donorsSnap.docs.map((d) => d.id),
          ...paidOrdersSnap.docs.map((d) => d.data()?.uid).filter((v) => typeof v === 'string' && v),
          ...marathonPartsSnap.docs.map((d) => d.data()?.userId).filter((v) => typeof v === 'string' && v),
          ...yagnaUsersSnap.docs.map((d) => d.data()?.userId).filter((v) => typeof v === 'string' && v),
        ]);
        authRecords = Array.from(uids).slice(0, MAX_ADMIN_USERS_SCAN).map((uid) => ({
          uid,
          email: unlockMetaByUid.get(uid)?.email || null,
          metadata: {},
        }));
      }

      let activityByUid = new Map();
      let progressByUid = new Map();
      let japaByUid = new Map();
      try {
        const chunk = 400;
        for (let i = 0; i < authRecords.length; i += chunk) {
          const slice = authRecords.slice(i, i + chunk);
          const refs = slice.map((u) => db.doc(`users/${u.uid}/data/activity`));
          const progressRefs = slice.map((u) => db.doc(`users/${u.uid}/data/progress`));
          const japaRefs = slice.map((u) => db.doc(`users/${u.uid}/data/japa`));
          const [snaps, progressSnaps, japaSnaps] = await Promise.all([
            refs.length ? db.getAll(...refs) : [],
            progressRefs.length ? db.getAll(...progressRefs) : [],
            japaRefs.length ? db.getAll(...japaRefs) : [],
          ]);
          for (let j = 0; j < slice.length; j++) {
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
          for (let j = 0; j < slice.length; j++) {
            const uid = slice[j]?.uid;
            const p = progressSnaps[j];
            const jp = japaSnaps[j];
            if (!uid) continue;
            progressByUid.set(uid, p?.exists ? p.data() || {} : {});
            japaByUid.set(uid, jp?.exists ? jp.data() || {} : {});
          }
        }
      } catch {
        activityByUid = new Map();
        progressByUid = new Map();
        japaByUid = new Map();
      }

      const modePlayers = { general: 0, deitySpecific: 0, special108: 0, pushpaAradhana: 0, marathons: 0, yagnas: 0 };
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
          const hasPaidEver = hasUnlockRecord || premiumActive || paidByUid.has(uid);

          let tier = 'free';
          if (premiumActive) tier = 'premium';
          else if (hasUnlockRecord) tier = 'pro';

          const progress = progressByUid.get(uid) || {};
          const lp = progress.levelProgress && typeof progress.levelProgress === 'object' ? progress.levelProgress : {};
          const hasGeneralPlay = Object.keys(lp).some((k) => k.startsWith('general-') && lp[k]?.completed === true);
          const hasDeityPlay = Object.keys(lp).some((k) => DEITY_IDS.some((d) => k.startsWith(`${d}-`) && lp[k]?.completed === true));
          let completedFreeLevelsGeneral = 0;
          for (let i = 1; i <= 5; i++) {
            if (lp[`general-${i}`]?.completed === true) completedFreeLevelsGeneral++;
          }
          const greedyFreeUser = tier === 'free' && completedFreeLevelsGeneral >= 5;

          const japa = japaByUid.get(uid) || {};
          const special108Total = typeof japa.special108JapaTotal === 'number' ? japa.special108JapaTotal : 0;
          const pushpaTotal = typeof japa.pushpaAbhishekaJapa === 'number' ? japa.pushpaAbhishekaJapa : 0;
          const playedSpecial108 = special108Total > 0;
          const playedPushpa = pushpaTotal > 0;
          const playedMarathons = marathonByUid.has(uid);
          const playedYagnas = yagnaByUid.has(uid);
          const discontinuedPaidUser = tier === 'free' && hasPaidEver;
          const pdfContacts = contactsByUid.get(uid) || [];
          if (hasGeneralPlay) modePlayers.general++;
          if (hasDeityPlay) modePlayers.deitySpecific++;
          if (playedSpecial108) modePlayers.special108++;
          if (playedPushpa) modePlayers.pushpaAradhana++;
          if (playedMarathons) modePlayers.marathons++;
          if (playedYagnas) modePlayers.yagnas++;

          const lastSignInAt =
            typeof rec.metadata?.lastSignInTime === 'string' ? rec.metadata.lastSignInTime : null;
          const createdAt = typeof rec.metadata?.creationTime === 'string' ? rec.metadata.creationTime : null;

          return {
            uid,
            email,
            unlockedAt,
            tier,
            isPremium: tier === 'premium',
            hasPaidEver,
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
            completedFreeLevelsGeneral,
            greedyFreeUser,
            discontinuedPaidUser,
            playedGeneral: hasGeneralPlay,
            playedDeitySpecific: hasDeityPlay,
            playedSpecial108,
            playedPushpa,
            playedMarathons,
            playedYagnas,
            pdfContacts,
          };
        })
        .sort((a, b) => (b.lastSignInAt || '').localeCompare(a.lastSignInAt || ''));

      return jsonResponse({
        users,
        total: users.length,
        analytics: {
          modePlayers,
          segments: {
            free: users.filter((u) => u.tier === 'free').length,
            paid: users.filter((u) => u.tier === 'pro' || u.tier === 'premium').length,
            discontinued: users.filter((u) => u.discontinuedPaidUser).length,
            greedy: users.filter((u) => u.greedyFreeUser).length,
          },
          pdfContactsCount: users.reduce((sum, u) => sum + (u.pdfContacts?.length || 0), 0),
        },
      });
    }

    return jsonResponse({ error: 'Invalid type. Use temples, marathons, or users.' }, 400);
  } catch (e) {
    console.error('admin data', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/data.js');
  }
}
