import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app, isFirebaseConfigured } from './firebase';
import type { LevelProgress } from '../store/progressStore';
import type { JapaCounts } from '../store/japaStore';

const db = isFirebaseConfigured && app ? getFirestore(app) : null;

/** Unlock status for levels 6+ (payment) */
export async function loadUserUnlock(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', 'unlock'));
    return snap.exists() && Boolean((snap.data() as { levelsUnlocked?: boolean }).levelsUnlocked);
  } catch {
    return false;
  }
}

/** Pricing config (unlock price in paise) - readable by all */
export async function loadPricingConfig(): Promise<{ unlockPricePaise: number } | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'config', 'pricing'));
    if (!snap.exists()) return null;
    const d = snap.data() as { unlockPricePaise?: number };
    return d.unlockPricePaise != null ? { unlockPricePaise: d.unlockPricePaise } : null;
  } catch {
    return null;
  }
}

/** Save pricing (admin only - secure with Firestore rules) */
export async function savePricingConfig(unlockPricePaise: number): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'config', 'pricing'), { unlockPricePaise });
}

/** Check if current user is admin */
export async function loadIsAdmin(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    if (!snap.exists()) return false;
    const uids = (snap.data() as { uids?: string[] }).uids ?? [];
    return uids.includes(uid);
  } catch {
    return false;
  }
}

export async function loadUserProgress(uid: string): Promise<{ levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> } | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', 'progress'));
    return snap.exists() ? (snap.data() as { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }) : null;
  } catch {
    return null;
  }
}

export async function saveUserProgress(uid: string, data: { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'data', 'progress'), data);
  } catch {}
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
