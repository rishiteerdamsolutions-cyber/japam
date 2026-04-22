import admin from 'firebase-admin';

/** Fixed IDs — not created by admin/priest; seeded lazily. Distinct from temple marathons/yagnas. */
export const DEFAULT_FREE_MARATHON_ID = 'defaultFreeMarathonShiva1080';
export const DEFAULT_FREE_YAGNA_ID = 'defaultFreeYagnaRama1Crore';

const ONE_CRORE = 10_000_000;

export function isDefaultFreeMarathonId(id) {
  return typeof id === 'string' && id === DEFAULT_FREE_MARATHON_ID;
}

export function isDefaultFreeYagnaId(id) {
  return typeof id === 'string' && id === DEFAULT_FREE_YAGNA_ID;
}

/** Ensure the shared marathon document exists (Shiva, 1080 japas). */
export async function ensureDefaultFreeMarathonDoc(db) {
  const ref = db.doc(`marathons/${DEFAULT_FREE_MARATHON_ID}`);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    templeId: null,
    isCommunity: false,
    isDefaultFreeMarathon: true,
    communityName: 'Shiva starter marathon (free)',
    deityId: 'shiva',
    targetJapas: 1080,
    startDate: '2020-01-01',
    joinedCount: 0,
    japasToday: 0,
    totalJapas: 0,
    lifecycleStatus: 'active',
    createdAt: new Date().toISOString(),
  });
}

/** Auto-join the free starter marathon for this user (no Pro required). */
export async function ensureDefaultFreeMarathonParticipation(db, uid, displayName) {
  await ensureDefaultFreeMarathonDoc(db);
  const partId = `${DEFAULT_FREE_MARATHON_ID}_${uid}`;
  const participationRef = db.doc(`marathonParticipations/${partId}`);
  const existing = await participationRef.get();
  if (existing.exists) return;

  const marathonRef = db.doc(`marathons/${DEFAULT_FREE_MARATHON_ID}`);
  await db.runTransaction(async (tx) => {
    const mSnap = await tx.get(marathonRef);
    if (!mSnap.exists) return;
    const mData = mSnap.data() || {};
    const joinedCount = (mData.joinedCount ?? 0) + 1;
    tx.update(marathonRef, { joinedCount });
    tx.set(participationRef, {
      marathonId: DEFAULT_FREE_MARATHON_ID,
      userId: uid,
      displayName: displayName || null,
      joinedAt: new Date().toISOString(),
      japasCount: 0,
    });
  });

  await db.doc(`users/${uid}/data/profile`).set({ hasJoinedMarathon: true }, { merge: true });
}

/** Ensure the shared Maha Japa Yagna doc exists (Rama, 1 crore collective goal). */
export async function ensureDefaultFreeYagnaDoc(db) {
  const ref = db.doc(`mahaJapaYagnas/${DEFAULT_FREE_YAGNA_ID}`);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    name: 'Rama starter Maha Japa (free)',
    description: 'Community starter yagna — your japas count toward this goal. Pro is required for temple yagnas.',
    deityId: 'rama',
    mantra: 'Ram',
    goalJapas: ONE_CRORE,
    currentJapas: 0,
    startDate: '2020-01-01',
    endDate: '2099-12-31',
    templeId: null,
    status: 'active',
    lifecycleStatus: 'active',
    isDefaultFreeYagna: true,
    createdAt: new Date().toISOString(),
  });
}

/** Auto-join the free starter yagna for this user (no Pro required). */
export async function ensureDefaultFreeYagnaParticipation(db, uid) {
  await ensureDefaultFreeYagnaDoc(db);
  const docId = `${DEFAULT_FREE_YAGNA_ID}_${uid}`;
  const userRef = db.collection('mahaJapaYagnaUsers').doc(docId);
  const existing = await userRef.get();
  if (existing.exists) return;
  await userRef.set({
    yagnaId: DEFAULT_FREE_YAGNA_ID,
    userId: uid,
    userJapas: 0,
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
