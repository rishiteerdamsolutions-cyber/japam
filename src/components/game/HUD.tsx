import { useGameStore } from '../../store/gameStore';
import { LEVELS } from '../../data/levels';

export function HUD() {
  const { moves, japasThisLevel, japasByDeity, mode, levelIndex } = useGameStore();
  const level = LEVELS[levelIndex];
  const deityTarget = mode !== 'general' ? mode : undefined;
  const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : japasThisLevel;
  const japaTarget = level?.japaTarget ?? 15;

  return (
    <div className="flex justify-between items-center w-full px-2 py-1">
      <div className="text-amber-200 text-sm">
        <div>Japas: {japasNeeded} / {japaTarget}</div>
      </div>
      <div className="text-amber-200 text-sm font-medium">
        Moves: {moves}
      </div>
    </div>
  );
}
