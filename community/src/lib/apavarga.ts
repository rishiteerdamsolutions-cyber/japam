import { auth } from './firebase';
import { getApiBase } from './apiBase';

/** Call Apavarga join to register as member. Idempotent. */
export async function joinApavarga(): Promise<{ ok: boolean }> {
  const user = auth?.currentUser;
  if (!user) return { ok: false };
  try {
    const token = await user.getIdToken();
    const base = getApiBase();
    const res = await fetch(`${base}/api/apavarga/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        displayName: user.displayName ?? undefined,
        photoURL: user.photoURL ?? undefined,
      }),
    });
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
