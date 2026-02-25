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
import { useProfileStore } from './store/profileStore';

function App() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'splash' | 'landing'>('splash');

  const loadProgress = useProgressStore((s) => s.load);
  const loadJapa = useJapaStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadUnlock = useUnlockStore((s) => s.load);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const loadProfile = useProfileStore((s) => s.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!authLoading) {
      loadProgress(user?.uid);
      loadJapa(user?.uid);
      loadUnlock(user?.uid);
      loadProfile();
    }
  }, [user?.uid, authLoading, loadProgress, loadJapa, loadUnlock, loadProfile]);

  return (
    <>
      {screen === 'splash' && <Splash onComplete={() => setScreen('landing')} />}
      {screen === 'landing' && <Landing onEnterApp={() => navigate('/menu')} />}
      <InstallPrompt />
    </>
  );
}

export default App;
