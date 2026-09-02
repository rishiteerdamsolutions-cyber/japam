import crypto from 'crypto';
import admin from 'firebase-admin';

export const SATSANG_CAP = 50;
export const SATSANG_TRIAL_CODE_COUNT = 2;
export const SATSANG_SITTING_JAPAS = 108;
export const SATSANG_YAGNA_TARGET = 1080;
export const SATSANG_DEITY = 'ganesh';
export const SATSANG_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function istYmd(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function isYmd(raw) {
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
}

export function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function eachYmdInclusive(start, end) {
  if (!isYmd(start) || !isYmd(end) || start > end) return [];
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDaysYmd(cur, 1);
  }
  return out;
}

export function normalizeSatsangCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidSatsangCodeFormat(code) {
  if (!code || typeof code !== 'string') return false;
  return code.length >= 4 && code.length <= 12 && /^[A-Z0-9]+$/.test(code);
}

export function generateSatsangCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += SATSANG_CODE_ALPHABET[bytes[i] % SATSANG_CODE_ALPHABET.length];
  }
  return out;
}

export function cleanSatsangText(v, max = 80) {
  if (typeof v !== 'string') return '';
  return v.trim().replace(/\s+/g, ' ').slice(0, max);
}

export function sittingIdFor(kind, ymd) {
  return kind === 'trial' ? `trial_${ymd}` : ymd;
}

export function serializeSatsangEvent(id, data) {
  const dailyCodes = data?.dailyCodes && typeof data.dailyCodes === 'object' ? data.dailyCodes : {};
  const trialCodes = Array.isArray(data?.trialCodes) ? data.trialCodes.filter((c) => typeof c === 'string') : [];
  return {
    id,
    orgName: typeof data?.orgName === 'string' ? data.orgName : '',
    eventName: typeof data?.eventName === 'string' ? data.eventName : '',
    place: typeof data?.place === 'string' && data.place.trim() ? data.place.trim() : null,
    status: data?.status === 'open' ? 'open' : 'closed',
    cap: SATSANG_CAP,
    startDate: typeof data?.startDate === 'string' ? data.startDate : '',
    endDate: typeof data?.endDate === 'string' ? data.endDate : '',
    trialCodes,
    dailyCodes,
    createdAt: data?.createdAt || null,
    updatedAt: data?.updatedAt || null,
  };
}

/** True if at least one mandap event is open. QR stays on festival until all are closed. */
export async function hasAnyOpenSatsangEvent(db) {
  const snap = await db.collection('satsangEvents').get();
  for (const doc of snap.docs) {
    if (doc.data()?.status === 'open') return true;
  }
  return false;
}

export async function replaceSatsangCodeLookups(db, eventId, nextLookups, previousCodes) {
  const batch = db.batch();
  const prev = new Set((previousCodes || []).map((c) => normalizeSatsangCode(c)).filter(Boolean));
  const next = new Set(nextLookups.map((l) => l.code));
  let ops = 0;
  for (const code of prev) {
    if (!next.has(code)) {
      batch.delete(db.doc(`satsangCodes/${code}`));
      ops += 1;
    }
  }
  for (const lookup of nextLookups) {
    batch.set(db.doc(`satsangCodes/${lookup.code}`), {
      eventId,
      kind: lookup.kind,
      ymd: lookup.ymd || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ops += 1;
  }
  if (ops) await batch.commit();
}

export function collectEventCodes(eventData) {
  const codes = [];
  if (Array.isArray(eventData?.trialCodes)) codes.push(...eventData.trialCodes);
  const daily = eventData?.dailyCodes && typeof eventData.dailyCodes === 'object' ? eventData.dailyCodes : {};
  codes.push(...Object.values(daily));
  return codes.map((c) => normalizeSatsangCode(c)).filter(Boolean);
}
