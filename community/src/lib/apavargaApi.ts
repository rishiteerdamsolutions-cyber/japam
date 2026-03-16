import { auth } from './firebase';
import { getApiBase } from './apiBase';
import { usePriestStore } from '../store/priestStore';

async function getFirebaseToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const base = getApiBase();
  const priestToken = usePriestStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (priestToken) {
    headers.Authorization = `Bearer ${priestToken}`;
  } else {
    const token = await getFirebaseToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${base}${path}`, { ...options, headers });
  return res;
}

export async function fetchChats() {
  const res = await apiFetch('/api/apavarga/chats');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.chats || [];
}

export async function fetchChat(chatId: string) {
  const chats = await fetchChats();
  return chats.find((c: { id: string }) => c.id === chatId) || null;
}

export async function createChat(templeId: string) {
  const res = await apiFetch('/api/apavarga/chats', {
    method: 'POST',
    body: JSON.stringify({ templeId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchSeekers(): Promise<{ uid: string; displayName: string | null }[]> {
  const res = await apiFetch('/api/apavarga/seekers');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.seekers || [];
}

export async function createSeekerChat(otherUid: string, otherDisplayName?: string) {
  const res = await apiFetch('/api/apavarga/chats', {
    method: 'POST',
    body: JSON.stringify({ otherUid, otherDisplayName: otherDisplayName || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchMessages(chatId: string) {
  const res = await apiFetch(`/api/apavarga/messages?chatId=${encodeURIComponent(chatId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.messages || [];
}

export async function sendMessage(chatId: string, text: string, mediaUrl?: string, mediaKind?: string) {
  const res = await apiFetch('/api/apavarga/messages', {
    method: 'POST',
    body: JSON.stringify({ chatId, text, mediaUrl, mediaKind }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchStatusFeed(): Promise<{ statuses: unknown[]; viewedAuthorKeys: string[] }> {
  const res = await apiFetch('/api/apavarga/status/feed');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return { statuses: data.statuses || [], viewedAuthorKeys: data.viewedAuthorKeys || [] };
}

export async function markStatusViewed(authorKey: string) {
  const res = await apiFetch('/api/apavarga/status/viewed', {
    method: 'POST',
    body: JSON.stringify({ authorKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function createStatus(text: string, mediaUrl?: string, mediaKind?: string) {
  const res = await apiFetch('/api/apavarga/status', {
    method: 'POST',
    body: JSON.stringify({ text, mediaUrl, mediaKind }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchTemples() {
  const res = await apiFetch('/api/apavarga/temples');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.temples || [];
}

export async function requestAppointment(templeId: string, requestedAt: string) {
  const res = await apiFetch('/api/apavarga/appointments/request', {
    method: 'POST',
    body: JSON.stringify({ templeId, requestedAt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchAppointments() {
  const res = await apiFetch('/api/apavarga/appointments/list');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.appointments || [];
}

export async function confirmAppointment(appointmentId: string) {
  const res = await apiFetch('/api/apavarga/appointments/confirm', {
    method: 'POST',
    body: JSON.stringify({ appointmentId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function confirmArrival(appointmentId: string) {
  const res = await apiFetch('/api/apavarga/appointments/arrival-confirm', {
    method: 'POST',
    body: JSON.stringify({ appointmentId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchGroups() {
  const res = await apiFetch('/api/apavarga/groups');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.groups || [];
}

export async function createGroup(name: string, adminOnlyMessaging?: boolean) {
  const res = await apiFetch('/api/apavarga/groups', {
    method: 'POST',
    body: JSON.stringify({ name, adminOnlyMessaging }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function manageGroup(groupId: string, action: string, uid?: string, adminOnlyMessaging?: boolean) {
  const res = await apiFetch('/api/apavarga/groups/manage', {
    method: 'POST',
    body: JSON.stringify({ groupId, action, uid, adminOnlyMessaging }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchPriestSettings() {
  const res = await apiFetch('/api/apavarga/priest/settings');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function updatePriestSettings(welcomeAutoReply: string, appointmentAutoReply: string) {
  const res = await apiFetch('/api/apavarga/priest/settings', {
    method: 'POST',
    body: JSON.stringify({ welcomeAutoReply, appointmentAutoReply }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function fetchReals(beforeId?: string): Promise<{ id: string; mediaUrl: string; thumbnailUrl?: string | null; caption?: string; createdAt: string; templeName?: string | null }[]> {
  const url = beforeId
    ? `/api/apavarga/reals?limit=20&before=${encodeURIComponent(beforeId)}`
    : '/api/apavarga/reals?limit=20';
  const res = await apiFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.reals || [];
}

export async function createReal(options: { mediaUrl?: string; thumbnailUrl?: string; caption?: string; durationSeconds?: number }) {
  const res = await apiFetch('/api/apavarga/reals', {
    method: 'POST',
    body: JSON.stringify({
      mediaUrl: options.mediaUrl,
      thumbnailUrl: options.thumbnailUrl,
      caption: options.caption,
      durationSeconds: options.durationSeconds,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}
