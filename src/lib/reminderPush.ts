import { getApiBase } from './apiBase';
import { auth } from './firebase';
import { deviceTimeZone } from './reminderSync';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type ReminderPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

/** Subscribe for server push (alarm when app is closed). Returns null if unsupported or denied. */
export async function subscribeReminderWebPush(): Promise<ReminderPushSubscription | null> {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey?.trim()) return null;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  if (Notification.permission !== 'granted') return null;

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg?.pushManager) return null;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.trim()) as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    expirationTime: sub.expirationTime,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export async function unsubscribeReminderWebPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await reg?.pushManager?.getSubscription();
  await sub?.unsubscribe().catch(() => {});
}

export type ReminderSaveExtras = {
  pushSubscription?: ReminderPushSubscription | null;
  displayName?: string | null;
  timeZone?: string;
};

/** POST reminder + optional Web Push subscription for background alarms. */
/** Re-register push after app open (subscription can rotate). */
export async function refreshReminderPushSubscription(
  reminder: { enabled: boolean; time: string | null },
  displayName: string | null,
): Promise<void> {
  if (!reminder.enabled) return;
  const sub = await subscribeReminderWebPush();
  if (!sub) return;
  await saveUserReminderWithPush(reminder, {
    pushSubscription: sub,
    displayName,
    timeZone: deviceTimeZone(),
  });
}

export async function saveUserReminderWithPush(
  reminder: { enabled: boolean; time: string | null },
  extras: ReminderSaveExtras = {},
): Promise<boolean> {
  const token = await auth?.currentUser?.getIdToken().catch(() => null);
  if (!token) return false;
  const url = `${getApiBase()}/api/user/reminder`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        enabled: reminder.enabled,
        time: reminder.time,
        timeZone: extras.timeZone ?? deviceTimeZone(),
        displayName: extras.displayName ?? null,
        pushSubscription: extras.pushSubscription ?? null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
