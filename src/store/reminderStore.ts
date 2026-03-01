import { create } from 'zustand';
import { loadUserReminder, saveUserReminder, type DailyReminder } from '../lib/firestore';
import { useAuthStore } from './authStore';

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
    setState({ reminder: r ?? initial, loaded: true });
  },

  setReminder: async (next) => {
    setState({ reminder: next });
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) return false;
    const ok = await saveUserReminder(uid, next);
    if (!ok) {
      // revert by reloading
      const r = await loadUserReminder(uid);
      setState({ reminder: r ?? initial });
    }
    return ok;
  },
}));

