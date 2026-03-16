import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

const JAPAM_URL = import.meta.env.VITE_JAPAM_URL || (typeof window !== 'undefined' && window.location.pathname.startsWith('/apavarga') ? '/' : '/');

interface AppLayoutProps {
  isPriest?: boolean;
}

export function AppLayout(_props: AppLayoutProps) {
  const location = useLocation();
  const isChatScreen = /^\/chats\/[^/]+$/.test(location.pathname);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#111111]/95 backdrop-blur-md border-b border-white/10">
        <a
          href={JAPAM_URL}
          className="flex items-center gap-2 px-4 py-3 text-[var(--primary)]/90 hover:text-[var(--primary)] font-mono text-sm"
        >
          <span>←</span>
          <span>Back to Japam</span>
        </a>
      </header>
      <main className="min-h-screen">
        <Outlet />
      </main>
      {!isChatScreen && <BottomNav />}
    </>
  );
}
