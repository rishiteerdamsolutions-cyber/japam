import { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { Landing } from './components/landing/Landing';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { MainMenu } from './components/menu/MainMenu';
import { GameScreen } from './components/game/GameScreen';
import { WorldMap } from './components/map/WorldMap';
import { JapaDashboard } from './components/dashboard/JapaDashboard';
import { Settings } from './components/Settings';
import { SignInRequired } from './components/auth/SignInRequired';
import { Paywall } from './components/payment/Paywall';
import { useProgressStore } from './store/progressStore';
import { useGameStore } from './store/gameStore';
import { useSettingsStore } from './store/settingsStore';
import { useJapaStore } from './store/japaStore';
import { useAuthStore } from './store/authStore';
import { useUnlockStore } from './store/unlockStore';
import { FIRST_LOCKED_LEVEL_INDEX } from './store/unlockStore';
import { isFirebaseConfigured } from './lib/firebase';
import type { GameMode } from './types';

type Screen = 'splash' | 'landing' | 'menu' | 'game' | 'map' | 'japa' | 'settings' | 'signin';

function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('general');
  const [levelIndex, setLevelIndex] = useState(0);
  const [paywallPending, setPaywallPending] = useState<{ mode: GameMode; levelIndex: number } | null>(null);

  const loadProgress = useProgressStore(s => s.load);
  const loadJapa = useJapaStore(s => s.load);
  const loadSettings = useSettingsStore(s => s.load);
  const loadUnlock = useUnlockStore(s => s.load);
  const levelsUnlocked = useUnlockStore(s => s.levelsUnlocked);
  const authInit = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);
  const authLoading = useAuthStore(s => s.loading);
  const getCurrentLevelIndex = useProgressStore(s => s.getCurrentLevelIndex);
  const initGame = useGameStore(s => s.initGame);

  const needsSignIn = isFirebaseConfigured && !user && !authLoading;

  const tryStartGame = (mode: GameMode, idx: number) => {
    if (idx >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true) {
      setPaywallPending({ mode, levelIndex: idx });
      return;
    }
    initGame(mode, idx);
    setGameMode(mode);
    setLevelIndex(idx);
    setScreen('game');
  };

  useEffect(() => {
    loadProgress();
    loadJapa();
    loadSettings();
  }, [loadProgress, loadJapa, loadSettings]);

  useEffect(() => {
    if (!authLoading) {
      loadProgress(user?.uid);
      loadJapa(user?.uid);
      loadUnlock(user?.uid);
    }
  }, [user?.uid, authLoading, loadProgress, loadJapa, loadUnlock]);

  useEffect(() => {
    if (paywallPending && levelsUnlocked === true) {
      const { mode, levelIndex: idx } = paywallPending;
      setPaywallPending(null);
      initGame(mode, idx);
      setGameMode(mode);
      setLevelIndex(idx);
      setScreen('game');
    }
  }, [paywallPending, levelsUnlocked]);

  useEffect(() => {
    const unsubscribe = authInit();
    return unsubscribe;
  }, [authInit]);

  if (screen === 'splash') {
    return <Splash onComplete={() => setScreen('landing')} />;
  }

  if (screen === 'landing') {
    return <Landing onEnterApp={() => setScreen('menu')} />;
  }

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          onSelect={(mode) => {
            if (needsSignIn) {
              setScreen('signin');
              return;
            }
            const idx = getCurrentLevelIndex(mode);
            tryStartGame(mode, idx);
          }}
          onOpenMap={() => {
            if (needsSignIn) {
              setScreen('signin');
              return;
            }
            setScreen('map');
          }}
          onOpenJapaDashboard={() => {
            if (needsSignIn) {
              setScreen('signin');
              return;
            }
            setScreen('japa');
          }}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          mode={gameMode}
          levelIndex={levelIndex}
          onBack={() => setScreen('menu')}
          onNextLevel={(mode, idx) => tryStartGame(mode as GameMode, idx)}
        />
      )}
      {screen === 'map' && (
        <WorldMap
          mode={gameMode}
          onSelectLevel={(idx, mode) => {
            tryStartGame(mode, idx);
          }}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'japa' && <JapaDashboard onBack={() => setScreen('menu')} />}
      {screen === 'settings' && (
        <Settings onBack={() => setScreen('menu')} />
      )}
      {paywallPending != null && (
        <Paywall
          onClose={() => setPaywallPending(null)}
          onUnlocked={() => loadUnlock(user?.uid)}
        />
      )}
      {screen === 'signin' && (
        <SignInRequired
          onBack={() => setScreen('menu')}
          message="Sign in with Google to play and save your progress"
        />
      )}
      <InstallPrompt />
    </>
  );
}

export default App;
