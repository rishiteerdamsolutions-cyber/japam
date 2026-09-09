import admin from 'firebase-admin';
import { istYmd } from './_satsang.js';

export const FUNNEL_TYPES = ['landing', 'join', 'skip', 'complete', 'share', 'pdf', 'kids_enter'];
export const KIDS_EVENT_TYPES = ['opened', 'stage', 'day_done', 'nimarjanam', 'cert_download'];

function cleanId(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, 80);
  return s || null;
}

export async function recordFunnelEvent(db, input) {
  if (!db) return;
  const type = FUNNEL_TYPES.includes(input?.type) ? input.type : null;
  if (!type) return;
  const ymd = istYmd();
  const createdAtMs = Date.now();
  try {
    await db.collection('ganeshotsavFunnelEvents').add({
      type,
      eventId: cleanId(input.eventId),
      orgName: typeof input.orgName === 'string' ? input.orgName.trim().slice(0, 80) : null,
      uid: cleanId(input.uid),
      isTrial: input.isTrial === true,
      ymd,
      createdAtMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.doc(`ganeshotsavDaily/${ymd}`).set(
      {
        ymd,
        [type]: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.warn('utsav funnel', type, e?.message || e);
  }
}

export async function upsertKidsVisit(db, input) {
  if (!db || !input?.uid) return;
  const uid = String(input.uid).slice(0, 80);
  const now = Date.now();
  const stage = typeof input.stage === 'string' ? input.stage.slice(0, 24) : 'home';
  const day = typeof input.day === 'number' && Number.isFinite(input.day) ? input.day : 1;
  const doneCount = typeof input.doneCount === 'number' && Number.isFinite(input.doneCount) ? input.doneCount : 0;
  const nimNow = input.nimDone === true || stage === 'done';
  const eventId = cleanId(input.eventId);
  const ref = db.collection('kidsWorldStats').doc(uid);
  try {
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() || {} : {};
    const first = !snap.exists;
    const prevStage = typeof prev.lastStage === 'string' ? prev.lastStage : '';
    const stageChanged = !first && prevStage && prevStage !== stage;
    const prevDone = Math.round(Number(prev.maxDoneCount) || 0);
    const doneChanged = doneCount > prevDone;
    const nimFirst = nimNow && !prev.nimarjanam;
    await ref.set(
      {
        uid,
        n: typeof input.n === 'string' ? input.n.trim().slice(0, 40) : prev.n || 'Guest',
        f: typeof input.f === 'string' ? input.f.trim().slice(0, 40) : prev.f || 'Parivar',
        eventId: eventId || prev.eventId || null,
        firstSeenAtMs: prev.firstSeenAtMs || now,
        lastSeenAtMs: now,
        lastStage: stage,
        maxDay: Math.max(Math.round(Number(prev.maxDay) || 1), day),
        maxDoneCount: Math.max(prevDone, doneCount),
        nimarjanam: !!(prev.nimarjanam || nimNow),
        certDownload: !!prev.certDownload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const add = async (type, extra) => {
      await db.collection('kidsWorldEvents').add({
        type,
        uid,
        stage,
        doneCount,
        eventId: eventId || prev.eventId || null,
        createdAtMs: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...extra,
      });
    };
    if (first) await add('opened');
    else if (stageChanged) await add('stage');
    if (doneChanged && doneCount > 0) await add('day_done', { doneCount });
    if (nimFirst) await add('nimarjanam');
  } catch (e) {
    console.warn('kids visit', e?.message || e);
  }
}

export async function recordKidsCert(db, uid) {
  if (!db || !uid) return;
  const id = String(uid).slice(0, 80);
  const now = Date.now();
  try {
    await db.collection('kidsWorldStats').doc(id).set(
      {
        uid: id,
        certDownload: true,
        certDownloadAtMs: now,
        lastSeenAtMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await db.collection('kidsWorldEvents').add({
      type: 'cert_download',
      uid: id,
      createdAtMs: now,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('kids cert', e?.message || e);
  }
}
