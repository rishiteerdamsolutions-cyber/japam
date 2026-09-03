import { useState, useEffect, useRef, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';
import {
  JAPAM_CHECK_UPDATES_EVENT,
  JAPAM_CHECK_RESULT_EVENT,
  JAPAM_PWA_APPLY_UPDATE_EVENT,
  clearPwaContentCaches,
  type PwaCheckUpdateResultDetail,
  type PwaCheckUpdateStatus,
} from '../lib/pwaUpdate';
import { hasActiveGaneshotsavDraft } from '../lib/ganeshotsavDraft';

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

/** How often to ask the browser for a new service worker while the app is open (ms). */
const PWA_UPDATE_POLL_MS = 60_000;

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null | undefined>(null);
  const updateSWRef = useRef<(() => void) | null>(null);
  useEffect(() => { updateSWRef.current = updateSW; }, [updateSW]);

  const applyPwaUpdate = useCallback(() => {
    setUpdating(true);
    setUpdated(false);
    setTimeout(() => {
      void (async () => {
        try {
          await clearPwaContentCaches();
        } catch {
          // still try to activate new worker + reload
        }
        setUpdating(false);
        setUpdated(true);
        setTimeout(() => {
          void updateSWRef.current?.();
        }, 800);
      })();
    }, 600);
  }, []);

  useEffect(() => {
    const update = registerSW({
      /** Registers before `window` "load" so slow assets (video, fonts) do not delay SW / update checks. */
      immediate: true,
      onNeedRefresh() {
        if (hasActiveGaneshotsavDraft()) return;
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

  /** Proactive polls: long-lived SPA sessions may not re-hit navigation-triggered SW checks for a long time. */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const reg = registrationRef.current ?? (await navigator.serviceWorker.getRegistration());
        if (!reg) return;
        await reg.update();
        const outcome = await resolveUpdateStatusAfterCheck(reg);
        if (outcome === 'available' && !hasActiveGaneshotsavDraft()) setNeedRefresh(true);
      } catch {
        /* ignore — offline, throttled, etc. */
      }
    };

    void navigator.serviceWorker.ready.then(() => {
      if (cancelled) return;
      void poll();
      intervalId = setInterval(poll, PWA_UPDATE_POLL_MS);
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (intervalId != null) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
