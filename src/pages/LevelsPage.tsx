import { useNavigate } from 'react-router-dom';
import { WorldMap } from '../components/map/WorldMap';
import { FIRST_LOCKED_LEVEL_INDEX } from '../store/unlockStore';
import { useUnlockStore } from '../store/unlockStore';
import type { GameMode } from '../types';

export function LevelsPage() {
  const navigate = useNavigate();
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);

  const handleSelectLevel = (levelIndex: number, mode: GameMode) => {
    const isLocked = levelIndex >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;
    if (isLocked) {
      navigate(`/game?mode=${encodeURIComponent(mode)}&level=${levelIndex}`);
      return;
    }
    navigate(`/game?mode=${encodeURIComponent(mode)}&level=${levelIndex}`);
  };

  return (
    <WorldMap
      mode="general"
      onSelectLevel={handleSelectLevel}
      onBack={() => navigate('/menu')}
    />
  );
}
