import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { LEVELS } from '../../data/levels';
import type { DeityId } from '../../data/deities';
import { formatMovesForDisplay, MOVES_INFINITY_CHAR } from '../../lib/formatMovesForDisplay';

export function HUD() {
  const { t } = useTranslation();
  const moves = useGameStore((s) => s.moves);
  const occasionKind = useGameStore((s) => s.occasionKind);
  const movesShown = formatMovesForDisplay(occasionKind, moves);
  const movesTitle =
    movesShown === MOVES_INFINITY_CHAR
      ? `${t('game.moves')}: ${t('game.movesInfinity')}`
      : `${t('game.moves')}: ${moves}`;
  const mode = useGameStore((s) => s.mode);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const japasThisLevel = useGameStore((s) => s.japasThisLevel);
  const japasByDeity = useGameStore((s) => s.japasByDeity);
  const marathonTargetJapas = useGameStore((s) => s.marathonTargetJapas);
  const marathonId = useGameStore((s) => s.marathonId);
  const yagnaId = useGameStore((s) => s.yagnaId);
  const overrideJapaTarget = useGameStore((s) => s.overrideJapaTarget);
  const special108Japa = useGameStore((s) => s.special108Japa);
  const level = LEVELS[levelIndex];
  const deityTarget: DeityId | undefined = mode !== 'general' ? (mode as DeityId) : undefined;
  const sessionCredits108JapaSpecialHud =
    special108Japa === true ||
    (!!deityTarget &&
      occasionKind == null &&
      marathonTargetJapas == null &&
      !marathonId &&
      !yagnaId &&
      overrideJapaTarget === 108);
  let japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : japasThisLevel;
  if (sessionCredits108JapaSpecialHud && deityTarget) {
    japasNeeded = Math.max(japasNeeded, japasThisLevel);
  }
  const japaTarget = overrideJapaTarget ?? marathonTargetJapas ?? level?.japaTarget ?? 15;

  return (
    <div className="flex justify-between items-center w-full px-2 py-1 gap-2 min-w-0">
      <div className="text-amber-200 text-xs sm:text-sm truncate min-w-0" title={`${t('game.japas')}: ${japasNeeded} / ${japaTarget}`}>
        {t('game.japas')}: {japasNeeded} / {japaTarget}
      </div>
      <div className="text-amber-200 text-xs sm:text-sm font-medium shrink-0" title={movesTitle}>
        {t('game.moves')}: {movesShown}
      </div>
    </div>
  );
}
