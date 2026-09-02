import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearSeoDeityHint, hasDeityInSearchParams } from './lib/seoAttribution';
import { Splash } from './components/Splash';
import { Landing } from './components/landing/Landing';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { useAuthStore } from './store/authStore';
import { LAUNCH_FEATURE_MULTIPLAYER_ASURA, LAUNCH_FEATURE_OCCASION_GAMES } from './config/launchFeatures';
import { trackProductUsage } from './lib/productUsage';
import {
  fetchSatsangLandingOpen,
  peekFestivalLandingOpen,
  rememberFestivalLandingOpen,
} from './lib/satsangApi';

const GaneshotsavPage = lazy(() =>
  import('./pages/GaneshotsavPage').then((m) => ({ default: m.GaneshotsavPage })),
);

function multiplayerAsuraHref(): string {
  let base = import.meta.env.BASE_URL || '/';
  if (!base.endsWith('/')) base += '/';
  return `${base}asura-combat-test.html`;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [screen, setScreen] = useState<'splash' | 'landing'>('splash');
  const [festivalOpen, setFestivalOpen] = useState<boolean | null>(() => peekFestivalLandingOpen());

  // Auth + data stores are bootstrapped globally in AuthProvider (mounted for all routes).
  // App is just the splash/landing entry route.
  useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    fetchSatsangLandingOpen().then((open) => {
      if (cancelled || open === null) return;
      rememberFestivalLandingOpen(open);
      setFestivalOpen(open);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (festivalOpen === true) {
    return (
      <Suspense
        fallback={
          <div className="relative min-h-screen flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" aria-hidden />
            <p className="text-amber-400 text-sm">Loading…</p>
          </div>
        }
      >
        <GaneshotsavPage />
      </Suspense>
    );
  }

  if (festivalOpen === null) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" aria-hidden />
        <p className="text-amber-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <>
      {screen === 'splash' && <Splash onComplete={() => setScreen('landing')} />}
      {screen === 'landing' && (
        <Landing
          onEnterApp={() => {
            trackProductUsage('action_landing_start');
            const seoDeityLaunch = hasDeityInSearchParams(location.search);
            if (!seoDeityLaunch) clearSeoDeityHint();
            navigate('/menu', { state: seoDeityLaunch ? { seoDeityLaunch: true } : undefined });
          }}
          onGuestPlay={() => {
            trackProductUsage('action_landing_guest');
            navigate('/game?guest=1');
          }}
          onBirthday={
            LAUNCH_FEATURE_OCCASION_GAMES
              ? () => {
                  trackProductUsage('action_landing_birthday');
                  navigate('/occasion/birthday');
                }
              : undefined
          }
          onAnniversary={
            LAUNCH_FEATURE_OCCASION_GAMES
              ? () => {
                  trackProductUsage('action_landing_anniversary');
                  navigate('/occasion/anniversary');
                }
              : undefined
          }
          onMultiplayer={
            LAUNCH_FEATURE_MULTIPLAYER_ASURA
              ? () => {
                  trackProductUsage('action_landing_multiplayer');
                  window.location.assign(multiplayerAsuraHref());
                }
              : undefined
          }
        />
      )}
      <InstallPrompt />
    </>
  );
}

export default App;
