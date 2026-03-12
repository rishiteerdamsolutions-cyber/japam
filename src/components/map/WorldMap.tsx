import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgressStore, progressKey } from '../../store/progressStore';
import { useUnlockStore, FIRST_LOCKED_LEVEL_INDEX } from '../../store/unlockStore';
import { useLevelsConfigStore } from '../../store/levelsConfigStore';
import { DonateThankYouBox } from '../donation/DonateThankYouBox';
import { AppHeader } from '../layout/AppHeader';
import { AppFooter } from '../layout/AppFooter';
import { BottomNav } from '../nav/BottomNav';
import { LEVELS } from '../../data/levels';
import { EPISODES } from '../../data/episodes';
import { DEITIES } from '../../data/deities';
import type { GameMode } from '../../types';

interface WorldMapProps {
  mode: GameMode;
  onSelectLevel: (index: number, mode: GameMode) => void;
  onBack: () => void;
}

export function WorldMap({ mode: initialMode, onSelectLevel, onBack }: WorldMapProps) {
  const { t } = useTranslation();
  const [mapMode, setMapMode] = useState<GameMode>(initialMode);
  const { levelProgress, getCurrentLevelIndex } = useProgressStore();
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const loadLevelsConfig = useLevelsConfigStore((s) => s.load);
  const maxRevealedLevelIndex = useLevelsConfigStore((s) => s.maxRevealedLevelIndex);
  const currentLevelIndex = getCurrentLevelIndex(mapMode);
  const levelsTitle = mapMode === 'general' ? t('menu.levels') : `${t(`deities.${mapMode}`)} ${t('menu.levels')}`;

  useEffect(() => {
    loadLevelsConfig();
  }, [loadLevelsConfig]);

  const revealedMax = maxRevealedLevelIndex ?? 49;
  const maxEpisodeId = Math.min(100, Math.ceil((revealedMax + 1) / 10));
  const episodesToShow = EPISODES.filter(ep => ep.id <= maxEpisodeId);

  return (
    <div className="relative min-h-screen p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
      <AppHeader title={levelsTitle} showBack onBack={onBack} />

      <div className="flex flex-wrap gap-1 mb-4 min-w-0">
        <button
          onClick={() => setMapMode('general')}
          className={`px-2 py-1.5 rounded text-xs max-w-[5rem] sm:max-w-none truncate ${mapMode === 'general' ? 'bg-amber-500 text-white' : 'bg-black/20 text-amber-200'}`}
          title={t('menu.general')}
        >
          {t('menu.general')}
        </button>
        {DEITIES.map(d => (
          <button
            key={d.id}
            onClick={() => setMapMode(d.id)}
            className={`px-2 py-1.5 rounded text-xs max-w-[5rem] sm:max-w-none truncate ${mapMode === d.id ? 'text-white' : 'bg-black/20 text-amber-200'}`}
            style={{ backgroundColor: mapMode === d.id ? d.color : undefined }}
            title={t(`deities.${d.id}`)}
          >
            {t(`deities.${d.id}`)}
          </button>
        ))}
      </div>

      <DonateThankYouBox />

      <div className="space-y-6 mt-4">
        {episodesToShow.map(ep => (
          <div key={ep.id}>
            <h2 className="text-amber-300 font-medium mb-2">{ep.name}</h2>
            <div className="grid grid-cols-5 gap-2">
              {LEVELS.filter(l => l.episode === ep.id).map((level, i) => {
                const idx = (ep.id - 1) * 10 + i;
                if (idx > revealedMax) return null;
                const progress = levelProgress[progressKey(mapMode, level.id)];
                const canPlay = idx <= currentLevelIndex && (idx < FIRST_LOCKED_LEVEL_INDEX || levelsUnlocked === true);
                const isPaywalled = idx >= FIRST_LOCKED_LEVEL_INDEX && idx <= currentLevelIndex && levelsUnlocked !== true;
                return (
                  <button
                    key={level.id}
                    onClick={() => (canPlay || isPaywalled) && onSelectLevel(idx, mapMode)}
                    disabled={!canPlay && !isPaywalled}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center
                      font-medium text-sm
                      ${canPlay ? 'bg-amber-500/30 text-amber-200' : isPaywalled ? 'bg-amber-500/20 text-amber-300' : 'bg-black/20 text-gray-500'}
                    `}
                    title={isPaywalled ? t('menu.offerDakshinaToUnlock') : undefined}
                  >
                    <span>{idx + 1}</span>
                    {isPaywalled && <span className="text-xs">🔒</span>}
                    {progress && canPlay && (
                      <span className="text-amber-400 text-xs">
                        {'★'.repeat(progress.stars)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <AppFooter />
      <BottomNav />
      </div>
    </div>
  );
}
