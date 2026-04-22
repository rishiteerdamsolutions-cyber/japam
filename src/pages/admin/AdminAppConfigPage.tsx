import { useState, useEffect } from 'react';
import { getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function AdminAppConfigPage() {
  const [apavargaLaunched, setApavargaLaunched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const headers = (): HeadersInit => {
    const t = getStoredAdminToken();
    return t ? { 'X-Admin-Token': t } : {};
  };

  useEffect(() => {
    const url = API_BASE ? `${API_BASE}/api/admin/app-config` : '/api/admin/app-config';
    fetch(url, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        if (d?.apavargaLaunched === true) setApavargaLaunched(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/app-config` : '/api/admin/app-config';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ apavargaLaunched: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Save failed');
        return;
      }
      setApavargaLaunched(next);
      setMessage(next ? 'Apavarga is live for Pro users in the app.' : 'Apavarga shows as launching soon for everyone.');
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-amber-400 mb-2">App configuration</h1>
      <p className="text-amber-200/70 text-sm mb-6 max-w-md">
        Turn on Apavarga only when the spiritual social network is ready. Until then, users see &quot;Apavarga (Spiritual Social Network) — Launching soon&quot; instead of Pro unlock messaging.
      </p>

      {loading ? (
        <p className="text-amber-200/80 text-sm">Loading…</p>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-black/30 p-4 max-w-md space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-amber-200 font-medium">Apavarga launched</p>
              <p className="text-amber-200/60 text-xs mt-1">When off: launching soon. When on: Pro users see enter / others see Unlock Pro.</p>
            </div>
            <span className={`text-sm font-semibold ${apavargaLaunched ? 'text-green-400' : 'text-amber-200/50'}`}>
              {apavargaLaunched ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || apavargaLaunched}
              onClick={() => save(true)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-40"
            >
              Launch Apavarga
            </button>
            <button
              type="button"
              disabled={saving || !apavargaLaunched}
              onClick={() => save(false)}
              className="px-4 py-2 rounded-lg bg-white/10 text-amber-200 text-sm font-medium disabled:opacity-40"
            >
              Set launching soon
            </button>
          </div>
          {message && <p className="text-amber-200/90 text-sm">{message}</p>}
        </div>
      )}
    </div>
  );
}
