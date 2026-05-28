import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isFirebaseConfigured } from '../../lib/firebase';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (!isFirebaseConfigured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-3 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
          <p className="text-amber-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const ret = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/signin?return=${ret}`} replace />;
  }

  return <>{children}</>;
}
