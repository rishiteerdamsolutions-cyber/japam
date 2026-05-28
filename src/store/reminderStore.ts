import { create } from 'zustand';
import { loadUserReminder, type DailyReminder } from '../lib/firestore';
import { deviceTimeZone, syncReminderScheduleToServiceWorker, type ReminderConfig } from '../lib/reminderSync';
import {
  saveUserReminderWithPush,
  refreshReminderPushSubscription,
  subscribeReminderWebPush,
  unsubscribeReminderWebPush,
} from '../lib/reminderPush';
import { useAuthStore } from './authStore';
import { useProfileStore } from './profileStore';

async function pushReminderToServiceWorker(reminder: DailyReminder): Promise<void> {
  const uid = useAuthStore.getState().user?.uid ?? null;
  const displayName = useProfileStore.getState().displayName;
  const config: ReminderConfig = {
    enabled: reminder.enabled,
    time: reminder.time,
    displayName,
    uid,
    timeZone: deviceTimeZone(),
  };
  await syncReminderScheduleToServiceWorker(config);
}

async function persistReminder(reminder: DailyReminder): Promise<boolean> {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) {
    await pushReminderToServiceWorker(reminder);
    return false;
  }

  let pushSubscription = null;
  if (reminder.enabled) {
    pushSubscription = await subscribeReminderWebPush();
  } else {
    await unsubscribeReminderWebPush();
  }

  const displayName = useProfileStore.getState().displayName;
  const ok = await saveUserReminderWithPush(reminder, {
    pushSubscription,
    displayName,
    timeZone: deviceTimeZone(),
  });
  await pushReminderToServiceWorker(reminder);
  return ok;
}

interface ReminderState {
  reminder: DailyReminder;
  loaded: boolean;
  load: (uid?: string) => Promise<void>;
  setReminder: (next: DailyReminder) => Promise<boolean>;
}

const initial: DailyReminder = { enabled: false, time: null };

export const useReminderStore = create<ReminderState>((setState) => ({
  reminder: initial,
  loaded: false,

  load: async (uid?: string) => {
    if (!uid) {
      setState({ reminder: initial, loaded: true });
      await pushReminderToServiceWorker(initial).catch(() => {});
      return;
    }
    const r = await loadUserReminder(uid);
    const reminder = r ?? initial;
    setState({ reminder, loaded: true });
    await pushReminderToServiceWorker(reminder).catch(() => {});
    if (reminder.enabled) {
      const displayName = useProfileStore.getState().displayName;
      void refreshReminderPushSubscription(reminder, displayName).catch(() => {});
    }
  },

  setReminder: async (next) => {
    setState({ reminder: next });
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      await pushReminderToServiceWorker(next).catch(() => {});
      return false;
    }
    const ok = await persistReminder(next);
    if (!ok) {
      const r = await loadUserReminder(uid);
      setState({ reminder: r ?? initial });
      await pushReminderToServiceWorker(r ?? initial).catch(() => {});
    }
    return ok;
  },
}));

