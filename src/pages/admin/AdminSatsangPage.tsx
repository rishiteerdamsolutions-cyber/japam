import { useCallback, useEffect, useState } from 'react';
import { getStoredAdminToken } from '../../lib/adminAuth';
import { generateSatsangCodePreview } from '../../lib/satsangAdminCodes';
import { istYmdFromDate } from '../../lib/weeklyStreakIst';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type DailyCodes = Record<string, string>;

interface SatsangEvent {
  id: string;
  orgName: string;
  eventName: string;
  place: string | null;
  status: 'open' | 'closed';
  cap: number;
  startDate: string;
  endDate: string;
  trialCodes: string[];
  dailyCodes: DailyCodes;
}

function eachYmd(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const out: string[] = [];
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const cur = new Date(Date.UTC(ys, ms - 1, ds));
  const last = Date.UTC(ye, me - 1, de);
  while (cur.getTime() <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

const emptyForm = {
  orgName: '',
  eventName: '',
  place: '',
  startDate: '',
  endDate: '',
  trial1: '',
  trial2: '',
  dailyCodes: {} as DailyCodes,
};

export function AdminSatsangPage() {
  const token = getStoredAdminToken();
  const [events, setEvents] = useState<SatsangEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const headers = (): HeadersInit => {
    const t = getStoredAdminToken();
    return t
      ? { Authorization: `Bearer ${t}`, 'X-Admin-Token': t, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/satsang-events` : '/api/admin/satsang-events';
      const res = await fetch(url, { headers: headers() });
      if (res.status === 401) {
        window.location.href = '/admin';
        return;
      }
      const data = await res.json();
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch {
      setMessage('Failed to load satsang events');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const days = eachYmd(form.startDate, form.endDate);
    setForm((prev) => {
      const next: DailyCodes = {};
      for (const ymd of days) next[ymd] = prev.dailyCodes[ymd] || generateSatsangCodePreview();
      return { ...prev, dailyCodes: next };
    });
  }, [form.startDate, form.endDate]);

  const fillRandomCodes = () => {
    setForm((prev) => {
      const dailyCodes: DailyCodes = {};
      for (const ymd of Object.keys(prev.dailyCodes)) dailyCodes[ymd] = generateSatsangCodePreview();
      return {
        ...prev,
        trial1: generateSatsangCodePreview(),
        trial2: generateSatsangCodePreview(),
        dailyCodes,
      };
    });
  };

  const startEdit = (ev: SatsangEvent) => {
    setEditingId(ev.id);
    setForm({
      orgName: ev.orgName,
      eventName: ev.eventName,
      place: ev.place || '',
      startDate: ev.startDate,
      endDate: ev.endDate,
      trial1: ev.trialCodes[0] || '',
      trial2: ev.trialCodes[1] || '',
      dailyCodes: { ...ev.dailyCodes },
    });
    setMessage(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/satsang-events` : '/api/admin/satsang-events';
      const res = await fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action: editingId ? 'update' : 'create',
          id: editingId || undefined,
          orgName: form.orgName,
          eventName: form.eventName,
          place: form.place,
          startDate: form.startDate,
          endDate: form.endDate,
          trialCodes: [form.trial1, form.trial2],
          dailyCodes: form.dailyCodes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Save failed');
        return;
      }
      setMessage(editingId ? 'Event updated.' : 'Event created (closed). Open it when the mandap is ready.');
      resetForm();
      await load();
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: 'open' | 'closed') => {
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/satsang-events` : '/api/admin/satsang-events';
      const res = await fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'setStatus', id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Could not change status');
        return;
      }
      setMessage(
        status === 'open'
          ? 'This mandap is OPEN. japam.digital (and /ganeshotsav) is the Ganesha Utsav landing. Today’s spoken code sends people into this event (cap 50).'
          : 'This mandap is CLOSED. Its codes will not join. The public site stays festival until every mandap is closed.',
      );
      await load();
    } catch {
      setMessage('Network error');
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://japam.digital';

  return (
    <div>
      <h1 className="text-xl font-bold text-amber-400 mb-2">Ganesha Utsav satsang</h1>
      <p className="text-amber-200/70 text-sm mb-4 max-w-xl">
        One event per mandap. While any mandap is OPEN, japam.digital itself is the Ganesha Utsav landing (PWA install
        included). Leftover QR posters can still use{' '}
        <span className="text-amber-100">{origin}/ganeshotsav</span>. The spoken code (not on the QR) chooses the
        organisation, event name, and that mandap’s 50 seats. Codes must be unique across mandaps. Open several
        mandaps at once. When every event is closed, home returns to the normal Japam landing. Organizer report:{' '}
        <span className="text-amber-100">{origin}/satsang-report</span> — same page, that mandap’s code.
      </p>

      {message ? <p className="text-amber-200 text-sm mb-4">{message}</p> : null}

      <div className="rounded-xl border border-amber-500/30 bg-black/30 p-4 max-w-xl mb-8 space-y-3">
        <h2 className="text-amber-300 font-semibold">{editingId ? 'Edit event' : 'New event'}</h2>
        <input
          value={form.orgName}
          onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
          placeholder="Organisation / youth name"
          className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
        />
        <input
          value={form.eventName}
          onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
          placeholder="Event name (e.g. Ganesha Utsav Japa Yagna)"
          className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
        />
        <input
          value={form.place}
          onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
          placeholder="Mandap / place name"
          className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
          />
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
          />
        </div>
        <p className="text-amber-200/60 text-xs">2 trial codes (rehearsal) + one live code per IST day. Cap 50.</p>
        <div className="flex gap-2">
          <input
            value={form.trial1}
            onChange={(e) => setForm((f) => ({ ...f, trial1: e.target.value.toUpperCase() }))}
            placeholder="Trial code 1"
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
          />
          <input
            value={form.trial2}
            onChange={(e) => setForm((f) => ({ ...f, trial2: e.target.value.toUpperCase() }))}
            placeholder="Trial code 2"
            className="flex-1 px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30"
          />
        </div>
        <button type="button" onClick={fillRandomCodes} className="text-amber-300 text-xs underline">
          Generate random codes
        </button>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {Object.keys(form.dailyCodes)
            .sort()
            .map((ymd) => (
              <div key={ymd} className="flex items-center gap-2">
                <span className="text-amber-200/70 text-xs w-28 shrink-0">{ymd}</span>
                <input
                  value={form.dailyCodes[ymd]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dailyCodes: { ...f.dailyCodes, [ymd]: e.target.value.toUpperCase() },
                    }))
                  }
                  className="flex-1 px-2 py-1 rounded bg-black/40 text-white border border-amber-500/30 text-sm tracking-widest"
                />
              </div>
            ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Saving…' : editingId ? 'Update event' : 'Create event'}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-amber-200 text-sm">
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-amber-200/80 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3 max-w-xl">
          {events.length === 0 ? <p className="text-amber-200/60 text-sm">No events yet.</p> : null}
          {events.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-amber-500/25 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-amber-100 font-semibold">{ev.eventName}</p>
                  <p className="text-amber-200/80 text-sm">{ev.orgName}</p>
                  <p className="text-amber-200/50 text-xs">
                    {ev.startDate} → {ev.endDate}
                    {ev.place ? ` · ${ev.place}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-bold ${ev.status === 'open' ? 'text-green-400' : 'text-amber-200/50'}`}>
                  {ev.status.toUpperCase()}
                </span>
              </div>
              <p className="text-amber-200/60 text-[11px] mt-2">
                Today’s live code (speak this at the mandap):{' '}
                <span className="text-amber-100 font-semibold tracking-widest">
                  {ev.dailyCodes[istYmdFromDate()] || '— none for today'}
                </span>
              </p>
              <p className="text-amber-200/50 text-[11px] mt-1">Trials: {ev.trialCodes.join(', ') || '—'}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {ev.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => void setStatus(ev.id, 'closed')}
                    className="px-3 py-1.5 rounded bg-rose-700 text-white text-xs"
                  >
                    Close event
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setStatus(ev.id, 'open')}
                    className="px-3 py-1.5 rounded bg-green-700 text-white text-xs"
                  >
                    Open event
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(ev)}
                  className="px-3 py-1.5 rounded border border-amber-500/40 text-amber-200 text-xs"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
