import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface OrganiserRow {
  orgName: string;
  events: number;
  openEvents: number;
  joins: number;
  completes: number;
  uniqueDevotees: number;
  completionPct: number;
  skip: number;
  share: number;
  pdf: number;
  kidsEnter: number;
  kidsVisitors: number;
  kidsNimarjanam: number;
  kidsCerts: number;
  kidsLive: number;
}

interface SittingRow {
  id: string;
  ymd: string;
  kind: string;
  joins: number;
  completes: number;
  fillPct: number;
}

interface EventRow {
  id: string;
  orgName: string;
  eventName: string;
  place: string | null;
  status: string;
  startDate: string;
  endDate: string;
  joins: number;
  completes: number;
  uniqueDevotees: number;
  completionPct: number;
  sittings: SittingRow[];
}

interface DailyRow {
  ymd: string;
  landing: number;
  join: number;
  skip: number;
  complete: number;
  share: number;
  pdf: number;
  kids_enter: number;
}

interface Analytics {
  generatedAt: number;
  cap: number;
  totals: {
    organisers: number;
    events: number;
    openEvents: number;
    joins: number;
    completes: number;
    landings: number;
    skips: number;
    shares: number;
    pdfs: number;
    kidsEnter: number;
    completionPct: number;
  };
  funnel: Record<string, number>;
  funnelUnique: Record<string, number>;
  byOrganiser: OrganiserRow[];
  events: EventRow[];
  daily: DailyRow[];
  kidsWorld: {
    liveNow: number;
    uniqueVisitors: number;
    nimarjanam: number;
    certificates: number;
    avgDaysDone: number;
    stageFunnel: { home: number; ratha: number; ghat: number; done: number; other: number };
    unattributedVisitors: number;
  };
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-black/30 p-3">
      <p className="text-amber-200/60 text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-amber-100 text-2xl font-semibold mt-1">{value}</p>
      {hint ? <p className="text-amber-200/50 text-[11px] mt-1">{hint}</p> : null}
    </div>
  );
}

export function AdminUtsavAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = getStoredAdminToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    const url = API_BASE ? `${API_BASE}/api/admin/utsav-analytics` : '/api/admin/utsav-analytics';
    fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token } })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setData(res);
      })
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-amber-200">Loading Utsav analytics…</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  const { totals, byOrganiser, events, daily, kidsWorld, funnelUnique } = data;

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-2">Ganesha Utsav analytics</h1>
      <p className="text-amber-200/80 text-sm mb-4 max-w-2xl">
        Per organiser (mandap) from joined seats and 108 completions, plus Virtual World (For KIDS) visitors. Funnel
        counts start after this tracker went live. Seat joins/completions include earlier sittings.
      </p>
      <div className="flex flex-wrap gap-3 mb-6">
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-amber-500/80 text-white font-medium">
          Refresh
        </button>
        <Link to="/admin/satsang" className="px-4 py-2 rounded-lg border border-amber-500/40 text-amber-200 text-sm">
          Manage mandaps
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-amber-300 mb-3">Festival totals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat label="Organisers" value={totals.organisers} />
          <Stat label="Events" value={totals.events} hint={`${totals.openEvents} open`} />
          <Stat label="Joins" value={totals.joins} hint="Seats taken" />
          <Stat label="108 completed" value={totals.completes} hint={`${totals.completionPct}% of joins`} />
          <Stat label="Landings" value={totals.landings} hint={`${funnelUnique.landing || 0} signed-in`} />
          <Stat label="Skips" value={totals.skips} />
          <Stat label="Share cards" value={totals.shares} />
          <Stat label="Likhita PDFs" value={totals.pdfs} />
          <Stat label="For KIDS taps" value={totals.kidsEnter} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-amber-300 mb-3">By organiser</h2>
        {byOrganiser.length === 0 ? (
          <p className="text-amber-200/60 text-sm">No mandap events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-amber-500/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-amber-500/20 text-amber-200">
                  <th className="p-3">Organiser</th>
                  <th className="p-3">Events</th>
                  <th className="p-3">Joins</th>
                  <th className="p-3">108 done</th>
                  <th className="p-3">Unique devotees</th>
                  <th className="p-3">Complete %</th>
                  <th className="p-3">Skip</th>
                  <th className="p-3">Share</th>
                  <th className="p-3">PDF</th>
                  <th className="p-3">For KIDS</th>
                </tr>
              </thead>
              <tbody className="text-amber-200/90">
                {byOrganiser.map((row) => (
                  <tr key={row.orgName} className="border-t border-amber-500/20">
                    <td className="p-3 font-medium">
                      {row.orgName}
                      {row.openEvents ? (
                        <span className="ml-2 text-[10px] text-green-400">OPEN {row.openEvents}</span>
                      ) : null}
                    </td>
                    <td className="p-3">{row.events}</td>
                    <td className="p-3">{row.joins}</td>
                    <td className="p-3">{row.completes}</td>
                    <td className="p-3">{row.uniqueDevotees}</td>
                    <td className="p-3">{row.completionPct}%</td>
                    <td className="p-3">{row.skip || 0}</td>
                    <td className="p-3">{row.share || 0}</td>
                    <td className="p-3">{row.pdf || 0}</td>
                    <td className="p-3">{row.kidsEnter || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-amber-300 mb-3">By mandap event</h2>
        {events.length === 0 ? (
          <p className="text-amber-200/60 text-sm">No mandap events yet.</p>
        ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-amber-500/25 bg-black/25 p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenId((id) => (id === ev.id ? null : ev.id))}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-amber-100 font-semibold">{ev.eventName}</p>
                    <p className="text-amber-200/80 text-sm">{ev.orgName}</p>
                    <p className="text-amber-200/50 text-xs">
                      {ev.startDate} → {ev.endDate}
                      {ev.place ? ` · ${ev.place}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm text-amber-200/90">
                    <span className={ev.status === 'open' ? 'text-green-400 font-bold' : 'text-amber-200/50'}>
                      {ev.status.toUpperCase()}
                    </span>
                    <p>
                      {ev.joins} joined · {ev.completes} completed ({ev.completionPct}%)
                    </p>
                  </div>
                </div>
              </button>
              {openId === ev.id && ev.sittings.length > 0 ? (
                <table className="w-full text-left text-xs mt-3 border-t border-amber-500/20">
                  <thead>
                    <tr className="text-amber-200/70">
                      <th className="py-2 pr-3">Sitting</th>
                      <th className="py-2 pr-3">Kind</th>
                      <th className="py-2 pr-3">Joins</th>
                      <th className="py-2 pr-3">108</th>
                      <th className="py-2">Fill / {data.cap}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ev.sittings.map((s) => (
                      <tr key={s.id} className="text-amber-200/85">
                        <td className="py-1 pr-3">{s.ymd}</td>
                        <td className="py-1 pr-3">{s.kind}</td>
                        <td className="py-1 pr-3">{s.joins}</td>
                        <td className="py-1 pr-3">{s.completes}</td>
                        <td className="py-1">{s.fillPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ))}
        </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-amber-300 mb-3">Virtual World (For KIDS)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <Stat label="Live now" value={kidsWorld.liveNow} hint="Seen in last 90s" />
          <Stat label="Unique visitors" value={kidsWorld.uniqueVisitors} />
          <Stat label="Avg days done" value={kidsWorld.avgDaysDone} hint="Of 9 pooja days" />
          <Stat label="Nimarjanam" value={kidsWorld.nimarjanam} />
          <Stat label="Certificates" value={kidsWorld.certificates} />
        </div>
        <p className="text-amber-200/60 text-xs mb-2">Last stage reached</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border border-amber-500/30 rounded-lg overflow-hidden max-w-xl">
            <thead>
              <tr className="bg-amber-500/20 text-amber-200">
                <th className="p-3">Home</th>
                <th className="p-3">Ratha</th>
                <th className="p-3">Ghat</th>
                <th className="p-3">Done</th>
                <th className="p-3">Other</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/90">
              <tr>
                <td className="p-3">{kidsWorld.stageFunnel.home}</td>
                <td className="p-3">{kidsWorld.stageFunnel.ratha}</td>
                <td className="p-3">{kidsWorld.stageFunnel.ghat}</td>
                <td className="p-3">{kidsWorld.stageFunnel.done}</td>
                <td className="p-3">{kidsWorld.stageFunnel.other}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {kidsWorld.unattributedVisitors ? (
          <p className="text-amber-200/50 text-xs mt-3">
            {kidsWorld.unattributedVisitors} Virtual World visitor(s) opened For KIDS without a mandap join, so they
            are not listed under an organiser.
          </p>
        ) : null}
        <h3 className="text-sm font-semibold text-amber-200/80 mt-6 mb-2">Virtual World by organiser</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border border-amber-500/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-amber-500/20 text-amber-200">
                <th className="p-3">Organiser</th>
                <th className="p-3">Live now</th>
                <th className="p-3">Visitors</th>
                <th className="p-3">Nimarjanam</th>
                <th className="p-3">Certificates</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/90">
              {byOrganiser.map((row) => (
                <tr key={`kids-${row.orgName}`} className="border-t border-amber-500/20">
                  <td className="p-3 font-medium">{row.orgName}</td>
                  <td className="p-3">{row.kidsLive || 0}</td>
                  <td className="p-3">{row.kidsVisitors || 0}</td>
                  <td className="p-3">{row.kidsNimarjanam || 0}</td>
                  <td className="p-3">{row.kidsCerts || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {daily.length > 0 ? (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-amber-300 mb-3">Daily funnel (IST)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-amber-500/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-amber-500/20 text-amber-200">
                  <th className="p-3">Day</th>
                  <th className="p-3">Land</th>
                  <th className="p-3">Join</th>
                  <th className="p-3">Skip</th>
                  <th className="p-3">108</th>
                  <th className="p-3">Share</th>
                  <th className="p-3">PDF</th>
                  <th className="p-3">KIDS</th>
                </tr>
              </thead>
              <tbody className="text-amber-200/90">
                {daily.map((d) => (
                  <tr key={d.ymd} className="border-t border-amber-500/20">
                    <td className="p-3">{d.ymd}</td>
                    <td className="p-3">{d.landing}</td>
                    <td className="p-3">{d.join}</td>
                    <td className="p-3">{d.skip}</td>
                    <td className="p-3">{d.complete}</td>
                    <td className="p-3">{d.share}</td>
                    <td className="p-3">{d.pdf}</td>
                    <td className="p-3">{d.kids_enter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
