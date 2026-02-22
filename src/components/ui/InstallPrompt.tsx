import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const wasDismissed = localStorage.getItem('japam-install-dismissed');
      if (!wasDismissed) setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('japam-install-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-amber-500/95 text-white rounded-xl p-4 shadow-lg z-50 flex items-center justify-between gap-3">
      <div className="text-sm">
        <strong>Install Japam</strong>
        <p className="text-amber-100 text-xs mt-0.5">Add to home screen for the best experience</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-white text-amber-700 rounded-lg font-medium text-sm"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="px-2 text-amber-100 text-sm">
          ×
        </button>
      </div>
    </div>
  );
}
