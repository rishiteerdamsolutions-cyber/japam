import { getApiBase } from './apiBase';
import { fetchWithRetry } from './fetchWithRetry';

function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

export async function occasionsFetch(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const m = (init.method || 'GET').toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') headers.set('Content-Type', 'application/json');
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  return fetchWithRetry(apiUrl(path), { ...init, headers });
}

export type AnniversarySessionFlavor = 'occasion' | 'couple_daily';

export type AnniversaryCreateResponse = {
  sessionId: string;
  joinToken: string;
  guestRole: string;
  hostRole: string;
  gameMode: string;
  levelIndex: number;
  sessionFlavor: AnniversarySessionFlavor;
};

export async function createAnniversarySession(
  token: string,
  body: {
    hostRole: 'husband' | 'wife';
    gameMode?: string;
    levelIndex?: number;
    sessionFlavor?: AnniversarySessionFlavor;
  },
): Promise<AnniversaryCreateResponse> {
  const res = await occasionsFetch('/api/occasions/anniversary/create', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to create session');
  return data as unknown as AnniversaryCreateResponse;
}

export async function joinAnniversarySession(
  token: string,
  sessionId: string,
  joinToken: string,
): Promise<{
  gameMode: string;
  levelIndex: number;
  hostRole: string;
  guestRole: string;
  sessionFlavor: AnniversarySessionFlavor;
}> {
  const res = await occasionsFetch('/api/occasions/anniversary/join', {
    method: 'POST',
    body: JSON.stringify({ sessionId, joinToken }),
    token,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to join');
  const sessionFlavor: AnniversarySessionFlavor =
    data.sessionFlavor === 'couple_daily' ? 'couple_daily' : 'occasion';
  return {
    gameMode: String(data.gameMode ?? 'general'),
    levelIndex: Number(data.levelIndex ?? 0),
    hostRole: String(data.hostRole ?? 'husband'),
    guestRole: String(data.guestRole ?? 'wife'),
    sessionFlavor,
  };
}

export async function completeAnniversarySession(
  token: string,
  sessionId: string,
  japasHusband: number,
  japasWife: number,
): Promise<{ sharedToWife: number; wifeTotalPunya: number }> {
  const res = await occasionsFetch('/api/occasions/anniversary/complete', {
    method: 'POST',
    body: JSON.stringify({ sessionId, japasHusband, japasWife }),
    token,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to complete');
  return {
    sharedToWife: Number(data.sharedToWife ?? 0),
    wifeTotalPunya: Number(data.wifeTotalPunya ?? 0),
  };
}

export async function completeBirthdayOccasion(
  token: string,
  body: { mode: string; japasTotal: number; japasByDeity: Record<string, number> },
): Promise<void> {
  const res = await occasionsFetch('/api/occasions/birthday/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save');
}

export type OccasionListItem = {
  id: string;
  type?: string;
  mode?: string;
  japasTotal?: number;
  japasByDeity?: Record<string, number>;
  sessionId?: string;
  japasHusband?: number;
  japasWife?: number;
  sharedToWife?: number;
  wifeTotalPunya?: number;
  myRole?: string;
  completedAt?: number | null;
};

export async function fetchOccasionsList(token: string): Promise<OccasionListItem[]> {
  const res = await occasionsFetch('/api/occasions/list', { method: 'GET', token });
  const data = (await res.json().catch(() => ({}))) as { items?: OccasionListItem[] };
  if (!res.ok) return [];
  return Array.isArray(data.items) ? data.items : [];
}

export type AnniversaryActiveSession = {
  sessionId: string;
  status: string;
  sessionPaused: boolean;
  gameMode: string;
  levelIndex: number;
  myRole: 'husband' | 'wife';
  isHost: boolean;
  japasHusband: number;
  japasWife: number;
  partnerJoined: boolean;
};

export async function fetchAnniversaryActiveSessions(token: string): Promise<AnniversaryActiveSession[]> {
  const res = await occasionsFetch('/api/occasions/anniversary/active', { method: 'GET', token });
  const data = (await res.json().catch(() => ({}))) as { items?: AnniversaryActiveSession[] };
  if (!res.ok) return [];
  if (!Array.isArray(data.items)) return [];
  return data.items.map((row) => ({
    sessionId: String(row.sessionId ?? ''),
    status: String(row.status ?? 'playing'),
    sessionPaused: row.sessionPaused === true,
    gameMode: String(row.gameMode ?? 'general'),
    levelIndex: Number(row.levelIndex ?? 0),
    myRole: row.myRole === 'wife' ? 'wife' : 'husband',
    isHost: row.isHost === true,
    japasHusband: Number(row.japasHusband ?? 0),
    japasWife: Number(row.japasWife ?? 0),
    partnerJoined: row.partnerJoined === true,
  }));
}
