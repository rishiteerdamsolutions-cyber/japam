import { useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { WhatsAppFab } from './ui/WhatsAppFab';
import { AuthErrorToast } from './auth/AuthErrorToast';

/** Global overlays: hide WhatsApp FAB where another control exists or the board is the focus. */
export function RouterChrome() {
  const { pathname } = useLocation();
  const hideWhatsApp = pathname === '/game' || pathname === '/settings';

  return (
    <>
      <AuthErrorToast />
      {!hideWhatsApp && <WhatsAppFab />}
      <SpeedInsights />
    </>
  );
}
