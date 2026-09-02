import { useLocation } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { WhatsAppFab } from './ui/WhatsAppFab';
import { AuthErrorToast } from './auth/AuthErrorToast';
import { getFestivalLandingOpenSnapshot, subscribeFestivalLandingOpen } from '../lib/satsangApi';

/** Global overlays: hide WhatsApp FAB where another control exists or the board is the focus. */
export function RouterChrome() {
  const { pathname } = useLocation();
  const isLearn = pathname.startsWith('/learn');
  const festivalLanding = useSyncExternalStore(
    subscribeFestivalLandingOpen,
    getFestivalLandingOpenSnapshot,
    () => false,
  );
  const hideWhatsApp =
    isLearn ||
    pathname === '/game' ||
    pathname === '/settings' ||
    pathname === '/satsang-report' ||
    (festivalLanding && (pathname === '/' || pathname === '/ganeshotsav'));

  if (isLearn) {
    return (
      <>
        <AuthErrorToast />
        <SpeedInsights />
      </>
    );
  }

  return (
    <>
      <AuthErrorToast />
      {!hideWhatsApp && <WhatsAppFab />}
      <SpeedInsights />
    </>
  );
}
