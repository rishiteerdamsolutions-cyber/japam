import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  isPriest?: boolean;
}

export function AppLayout(_props: AppLayoutProps) {
  const location = useLocation();
  const isChatScreen = /^\/chats\/[^/]+$/.test(location.pathname);

  return (
    <>
      <main className="min-h-screen">
        <Outlet />
      </main>
      {!isChatScreen && <BottomNav />}
    </>
  );
}
