import type { DeityId } from '../data/deities';
import { getApiBase } from './apiBase';
import { auth } from './firebase';
import type { LeaderboardEntry } from './rankCard';

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

export type JapamCounterMode = 'manual' | 'auto';

export type JapamCounterLeaderboardRow = {
  rank: number;
  uid: string;
  name: string;
  counterMode: JapamCounterMode;
  japasCount: number;
};

function parseRow(item: unknown): JapamCounterLeaderboardRow | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const uid = typeof o.uid === 'string' ? o.uid.trim() : '';
  if (!uid) return null;
  const counterMode = o.counterMode === 'auto' ? 'auto' : 'manual';
  const japasCount = Math.max(0, Math.round(Number(o.japasCount) || 0));
  const rank = Math.max(1, Math.round(Number(o.rank) || 1));
  const name =
    typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 80) : uid.slice(0, 8);
  return { rank, uid, name, counterMode, japasCount };
}

export async function incrementJapamCounter(
  mode: JapamCounterMode,
  deityId: DeityId,
  delta = 1,
): Promise<{ yourMonth: number; manualMonth: number; autoMonth: number; monthKey: string } | null> {
  const token = await getFirebaseIdToken();
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/user/japam-counter-increment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, deity: deityId, delta }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      yourMonth?: number;
      manualMonth?: number;
      autoMonth?: number;
      monthKey?: string;
    };
    if (!res.ok || !data.ok) return null;
    return {
      yourMonth: Math.max(0, Math.round(Number(data.yourMonth) || 0)),
      manualMonth: Math.max(0, Math.round(Number(data.manualMonth) || 0)),
      autoMonth: Math.max(0, Math.round(Number(data.autoMonth) || 0)),
      monthKey: typeof data.monthKey === 'string' ? data.monthKey : '',
    };
  } catch {
    return null;
  }
}

export async function loadJapamCounterLeaderboard(options: {
  deityId: DeityId;
  monthKey?: string;
  mode?: JapamCounterMode | 'all';
}): Promise<{
  leaderboard: JapamCounterLeaderboardRow[];
  monthKey: string;
  viewerManual: number;
  viewerAuto: number;
}> {
  const token = await getFirebaseIdToken();
  const q = new URLSearchParams();
  q.set('deity', options.deityId);
  if (options.monthKey) q.set('month', options.monthKey);
  if (options.mode && options.mode !== 'all') q.set('mode', options.mode);
  const qs = q.toString();
  const url = apiUrl(`/api/public/japam-counter-leaderboard${qs ? `?${qs}` : ''}`);
  try {
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    const data = (await res.json().catch(() => ({}))) as {
      leaderboard?: unknown[];
      monthKey?: string;
      viewerManual?: number;
      viewerAuto?: number;
    };
    const raw = Array.isArray(data.leaderboard) ? data.leaderboard : [];
    const leaderboard: JapamCounterLeaderboardRow[] = [];
    for (const item of raw) {
      const row = parseRow(item);
      if (row) leaderboard.push(row);
    }
    return {
      leaderboard,
      monthKey: typeof data.monthKey === 'string' ? data.monthKey : '',
      viewerManual: Math.max(0, Math.round(Number(data.viewerManual) || 0)),
      viewerAuto: Math.max(0, Math.round(Number(data.viewerAuto) || 0)),
    };
  } catch {
    return { leaderboard: [], monthKey: '', viewerManual: 0, viewerAuto: 0 };
  }
}

export function mapJapamCounterLeaderboardToRankCardEntries(
  rows: JapamCounterLeaderboardRow[],
  modeLabel: (m: JapamCounterMode) => string,
): LeaderboardEntry[] {
  return rows.map((r) => ({
    rank: r.rank,
    uid: r.uid,
    name: `${r.name} · ${modeLabel(r.counterMode)}`,
    japasCount: r.japasCount,
  }));
}
