import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Splash } from './components/Splash';
import { Landing } from './components/landing/Landing';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { useAuthStore } from './store/authStore';
import { LAUNCH_FEATURE_MULTIPLAYER_ASURA, LAUNCH_FEATURE_OCCASION_GAMES } from './config/launchFeatures';
import { trackProductUsage } from './lib/productUsage';

function multiplayerAsuraHref(): string {
  let base = import.meta.env.BASE_URL || '/';
  if (!base.endsWith('/')) base += '/';
  return `${base}asura-combat-test.html`;
}

function App() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'splash' | 'landing'>('splash');

  // Auth + data stores are bootstrapped globally in AuthProvider (mounted for all routes).
  // App is just the splash/landing entry route.
  useAuthStore((s) => s.user);

  return (
    <>
      {screen === 'splash' && <Splash onComplete={() => setScreen('landing')} />}
      {screen === 'landing' && (
        <Landing
          onEnterApp={() => {
            trackProductUsage('action_landing_start');
            navigate('/menu');
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
