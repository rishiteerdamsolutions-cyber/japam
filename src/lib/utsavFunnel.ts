import { getApiBase } from './apiBase';
import { auth } from './firebase';

const SESSION_KEY = 'japam_utsav_funnel_landing';

async function idToken(): Promise<string | null> {
  try {
    return (await auth?.currentUser?.getIdToken()) || null;
  } catch {
    return null;
  }
}

/** Fire-and-forget Ganesha Utsav funnel event for Admin. */
export function trackUtsavFunnel(
  type: 'landing' | 'skip' | 'share' | 'pdf' | 'kids_enter',
  extra?: { eventId?: string | null; orgName?: string | null },
): void {
  if (type === 'landing') {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }
  void (async () => {
    const base = getApiBase();
    const url = base ? `${base}/api/satsang/analytics-event` : '/api/satsang/analytics-event';
    const token = await idToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type,
        eventId: extra?.eventId || undefined,
        orgName: extra?.orgName || undefined,
      }),
      keepalive: true,
    });
  })().catch(() => {});
}
