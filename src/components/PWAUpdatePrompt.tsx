import { useState, useEffect, useRef, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const JAPAM_CHECK_UPDATES_EVENT = 'japam-check-updates';
export const JAPAM_CHECK_RESULT_EVENT = 'japam-check-updates-result';
/** Same as tapping "Update Now" on the bottom bar — Settings can dispatch this. */
export const JAPAM_PWA_APPLY_UPDATE_EVENT = 'japam-pwa-apply-update';

export type PwaCheckUpdateStatus = 'available' | 'current' | 'no-sw' | 'error';

export interface PwaCheckUpdateResultDetail {
  status: PwaCheckUpdateStatus;
}

function waitForServiceWorkerInstalled(sw: ServiceWorker, timeoutMs: number): Promise<void> {
  if (sw.state === 'installed' || sw.state === 'redundant') return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, timeoutMs);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed' || sw.state === 'redundant') {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

/** After `update()`, see if a new worker is waiting (new build available). */
async function resolveUpdateStatusAfterCheck(reg: ServiceWorkerRegistration): Promise<'available' | 'current'> {
  await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 150)));
  if (reg.waiting) return 'available';
  if (reg.installing) {
    await waitForServiceWorkerInstalled(reg.installing, 15000);
  }
  if (reg.waiting) return 'available';
  return 'current';
}

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null | undefined>(null);
  const updateSWRef = useRef<(() => void) | null>(null);
  updateSWRef.current = updateSW;

  const applyPwaUpdate = useCallback(() => {
    setUpdating(true);
    setUpdated(false);
    setTimeout(() => {
      setUpdating(false);
      setUpdated(true);
      setTimeout(() => {
        updateSWRef.current?.();
      }, 800);
    }, 600);
  }, []);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, reg) {
        registrationRef.current = reg ?? null;
      },
    });
    setUpdateSW(() => update);

    const dispatchResult = (status: PwaCheckUpdateStatus) => {
      window.dispatchEvent(
        new CustomEvent<PwaCheckUpdateResultDetail>(JAPAM_CHECK_RESULT_EVENT, { detail: { status } }),
      );
    };

    const handleManualCheck = async () => {
      let reg = registrationRef.current;
      if (!reg && 'serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.getRegistration();
      }
      if (!reg) {
        dispatchResult('no-sw');
        return;
      }
      try {
        await reg.update();
        const outcome = await resolveUpdateStatusAfterCheck(reg);
        if (outcome === 'available') {
          setNeedRefresh(true);
          dispatchResult('available');
        } else {
          dispatchResult('current');
        }
      } catch {
        dispatchResult('error');
      }
    };

    const handleApplyFromSettings = () => applyPwaUpdate();

    window.addEventListener(JAPAM_CHECK_UPDATES_EVENT, handleManualCheck);
    window.addEventListener(JAPAM_PWA_APPLY_UPDATE_EVENT, handleApplyFromSettings);
    return () => {
      window.removeEventListener(JAPAM_CHECK_UPDATES_EVENT, handleManualCheck);
      window.removeEventListener(JAPAM_PWA_APPLY_UPDATE_EVENT, handleApplyFromSettings);
    };
  }, [applyPwaUpdate]);

  const closeOffline = () => setOfflineReady(false);
  const closeRefresh = () => setNeedRefresh(false);

  return (
    <>
      {needRefresh && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-amber-600 text-white shadow-lg"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <span className="text-sm font-medium shrink-0">Update available</span>
          <div className="flex gap-2 shrink-0">
            {!updated && (
              <button
                type="button"
                onClick={closeRefresh}
                className="px-3 py-1.5 rounded-lg bg-white/20 text-sm font-medium whitespace-nowrap"
                disabled={updating}
              >
                Later
              </button>
            )}
            <button
              type="button"
              onClick={applyPwaUpdate}
              disabled={updating || updated}
              className={`min-w-[7rem] px-4 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                updated
                  ? 'bg-green-400 text-green-900'
                  : 'bg-white text-amber-900'
              }`}
            >
              {updated ? 'Updated!' : updating ? 'Updating…' : 'Update Now'}
            </button>
          </div>
        </div>
      )}
      {offlineReady && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-green-700 text-white shadow-lg"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <span className="text-sm font-medium">Ready to work offline</span>
          <button
            type="button"
            onClick={closeOffline}
            className="px-4 py-1.5 rounded-lg bg-white/20 text-sm font-medium"
          >
            OK
          </button>
        </div>
      )}
    </>
  );
}
