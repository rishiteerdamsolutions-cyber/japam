import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { withReturnTo } from '../lib/navigationReturn';
import { WorldMap } from '../components/map/WorldMap';
import { useUnlockStore } from '../store/unlockStore';
import { useProgressStore } from '../store/progressStore';
import { getFirstLockedLevelIndex, isLevelIndexCompleted } from '../lib/levelGates';
import { LevelAlreadyCompleteModal } from '../components/game/LevelGateModals';
import type { GameMode } from '../types';

export function LevelsPage() {
  const navigate = useNavigate();
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const levelProgress = useProgressStore((s) => s.levelProgress);
  const [replayMode, setReplayMode] = useState<GameMode | null>(null);

  const handleSelectLevel = (levelIndex: number, mode: GameMode) => {
    if (isLevelIndexCompleted(mode, levelIndex, levelProgress)) {
      setReplayMode(mode);
      return;
    }
    const firstLock = getFirstLockedLevelIndex(mode);
    const isLocked = levelIndex >= firstLock && levelsUnlocked === false;
    const gameState = withReturnTo('/levels');
    if (isLocked) {
      navigate(`/game?mode=${encodeURIComponent(mode)}&level=${levelIndex}`, { state: gameState });
      return;
    }
    navigate(`/game?mode=${encodeURIComponent(mode)}&level=${levelIndex}`, { state: gameState });
  };

  return (
    <>
      {replayMode != null && (
        <LevelAlreadyCompleteModal mode={replayMode} onClose={() => setReplayMode(null)} />
      )}
      <WorldMap onSelectLevel={handleSelectLevel} />
    </>
  );
}
