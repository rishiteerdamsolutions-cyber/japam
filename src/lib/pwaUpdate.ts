export const JAPAM_CHECK_UPDATES_EVENT = 'japam-check-updates';
export const JAPAM_CHECK_RESULT_EVENT = 'japam-check-updates-result';
/** Same as tapping "Update Now" on the bottom bar — Settings can dispatch this. */
export const JAPAM_PWA_APPLY_UPDATE_EVENT = 'japam-pwa-apply-update';

export type PwaCheckUpdateStatus = 'available' | 'current' | 'no-sw' | 'error';

export interface PwaCheckUpdateResultDetail {
  status: PwaCheckUpdateStatus;
}

/** Workbox precache + runtime caches only — does not clear IndexedDB (Firebase session stays signed in). */
export async function clearPwaContentCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}
