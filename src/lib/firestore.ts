import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { app, auth, isFirebaseConfigured } from './firebase';
import { getApiBase } from './apiBase';
import { fetchWithRetry } from './fetchWithRetry';
import type { LevelProgress } from '../store/progressStore';
import type { JapaCounts } from '../store/japaStore';

const db = isFirebaseConfigured && app ? getFirestore(app) : null;

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

async function getIdTokenWithRetry(user: User | null | undefined, attempts = 5, delayMs = 200): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const u = user ?? auth?.currentUser ?? null;
      if (u) {
        const token = await u.getIdToken();
        if (token) return token;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export type UserTier = 'free' | 'pro' | 'premium';

export interface UserUnlockData {
  levelsUnlocked: boolean;
  tier: UserTier;
  isDonor: boolean;
  blocked?: boolean;
}

/** Unlock (paid) status and tier. Logged-in: only backend API — same on all devices. */
export async function loadUserUnlock(_uid: string): Promise<UserUnlockData> {
  const token = await getFirebaseIdToken();
  if (!token) return { levelsUnlocked: false, tier: 'free', isDonor: false };
  try {
    const url = apiUrl('/api/user/unlock');
    const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) return { levelsUnlocked: false, tier: 'free', isDonor: false, blocked: true };
    if (res.ok) {
      const data = (await res.json()) as { levelsUnlocked?: boolean; tier?: UserTier; isDonor?: boolean };
      return {
        levelsUnlocked: Boolean(data?.levelsUnlocked),
        tier: (data?.tier as UserTier) || (data?.levelsUnlocked ? 'pro' : 'free'),
        isDonor: Boolean(data?.isDonor),
      };
    }
  } catch {
    // no fallback: treat as not unlocked
  }
  return { levelsUnlocked: false, tier: 'free', isDonor: false };
}

const DEFAULT_UNLOCK_PRICE_PAISE = 10800; // ₹108 (auspicious)
const DEFAULT_DISPLAY_PRICE_PAISE = 9900; // ₹99 strikethrough

const DEFAULT_APPOINTMENT_FEE_PAISE = 10800; // ₹108 priest appointment

/** Unlock + display + lives + appointment fee in paise. Tries /api/price first, then Firestore. */
export async function loadPricingConfig(): Promise<{ unlockPricePaise: number; displayPricePaise: number; livesPricePaise: number; appointmentFeePaise: number }> {
  let unlock: number | null = null;
  let display: number | null = null;
  let lives: number | null = null;
  let appointmentFee: number | null = null;
  try {
    const url = apiUrl('/api/price');
    const res = await fetchWithRetry(url);
    if (res.ok) {
      const data = (await res.json()) as { unlockPricePaise?: number; displayPricePaise?: number; livesPricePaise?: number; appointmentFeePaise?: number };
      const u = data?.unlockPricePaise;
      const d = data?.displayPricePaise;
      const l = data?.livesPricePaise;
      const a = data?.appointmentFeePaise;
      if (typeof u === 'number' && u >= 100) unlock = Math.round(u);
      if (typeof d === 'number' && d >= 100) display = Math.round(d);
      if (typeof l === 'number' && l >= 100) lives = Math.round(l);
      if (typeof a === 'number' && a >= 100) appointmentFee = Math.round(a);
    }
  } catch {
    // fallback to Firestore if API not available
  }
  if ((unlock == null || display == null || lives == null || appointmentFee == null) && db) {
    try {
      const snap = await getDoc(doc(db, 'config', 'pricing'));
      if (snap.exists()) {
        const d = snap.data() as { unlockPricePaise?: number; displayPricePaise?: number; livesPricePaise?: number; appointmentFeePaise?: number };
        if (unlock == null && typeof d?.unlockPricePaise === 'number' && d.unlockPricePaise >= 100) unlock = Math.round(d.unlockPricePaise);
        if (display == null && typeof d?.displayPricePaise === 'number' && d.displayPricePaise >= 100) display = Math.round(d.displayPricePaise);
        if (lives == null && typeof d?.livesPricePaise === 'number' && d.livesPricePaise >= 100) lives = Math.round(d.livesPricePaise);
        if (appointmentFee == null && typeof d?.appointmentFeePaise === 'number' && d.appointmentFeePaise >= 100) appointmentFee = Math.round(d.appointmentFeePaise);
      }
    } catch {
      // ignore
    }
  }
  return {
    unlockPricePaise: unlock ?? DEFAULT_UNLOCK_PRICE_PAISE,
    displayPricePaise: display ?? DEFAULT_DISPLAY_PRICE_PAISE,
    livesPricePaise: lives ?? 1900,
    appointmentFeePaise: appointmentFee ?? DEFAULT_APPOINTMENT_FEE_PAISE,
  };
}

/** Save pricing to Firestore (legacy; when not using backend set-price) */
export async function savePricingConfig(unlockPricePaise: number, displayPricePaise?: number): Promise<void> {
  if (!db) return;
  const data: { unlockPricePaise: number; displayPricePaise?: number } = { unlockPricePaise };
  if (typeof displayPricePaise === 'number' && displayPricePaise >= 100) data.displayPricePaise = displayPricePaise;
  await setDoc(doc(db, 'config', 'pricing'), data, { merge: true });
}

function getAdminUids(data: Record<string, unknown> | null): string[] {
  if (!data) return [];
  if (Array.isArray(data.uids)) return data.uids.map(String);
  const single = data.uid ?? data.userId ?? data.user_id ?? data.UID;
  if (single != null && single !== '') return [String(single)];
  return [];
}

/** Check if current user is admin */
export async function loadIsAdmin(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    if (!snap.exists()) return false;
    const uids = getAdminUids(snap.data() as Record<string, unknown>);
    return uids.includes(uid);
  } catch {
    return false;
  }
}

/** Debug: why admin check might fail (for Settings message) */
export async function loadAdminCheckDebug(uid: string): Promise<{
  ok: boolean;
  docExists: boolean;
  uidsLength: number;
  yourUidInList: boolean;
  error?: string;
}> {
  if (!db) return { ok: false, docExists: false, uidsLength: 0, yourUidInList: false, error: 'Firebase not configured' };
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    const docExists = snap.exists();
    const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    const uids = getAdminUids(data);
    const yourUidInList = uids.includes(uid);
    return { ok: docExists && yourUidInList, docExists, uidsLength: uids.length, yourUidInList };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, docExists: false, uidsLength: 0, yourUidInList: false, error };
  }
}

/** Progress. Logged-in: only backend API — same on all devices. No client Firestore fallback. */
export async function loadUserProgress(_uid: string): Promise<{ levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> } | null> {
  const token = await getFirebaseIdToken();
  if (!token) return null;
  const url = apiUrl('/api/user/progress');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) {
        const err = new Error('Forbidden') as Error & { status: number };
        err.status = 403;
        throw err;
      }
      if (res.ok) {
        const data = (await res.json()) as { levelProgress?: Record<string, LevelProgress>; currentLevelByMode?: Record<string, number> };
        return { levelProgress: data?.levelProgress ?? {}, currentLevelByMode: data?.currentLevelByMode ?? {} };
      }
    } catch (e) {
      if ((e as Error & { status?: number })?.status === 403) throw e;
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

/** Save progress. Logged-in: only backend API — single source of truth. No client Firestore write. */
export async function saveUserProgress(_uid: string, data: { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }): Promise<void> {
  const token = await getFirebaseIdToken();
  if (!token) return;
  const url = apiUrl('/api/user/progress');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) return;
    } catch {
      if (attempt === 1) return;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

/** Japa. Logged-in: backend API only (one source, same on all devices). No client Firestore. */
export async function loadUserJapa(_uid: string): Promise<JapaCounts | null> {
  const token = await getFirebaseIdToken();
  if (!token) return null;
  const url = apiUrl('/api/user/japa');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) {
        const err = new Error('Forbidden') as Error & { status: number };
        err.status = 403;
        throw err;
      }
      if (res.ok) {
        const data = (await res.json()) as { counts?: JapaCounts | null };
        const counts = data?.counts;
        return counts && typeof counts === 'object' ? (counts as JapaCounts) : null;
      }
    } catch (e) {
      if ((e as Error & { status?: number })?.status === 403) throw e;
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

/** Load paused game for a specific game key. Logged-in: backend API only. */
export async function loadUserPausedGame(_uid: string, user?: User | null, key?: string | null): Promise<Record<string, unknown> | null> {
  const token = await getIdTokenWithRetry(user);
  if (!token) return null;
  if (!key) return null;
  const url = apiUrl(`/api/user/paused-game?key=${encodeURIComponent(key)}`);
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) return null;
    if (res.ok) {
      const data = (await res.json()) as { pausedGame?: Record<string, unknown> | null };
      return data?.pausedGame && typeof data.pausedGame === 'object' ? data.pausedGame : null;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Save paused game. Logged-in: backend API only. Pass null to clear. When clearing, pass key so only that game is cleared. */
export async function saveUserPausedGame(_uid: string, pausedGame: Record<string, unknown> | null, user?: User | null, key?: string | null): Promise<boolean> {
  const token = await getIdTokenWithRetry(user);
  if (!token) return false;
  const url = apiUrl('/api/user/paused-game');
  const body = pausedGame == null ? { pausedGame: null, key: key || undefined } : { pausedGame };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/** Reset user's japa count for a Maha Japa Yagna to 0 (Start fresh). */
export async function resetMahaYagnaContribution(yagnaId: string, user?: User | null): Promise<boolean> {
  const token = await getIdTokenWithRetry(user);
  if (!token) return false;
  const url = apiUrl('/api/maha-yagnas/reset-contribution');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ yagnaId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Save japa. Logged-in: backend API only. Uses token retry so japas save reliably (e.g. Maha Japa Yagna). */
export async function saveUserJapa(_uid: string, counts: JapaCounts): Promise<void> {
  let token = await getIdTokenWithRetry(null);
  if (!token) {
    try {
      const u = auth?.currentUser;
      if (u) token = await u.getIdToken(true);
    } catch {}
  }
  if (!token) return;
  const url = apiUrl('/api/user/japa');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(counts),
      });
      if (res.ok) return;
    } catch {
      if (attempt === 2) return;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

export type PublicActiveUser = {
  uid: string;
  name: string | null;
  totalJapas: number;
  appreciations: { heart: number; like: number; clap: number };
  lastActiveAt: string | null;
};

/** Public: active users in last 24 hours (no auth required). */
export async function loadPublicActiveUsers(): Promise<PublicActiveUser[]> {
  const url = apiUrl('/api/public/active-users');
  try {
    const res = await fetch(url);
    const data = (await res.json().catch(() => ({}))) as { users?: PublicActiveUser[] };
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

/** Send appreciation. Logged-in only. */
export async function sendUserReaction(_uid: string, targetUid: string, type: 'heart' | 'like' | 'clap'): Promise<boolean> {
  const token = await getFirebaseIdToken();
  if (!token) return false;
  const url = apiUrl('/api/user/react');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUid, type }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type MyAppreciations = { heart: number; like: number; clap: number };

/** Load current user's lifetime appreciations (received). Logged-in only. */
export async function loadMyAppreciations(_uid: string): Promise<MyAppreciations | null> {
  const token = await getFirebaseIdToken();
  if (!token) return null;
  const url = apiUrl('/api/user/profile');
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { appreciations?: MyAppreciations };
    const a = data?.appreciations;
    if (!a || typeof a !== 'object') return { heart: 0, like: 0, clap: 0 };
    return {
      heart: typeof a.heart === 'number' ? a.heart : 0,
      like: typeof a.like === 'number' ? a.like : 0,
      clap: typeof a.clap === 'number' ? a.clap : 0,
    };
  } catch {
    return null;
  }
}

export type DailyReminder = { enabled: boolean; time: string | null };

export async function loadUserReminder(_uid: string): Promise<DailyReminder | null> {
  const token = await getFirebaseIdToken();
  if (!token) return null;
  const url = apiUrl('/api/user/reminder');
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { reminder?: DailyReminder | null };
    const r = data?.reminder;
    if (!r || typeof r !== 'object') return null;
    return { enabled: r.enabled === true, time: typeof r.time === 'string' ? r.time : null };
  } catch {
    return null;
  }
}

export async function saveUserReminder(_uid: string, reminder: DailyReminder): Promise<boolean> {
  const token = await getFirebaseIdToken();
  if (!token) return false;
  const url = apiUrl('/api/user/reminder');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: reminder.enabled, time: reminder.time }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
