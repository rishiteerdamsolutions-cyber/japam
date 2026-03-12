import { useState, useEffect, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const JAPAM_CHECK_UPDATES_EVENT = 'japam-check-updates';

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        registrationRef.current = registration;
        const checkForUpdates = async () => {
          if (!navigator.onLine || registration.installing) return;
          try {
            const resp = await fetch(swUrl, {
              cache: 'no-store',
              headers: { 'cache-control': 'no-cache' },
            });
            if (resp?.status === 200) await registration.update();
          } catch {
            // Offline or network error, skip
          }
        };
        intervalId = setInterval(checkForUpdates, CHECK_INTERVAL_MS);
      },
    });
    setUpdateSW(() => update);
    const handleManualCheck = () => {
      registrationRef.current?.update();
    };
    window.addEventListener(JAPAM_CHECK_UPDATES_EVENT, handleManualCheck);
    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener(JAPAM_CHECK_UPDATES_EVENT, handleManualCheck);
    };
  }, []);

  const handleUpdate = () => {
    setUpdating(true);
    setUpdated(false);
    // Give the SW a moment to activate, then show "Updated!" briefly before reload
    setTimeout(() => {
      setUpdating(false);
      setUpdated(true);
      setTimeout(() => {
        updateSW?.();
      }, 800);
    }, 600);
  };

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
              onClick={handleUpdate}
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
