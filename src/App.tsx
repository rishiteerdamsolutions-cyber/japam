import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Splash } from './components/Splash';
import { Landing } from './components/landing/Landing';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { useAuthStore } from './store/authStore';

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
          onEnterApp={() => navigate('/menu')}
          onGuestPlay={() => navigate('/game?guest=1')}
          onBirthday={() => navigate('/occasion/birthday')}
          onAnniversary={() => navigate('/occasion/anniversary')}
          onMultiplayer={() => {
            window.location.assign(multiplayerAsuraHref());
          }}
        />
      )}
      <InstallPrompt />
    </>
  );
}

export default App;
