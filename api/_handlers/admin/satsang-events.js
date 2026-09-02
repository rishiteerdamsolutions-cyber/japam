import admin from 'firebase-admin';
import { getDb, jsonResponse, jsonInternalServerError, isValidFirestoreDocId, logAudit } from '../_lib.js';
import {
  SATSANG_CAP,
  SATSANG_TRIAL_CODE_COUNT,
  serializeSatsangEvent,
  normalizeSatsangCode,
  isValidSatsangCodeFormat,
  generateSatsangCode,
  cleanSatsangText,
  isYmd,
  eachYmdInclusive,
  replaceSatsangCodeLookups,
  collectEventCodes,
} from '../_satsang.js';

function slugId(orgName, eventName) {
  const base = `${orgName}-${eventName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || 'satsang'}-${Date.now().toString(36)}`;
}

async function assertCodesAvailable(db, codes, eventId) {
  const unique = [...new Set(codes)];
  if (unique.length !== codes.length) {
    return 'Each satsang code must be unique';
  }
  for (const code of unique) {
    if (!isValidSatsangCodeFormat(code)) {
      return 'Codes must be 4–12 letters or numbers';
    }
    const snap = await db.doc(`satsangCodes/${code}`).get();
    if (snap.exists && snap.data()?.eventId !== eventId) {
      return `Code ${code} is already used by another event`;
    }
  }
  return null;
}

function parseEventBody(body) {
  const orgName = cleanSatsangText(body?.orgName, 80);
  const eventName = cleanSatsangText(body?.eventName, 80);
  const place = cleanSatsangText(body?.place, 80) || null;
  const startDate = typeof body?.startDate === 'string' ? body.startDate.trim() : '';
  const endDate = typeof body?.endDate === 'string' ? body.endDate.trim() : '';
  if (!orgName || !eventName) return { error: 'Organisation name and event name are required' };
  if (!isYmd(startDate) || !isYmd(endDate) || startDate > endDate) {
    return { error: 'Start and end dates must be YYYY-MM-DD with start on or before end' };
  }
  const days = eachYmdInclusive(startDate, endDate);
  if (days.length < 1 || days.length > 31) {
    return { error: 'Event must be 1–31 days' };
  }

  let trialCodes = Array.isArray(body?.trialCodes)
    ? body.trialCodes.map((c) => normalizeSatsangCode(c)).filter(Boolean)
    : [];
  while (trialCodes.length < SATSANG_TRIAL_CODE_COUNT) trialCodes.push(generateSatsangCode());
  trialCodes = trialCodes.slice(0, SATSANG_TRIAL_CODE_COUNT);

  const incomingDaily = body?.dailyCodes && typeof body.dailyCodes === 'object' ? body.dailyCodes : {};
  const dailyCodes = {};
  for (const ymd of days) {
    const given = normalizeSatsangCode(incomingDaily[ymd]);
    dailyCodes[ymd] = given || generateSatsangCode();
  }

  return { orgName, eventName, place, startDate, endDate, trialCodes, dailyCodes };
}

function lookupsFor(trialCodes, dailyCodes) {
  const lookups = trialCodes.map((code) => ({ code, kind: 'trial', ymd: null }));
  for (const [ymd, code] of Object.entries(dailyCodes)) {
    lookups.push({ code, kind: 'live', ymd });
  }
  return lookups;
}

/** GET /api/admin/satsang-events */
export async function GET(_request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.collection('satsangEvents').get();
    const events = snap.docs
      .map((d) => serializeSatsangEvent(d.id, d.data()))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return jsonResponse({ events, cap: SATSANG_CAP });
  } catch (e) {
    return jsonInternalServerError(e, 'admin/satsang-events GET');
  }
}

/**
 * POST /api/admin/satsang-events
 * { action: 'create' | 'update' | 'setStatus', ... }
 */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : 'create';
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (action === 'setStatus') {
      const eventId = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!isValidFirestoreDocId(eventId)) return jsonResponse({ error: 'Invalid event' }, 400);
      const status = body?.status === 'open' ? 'open' : 'closed';
      const ref = db.doc(`satsangEvents/${eventId}`);
      const snap = await ref.get();
      if (!snap.exists) return jsonResponse({ error: 'Event not found' }, 404);
      await ref.set({ status, updatedAt: now }, { merge: true });
      await logAudit('satsang_set_status', { eventId, status });
      const fresh = await ref.get();
      return jsonResponse({ ok: true, event: serializeSatsangEvent(eventId, fresh.data()) });
    }

    const parsed = parseEventBody(body);
    if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
    const allCodes = [...parsed.trialCodes, ...Object.values(parsed.dailyCodes)];

    if (action === 'update') {
      const eventId = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!isValidFirestoreDocId(eventId)) return jsonResponse({ error: 'Invalid event' }, 400);
      const ref = db.doc(`satsangEvents/${eventId}`);
      const snap = await ref.get();
      if (!snap.exists) return jsonResponse({ error: 'Event not found' }, 404);
      const codeErr = await assertCodesAvailable(db, allCodes, eventId);
      if (codeErr) return jsonResponse({ error: codeErr }, 400);
      const previous = collectEventCodes(snap.data());
      await ref.set(
        {
          orgName: parsed.orgName,
          eventName: parsed.eventName,
          place: parsed.place,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          trialCodes: parsed.trialCodes,
          dailyCodes: parsed.dailyCodes,
          cap: SATSANG_CAP,
          updatedAt: now,
        },
        { merge: true },
      );
      await replaceSatsangCodeLookups(db, eventId, lookupsFor(parsed.trialCodes, parsed.dailyCodes), previous);
      await logAudit('satsang_update', { eventId });
      const fresh = await ref.get();
      return jsonResponse({ ok: true, event: serializeSatsangEvent(eventId, fresh.data()) });
    }

    const eventId = slugId(parsed.orgName, parsed.eventName);
    const codeErr = await assertCodesAvailable(db, allCodes, eventId);
    if (codeErr) return jsonResponse({ error: codeErr }, 400);
    await db.doc(`satsangEvents/${eventId}`).set({
      orgName: parsed.orgName,
      eventName: parsed.eventName,
      place: parsed.place,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      trialCodes: parsed.trialCodes,
      dailyCodes: parsed.dailyCodes,
      cap: SATSANG_CAP,
      status: 'closed',
      createdAt: now,
      updatedAt: now,
    });
    await replaceSatsangCodeLookups(db, eventId, lookupsFor(parsed.trialCodes, parsed.dailyCodes), []);
    await logAudit('satsang_create', { eventId });
    const fresh = await db.doc(`satsangEvents/${eventId}`).get();
    return jsonResponse({ ok: true, event: serializeSatsangEvent(eventId, fresh.data()) }, 201);
  } catch (e) {
    return jsonInternalServerError(e, 'admin/satsang-events POST');
  }
}
