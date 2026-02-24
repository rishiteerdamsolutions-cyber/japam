import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app, auth, isFirebaseConfigured } from './firebase';
import type { LevelProgress } from '../store/progressStore';
import type { JapaCounts } from '../store/japaStore';

const db = isFirebaseConfigured && app ? getFirestore(app) : null;

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

function apiUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

/** Unlock status for levels 6+ (payment) */
export async function loadUserUnlock(uid: string): Promise<boolean> {
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const res = await fetch(apiUrl('/api/user/unlock'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = (await res.json()) as { levelsUnlocked?: boolean };
        return Boolean(data?.levelsUnlocked);
      }
    }
  } catch {
    // fall back to client Firestore
  }
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', 'unlock'));
    return snap.exists() && Boolean((snap.data() as { levelsUnlocked?: boolean }).levelsUnlocked);
  } catch {
    return false;
  }
}

const DEFAULT_UNLOCK_PRICE_PAISE = 1000; // ₹10
const DEFAULT_DISPLAY_PRICE_PAISE = 9900; // ₹99 strikethrough

/** Unlock + display price in paise. Tries /api/price first, then Firestore. */
export async function loadPricingConfig(): Promise<{ unlockPricePaise: number; displayPricePaise: number }> {
  let unlock: number | null = null;
  let display: number | null = null;
  try {
    const url = API_BASE ? `${API_BASE}/api/price` : '/api/price';
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as { unlockPricePaise?: number; displayPricePaise?: number };
      const u = data?.unlockPricePaise;
      const d = data?.displayPricePaise;
      if (typeof u === 'number' && u >= 100) unlock = Math.round(u);
      if (typeof d === 'number' && d >= 100) display = Math.round(d);
    }
  } catch {
    // fallback to Firestore if API not available
  }
  if ((unlock == null || display == null) && db) {
    try {
      const snap = await getDoc(doc(db, 'config', 'pricing'));
      if (snap.exists()) {
        const d = snap.data() as { unlockPricePaise?: number; displayPricePaise?: number };
        if (unlock == null && typeof d?.unlockPricePaise === 'number' && d.unlockPricePaise >= 100) unlock = Math.round(d.unlockPricePaise);
        if (display == null && typeof d?.displayPricePaise === 'number' && d.displayPricePaise >= 100) display = Math.round(d.displayPricePaise);
      }
    } catch {
      // ignore
    }
  }
  return {
    unlockPricePaise: unlock ?? DEFAULT_UNLOCK_PRICE_PAISE,
    displayPricePaise: display ?? DEFAULT_DISPLAY_PRICE_PAISE,
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

export async function loadUserProgress(uid: string): Promise<{ levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> } | null> {
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const res = await fetch(apiUrl('/api/user/progress'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = (await res.json()) as { levelProgress?: Record<string, LevelProgress>; currentLevelByMode?: Record<string, number> };
        return { levelProgress: data?.levelProgress ?? {}, currentLevelByMode: data?.currentLevelByMode ?? {} };
      }
    }
  } catch {
    // fall back to client Firestore
  }
  if (!db) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'data', 'progress'));
      return snap.exists() ? (snap.data() as { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }) : null;
    } catch (e) {
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

export async function saveUserProgress(uid: string, data: { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }): Promise<void> {
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const res = await fetch(apiUrl('/api/user/progress'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) return;
    }
  } catch {
    // fall back to client Firestore
  }
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'data', 'progress'), data);
  } catch (e) {
    try {
      await new Promise((r) => setTimeout(r, 500));
      await setDoc(doc(db, 'users', uid, 'data', 'progress'), data);
    } catch {}
  }
}

export async function loadUserJapa(uid: string): Promise<JapaCounts | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', 'japa'));
    return snap.exists() ? (snap.data() as JapaCounts) : null;
  } catch {
    return null;
  }
}

export async function saveUserJapa(uid: string, counts: JapaCounts): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'data', 'japa'), counts);
  } catch {}
}
