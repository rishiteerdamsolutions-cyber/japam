import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, jsonInternalServerError } from '../_lib.js';
import { SATSANG_CAP } from '../_satsang.js';

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function emptyFunnel() {
  return { landing: 0, join: 0, skip: 0, complete: 0, share: 0, pdf: 0, kids_enter: 0 };
}

function orgKey(name) {
  const s = typeof name === 'string' ? name.trim() : '';
  return s || '(unnamed organiser)';
}

/** GET /api/admin/utsav-analytics — Ganesha Utsav per organiser + Virtual World. */
export async function GET(request) {
  const token = getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const [eventsSnap, funnelSnap, dailySnap, kidsLiveSnap, kidsStatsSnap] = await Promise.all([
      db.collection('satsangEvents').get(),
      db.collection('ganeshotsavFunnelEvents').limit(8000).get().catch(() => ({ docs: [] })),
      db.collection('ganeshotsavDaily').get().catch(() => ({ docs: [] })),
      db.collection('kidsWorldLive').get().catch(() => ({ docs: [] })),
      db.collection('kidsWorldStats').get().catch(() => ({ docs: [] })),
    ]);

    const events = await Promise.all(
      eventsSnap.docs.map(async (evDoc) => {
        const data = evDoc.data() || {};
        const sittingsSnap = await evDoc.ref.collection('sittings').get().catch(() => ({ docs: [] }));
        const sittingParts = await Promise.all(
          sittingsSnap.docs.map(async (sit) => {
            const s = sit.data() || {};
            const seatsSnap = await sit.ref.collection('seats').get().catch(() => ({ docs: [] }));
            let sitJoins = 0;
            let sitDone = 0;
            const uids = [];
            seatsSnap.docs.forEach((seatDoc) => {
              const seat = seatDoc.data() || {};
              sitJoins += 1;
              uids.push(String(seat.uid || seatDoc.id));
              if (seat.completed108 === true) sitDone += 1;
            });
            return {
              id: sit.id,
              ymd: s.ymd || sit.id,
              kind: s.kind === 'trial' ? 'trial' : 'live',
              joins: sitJoins,
              completes: sitDone,
              fillPct: pct(sitJoins, SATSANG_CAP),
              uids,
            };
          }),
        );
        sittingParts.sort((a, b) => String(b.ymd).localeCompare(String(a.ymd)));
        const unique = new Set();
        let joins = 0;
        let completes = 0;
        const sittings = sittingParts.map(({ uids, ...rest }) => {
          joins += rest.joins;
          completes += rest.completes;
          uids.forEach((id) => unique.add(id));
          return rest;
        });
        return {
          id: evDoc.id,
          orgName: typeof data.orgName === 'string' ? data.orgName : '',
          eventName: typeof data.eventName === 'string' ? data.eventName : '',
          place: typeof data.place === 'string' ? data.place : null,
          status: data.status === 'open' ? 'open' : 'closed',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          joins,
          completes,
          uniqueDevotees: unique.size,
          uniqueUids: unique,
          completionPct: pct(completes, joins),
          sittings,
        };
      }),
    );

    const eventIdToOrg = new Map();
    for (const ev of events) eventIdToOrg.set(ev.id, orgKey(ev.orgName));

    const byOrgMap = new Map();
    const ensureOrg = (key) => {
      if (!byOrgMap.has(key)) {
        byOrgMap.set(key, {
          orgName: key,
          events: 0,
          openEvents: 0,
          joins: 0,
          completes: 0,
          unique: new Set(),
          skip: 0,
          share: 0,
          pdf: 0,
          kids_enter: 0,
          kidsVisitors: 0,
          kidsNimarjanam: 0,
          kidsCerts: 0,
          kidsLive: 0,
        });
      }
      return byOrgMap.get(key);
    };

    for (const ev of events) {
      const row = ensureOrg(orgKey(ev.orgName));
      row.events += 1;
      if (ev.status === 'open') row.openEvents += 1;
      row.joins += ev.joins;
      row.completes += ev.completes;
      ev.uniqueUids.forEach((id) => row.unique.add(id));
    }

    const funnelFromEvents = emptyFunnel();
    const funnelUnique = {
      landing: new Set(),
      join: new Set(),
      skip: new Set(),
      complete: new Set(),
      share: new Set(),
      pdf: new Set(),
      kids_enter: new Set(),
    };
    funnelSnap.docs.forEach((d) => {
      const row = d.data() || {};
      const type = row.type;
      if (!(type in funnelFromEvents)) return;
      funnelFromEvents[type] += 1;
      if (row.uid && funnelUnique[type]) funnelUnique[type].add(row.uid);
      const org =
        (typeof row.orgName === 'string' && row.orgName.trim() && orgKey(row.orgName)) ||
        (row.eventId && eventIdToOrg.get(row.eventId)) ||
        null;
      if (!org || !byOrgMap.has(org)) return;
      if (type === 'skip' || type === 'share' || type === 'pdf' || type === 'kids_enter') {
        byOrgMap.get(org)[type] += 1;
      }
    });

    const funnelFromDaily = emptyFunnel();
    const daily = dailySnap.docs
      .map((d) => {
        const row = d.data() || {};
        const item = {
          ymd: row.ymd || d.id,
          landing: Math.round(Number(row.landing) || 0),
          join: Math.round(Number(row.join) || 0),
          skip: Math.round(Number(row.skip) || 0),
          complete: Math.round(Number(row.complete) || 0),
          share: Math.round(Number(row.share) || 0),
          pdf: Math.round(Number(row.pdf) || 0),
          kids_enter: Math.round(Number(row.kids_enter) || 0),
        };
        for (const k of Object.keys(funnelFromDaily)) funnelFromDaily[k] += item[k];
        return item;
      })
      .sort((a, b) => String(b.ymd).localeCompare(String(a.ymd)))
      .slice(0, 31);

    const dailyHasCounts = Object.values(funnelFromDaily).some((n) => n > 0);
    const funnel = dailyHasCounts ? funnelFromDaily : funnelFromEvents;

    const liveCutoff = Date.now() - 90 * 1000;
    const liveNow = kidsLiveSnap.docs.filter((d) => (d.data()?.seenAtMs || 0) >= liveCutoff).length;
    kidsLiveSnap.docs.forEach((d) => {
      const row = d.data() || {};
      if ((row.seenAtMs || 0) < liveCutoff) return;
      const org = (row.eventId && eventIdToOrg.get(row.eventId)) || null;
      if (org && byOrgMap.has(org)) byOrgMap.get(org).kidsLive += 1;
    });

    const stageFunnel = { home: 0, ratha: 0, ghat: 0, done: 0, other: 0 };
    let nimarjanam = 0;
    let certs = 0;
    let doneSum = 0;
    let unattributedKids = 0;
    kidsStatsSnap.docs.forEach((d) => {
      const row = d.data() || {};
      const st = typeof row.lastStage === 'string' ? row.lastStage : 'home';
      if (st === 'home' || st === 'ratha' || st === 'ghat' || st === 'done') stageFunnel[st] += 1;
      else stageFunnel.other += 1;
      if (row.nimarjanam) nimarjanam += 1;
      if (row.certDownload) certs += 1;
      doneSum += Math.round(Number(row.maxDoneCount) || 0);
      const org = (row.eventId && eventIdToOrg.get(row.eventId)) || null;
      if (org && byOrgMap.has(org)) {
        const bucket = byOrgMap.get(org);
        bucket.kidsVisitors += 1;
        if (row.nimarjanam) bucket.kidsNimarjanam += 1;
        if (row.certDownload) bucket.kidsCerts += 1;
      } else {
        unattributedKids += 1;
      }
    });
    const uniqueKids = kidsStatsSnap.docs.length;

    const byOrganiser = Array.from(byOrgMap.values())
      .map((row) => ({
        orgName: row.orgName,
        events: row.events,
        openEvents: row.openEvents,
        joins: row.joins,
        completes: row.completes,
        uniqueDevotees: row.unique.size,
        completionPct: pct(row.completes, row.joins),
        skip: row.skip,
        share: row.share,
        pdf: row.pdf,
        kidsEnter: row.kids_enter,
        kidsVisitors: row.kidsVisitors,
        kidsNimarjanam: row.kidsNimarjanam,
        kidsCerts: row.kidsCerts,
        kidsLive: row.kidsLive,
      }))
      .sort((a, b) => b.joins - a.joins || a.orgName.localeCompare(b.orgName));

    return jsonResponse({
      generatedAt: Date.now(),
      cap: SATSANG_CAP,
      totals: {
        organisers: byOrganiser.length,
        events: events.length,
        openEvents: events.filter((e) => e.status === 'open').length,
        joins: events.reduce((n, e) => n + e.joins, 0),
        completes: events.reduce((n, e) => n + e.completes, 0),
        landings: funnel.landing,
        skips: funnel.skip,
        shares: funnel.share,
        pdfs: funnel.pdf,
        kidsEnter: funnel.kids_enter,
        completionPct: pct(
          events.reduce((n, e) => n + e.completes, 0),
          events.reduce((n, e) => n + e.joins, 0),
        ),
      },
      funnel,
      funnelUnique: Object.fromEntries(Object.entries(funnelUnique).map(([k, set]) => [k, set.size])),
      byOrganiser,
      events: events
        .map(({ uniqueUids: _uids, ...rest }) => rest)
        .sort((a, b) => b.joins - a.joins || String(b.startDate).localeCompare(String(a.startDate))),
      daily,
      kidsWorld: {
        liveNow,
        uniqueVisitors: uniqueKids,
        nimarjanam,
        certificates: certs,
        avgDaysDone: uniqueKids ? Math.round((doneSum / uniqueKids) * 10) / 10 : 0,
        stageFunnel,
        unattributedVisitors: unattributedKids,
      },
    });
  } catch (e) {
    console.error('admin utsav-analytics', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/utsav-analytics.js');
  }
}
