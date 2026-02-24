import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Splash } from './components/Splash';
import { Landing } from './components/landing/Landing';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { useProgressStore } from './store/progressStore';
import { useJapaStore } from './store/japaStore';
import { useAuthStore } from './store/authStore';
import { useUnlockStore } from './store/unlockStore';
import { useSettingsStore } from './store/settingsStore';

function App() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'splash' | 'landing'>('splash');

  const loadProgress = useProgressStore((s) => s.load);
  const loadJapa = useJapaStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadUnlock = useUnlockStore((s) => s.load);
  const authInit = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!authLoading) {
      loadProgress(user?.uid);
      loadJapa(user?.uid);
      loadUnlock(user?.uid);
    }
  }, [user?.uid, authLoading, loadProgress, loadJapa, loadUnlock]);

  useEffect(() => {
    const unsubscribe = authInit();
    return unsubscribe;
  }, [authInit]);

  return (
    <>
      {screen === 'splash' && <Splash onComplete={() => setScreen('landing')} />}
      {screen === 'landing' && <Landing onEnterApp={() => navigate('/menu')} />}
      <InstallPrompt />
    </>
  );
}

export default App;
