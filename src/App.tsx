import { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { MainMenu } from './components/menu/MainMenu';
import { GameScreen } from './components/game/GameScreen';
import { WorldMap } from './components/map/WorldMap';
import { JapaDashboard } from './components/dashboard/JapaDashboard';
import { Settings } from './components/Settings';
import { useProgressStore } from './store/progressStore';
import { useSettingsStore } from './store/settingsStore';
import { useJapaStore } from './store/japaStore';
import { useAuthStore } from './store/authStore';
import type { GameMode } from './types';

type Screen = 'splash' | 'menu' | 'game' | 'map' | 'japa' | 'settings';

function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('general');
  const [levelIndex, setLevelIndex] = useState(0);

  const loadProgress = useProgressStore(s => s.load);
  const loadJapa = useJapaStore(s => s.load);
  const loadSettings = useSettingsStore(s => s.load);
  const authInit = useAuthStore(s => s.init);
  const getCurrentLevelIndex = useProgressStore(s => s.getCurrentLevelIndex);

  useEffect(() => {
    loadProgress();
    loadJapa();
    loadSettings();
  }, [loadProgress, loadJapa, loadSettings]);

  useEffect(() => {
    const unsubscribe = authInit();
    return unsubscribe;
  }, [authInit]);

  if (screen === 'splash') {
    return <Splash onComplete={() => setScreen('menu')} />;
  }

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          onSelect={(mode) => {
            setGameMode(mode);
            setLevelIndex(getCurrentLevelIndex(mode));
            setScreen('game');
          }}
          onOpenMap={() => setScreen('map')}
          onOpenJapaDashboard={() => setScreen('japa')}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          mode={gameMode}
          levelIndex={levelIndex}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'map' && (
        <WorldMap
          mode={gameMode}
          onSelectLevel={(idx, mode) => {
            setGameMode(mode);
            setLevelIndex(idx);
            setScreen('game');
          }}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'japa' && <JapaDashboard onBack={() => setScreen('menu')} />}
      {screen === 'settings' && <Settings onBack={() => setScreen('menu')} />}
      <InstallPrompt />
    </>
  );
}

export default App;
