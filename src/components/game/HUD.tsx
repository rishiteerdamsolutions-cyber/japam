import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { LEVELS } from '../../data/levels';

export function HUD() {
  const { t } = useTranslation();
  const { moves, japasThisLevel, japasByDeity, mode, levelIndex, marathonTargetJapas, overrideJapaTarget } = useGameStore();
  const level = LEVELS[levelIndex];
  const deityTarget = mode !== 'general' ? mode : undefined;
  const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : japasThisLevel;
  const japaTarget = overrideJapaTarget ?? marathonTargetJapas ?? level?.japaTarget ?? 15;

  return (
    <div className="flex justify-between items-center w-full px-2 py-1 gap-2 min-w-0">
      <div className="text-amber-200 text-xs sm:text-sm truncate min-w-0" title={`${t('game.japas')}: ${japasNeeded} / ${japaTarget}`}>
        {t('game.japas')}: {japasNeeded} / {japaTarget}
      </div>
      <div className="text-amber-200 text-xs sm:text-sm font-medium shrink-0">
        {t('game.moves')}: {moves}
      </div>
    </div>
  );
}
