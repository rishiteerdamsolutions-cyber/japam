import { create } from 'zustand';
import { loadUserReminder, saveUserReminder, type DailyReminder } from '../lib/firestore';
import { syncReminderScheduleToServiceWorker, type ReminderConfig } from '../lib/reminderSync';
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
  };
  await syncReminderScheduleToServiceWorker(config);
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
      return;
    }
    const r = await loadUserReminder(uid);
    const reminder = r ?? initial;
    setState({ reminder, loaded: true });
    await pushReminderToServiceWorker(reminder).catch(() => {});
  },

  setReminder: async (next) => {
    setState({ reminder: next });
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      await pushReminderToServiceWorker(next).catch(() => {});
      return false;
    }
    const ok = await saveUserReminder(uid, next);
    if (!ok) {
      const r = await loadUserReminder(uid);
      setState({ reminder: r ?? initial });
      await pushReminderToServiceWorker(r ?? initial).catch(() => {});
    } else {
      await pushReminderToServiceWorker(next).catch(() => {});
    }
    return ok;
  },
}));

