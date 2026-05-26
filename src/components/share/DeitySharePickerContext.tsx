import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DeityWhatsAppSharePicker } from './DeityWhatsAppSharePicker';

type DeitySharePickerContextValue = {
  openDeitySharePicker: () => void;
  closeDeitySharePicker: () => void;
};

const DeitySharePickerContext = createContext<DeitySharePickerContextValue | null>(null);

export function DeitySharePickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDeitySharePicker = useCallback(() => setOpen(true), []);
  const closeDeitySharePicker = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openDeitySharePicker, closeDeitySharePicker }),
    [openDeitySharePicker, closeDeitySharePicker],
  );

  return (
    <DeitySharePickerContext.Provider value={value}>
      {children}
      {open ? <DeityWhatsAppSharePicker onClose={closeDeitySharePicker} /> : null}
    </DeitySharePickerContext.Provider>
  );
}

export function useDeitySharePicker(): DeitySharePickerContextValue {
  const ctx = useContext(DeitySharePickerContext);
  if (!ctx) {
    throw new Error('useDeitySharePicker must be used within DeitySharePickerProvider');
  }
  return ctx;
}

/** Safe when provider may be absent (e.g. tests). */
export function useDeitySharePickerOptional(): DeitySharePickerContextValue | null {
  return useContext(DeitySharePickerContext);
}
