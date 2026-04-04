import { create } from 'zustand';
import type { InventoryPowerId } from '../data/gamePowers';

interface PowerArmState {
  /** When set, the next board interaction applies this power (where applicable). */
  armedPowerId: InventoryPowerId | null;
  setArmedPower: (id: InventoryPowerId | null) => void;
  reset: () => void;
}

export const usePowerArmStore = create<PowerArmState>((set) => ({
  armedPowerId: null,
  setArmedPower: (id) => set({ armedPowerId: id }),
  reset: () => set({ armedPowerId: null }),
}));
