import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

export function AuthErrorToast() {
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (error) setOpen(true);
  }, [error]);

  if (!error || !open) return null;

  return (
    <div className="fixed left-3 right-3 top-3 z-[100001] mx-auto max-w-lg rounded-xl border border-red-500/35 bg-black/80 px-3 py-2 text-sm text-red-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-red-200">Sign-in issue</div>
          <div className="mt-0.5 break-words text-red-100/90">{error}</div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-red-200/90 hover:bg-white/10"
          onClick={() => {
            setOpen(false);
            clearError();
          }}
          aria-label="Dismiss"
        >
          Close
        </button>
      </div>
    </div>
  );
}

