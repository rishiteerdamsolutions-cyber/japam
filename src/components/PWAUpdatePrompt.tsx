import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the PWA service worker and shows an "Update available" bar
 * when a new version is deployed. User can tap Refresh to load it.
 */
export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
    setUpdateSW(() => update);
  }, []);

  const handleRefresh = () => {
    updateSW?.();
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
          <span className="text-sm font-medium">Update available</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeRefresh}
              className="px-3 py-1.5 rounded-lg bg-white/20 text-sm font-medium"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-1.5 rounded-lg bg-white text-amber-800 text-sm font-semibold"
            >
              Refresh
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
