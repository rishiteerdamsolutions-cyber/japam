import { getApiBase } from './apiBase';
import { auth } from './firebase';

function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export type SatsangStatus =
  | { open: false }
  | {
      open: true;
      cap: number;
      yagnaTarget: number;
      sittingTarget: number;
    };

export type SatsangJoinResult = {
  ok: true;
  eventId: string;
  orgName: string;
  eventName: string;
  place: string | null;
  sittingYmd: string;
  isTrial: boolean;
  cap: number;
  sittingTarget: number;
  yagnaTarget: number;
  alreadyJoined: boolean;
  completed108: boolean;
  participantCount: number;
  displayName: string;
};

export type SatsangReport = {
  ok: true;
  orgName: string;
  eventName: string;
  place: string | null;
  date: string;
  isTrial: boolean;
  participantCount: number;
  cap: number;
  names: string[];
};

const FESTIVAL_LANDING_KEY = 'japam_satsang_landing_open';
const festivalLandingListeners = new Set<() => void>();

export function peekFestivalLandingOpen(): boolean | null {
  try {
    const v = localStorage.getItem(FESTIVAL_LANDING_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* ignore */
  }
  return null;
}

export function rememberFestivalLandingOpen(open: boolean) {
  try {
    localStorage.setItem(FESTIVAL_LANDING_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
  festivalLandingListeners.forEach((listener) => listener());
}

export function subscribeFestivalLandingOpen(onStoreChange: () => void): () => void {
  festivalLandingListeners.add(onStoreChange);
  return () => {
    festivalLandingListeners.delete(onStoreChange);
  };
}

export function getFestivalLandingOpenSnapshot(): boolean {
  return peekFestivalLandingOpen() === true;
}

/** Network/API failure returns null so the home switch can keep the last known festival landing. */
export async function fetchSatsangLandingOpen(): Promise<boolean | null> {
  try {
    const res = await fetch(apiUrl('/api/public/satsang-status'));
    const data = (await res.json().catch(() => ({}))) as SatsangStatus;
    if (!res.ok || !data) return null;
    return data.open === true;
  } catch {
    return null;
  }
}

export async function loadSatsangStatus(): Promise<SatsangStatus> {
  try {
    const res = await fetch(apiUrl('/api/public/satsang-status'));
    const data = (await res.json().catch(() => ({}))) as SatsangStatus;
    if (!res.ok || !data) return { open: false };
    const isOpen = data.open === true;
    rememberFestivalLandingOpen(isOpen);
    if (!isOpen) return { open: false };
    return data;
  } catch {
    return { open: false };
  }
}

export async function joinSatsang(code: string): Promise<
  { ok: true; result: SatsangJoinResult } | { ok: false; error: string; code?: string }
> {
  const token = await getFirebaseIdToken();
  if (!token) return { ok: false, error: 'Sign in with Google first.', code: 'auth' };
  try {
    const res = await fetch(apiUrl('/api/satsang/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    const data = (await res.json().catch(() => ({}))) as SatsangJoinResult & { error?: string; code?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Could not join.', code: data.code };
    }
    return { ok: true, result: data };
  } catch {
    return { ok: false, error: 'Network error. Try again.' };
  }
}

export async function completeSatsang(input: {
  eventId: string;
  isTrial: boolean;
  name: string;
  gotram: string;
  mobileNumber: string;
}): Promise<{ ok: true; alreadyComplete: boolean } | { ok: false; error: string }> {
  const token = await getFirebaseIdToken();
  if (!token) return { ok: false, error: 'Sign in with Google first.' };
  try {
    const res = await fetch(apiUrl('/api/satsang/complete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      alreadyComplete?: boolean;
      error?: string;
    };
    if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Could not save.' };
    return { ok: true, alreadyComplete: data.alreadyComplete === true };
  } catch {
    return { ok: false, error: 'Network error. Try again.' };
  }
}

export async function loadSatsangReport(code: string): Promise<
  { ok: true; report: SatsangReport } | { ok: false; error: string }
> {
  try {
    const q = new URLSearchParams({ code });
    const res = await fetch(apiUrl(`/api/public/satsang-report?${q.toString()}`));
    const data = (await res.json().catch(() => ({}))) as SatsangReport & { error?: string };
    if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Could not load report.' };
    return { ok: true, report: data };
  } catch {
    return { ok: false, error: 'Network error. Try again.' };
  }
}
