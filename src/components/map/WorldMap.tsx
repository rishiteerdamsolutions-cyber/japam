import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgressStore, progressKey } from '../../store/progressStore';
import { useUnlockStore } from '../../store/unlockStore';
import { getFirstLockedLevelIndex } from '../../lib/levelGates';
import { useLevelsConfigStore } from '../../store/levelsConfigStore';
import { DonateThankYouBox } from '../donation/DonateThankYouBox';
import { MenuMatchChantHeader } from '../layout/MenuMatchChantHeader';
import { AppFooter } from '../layout/AppFooter';
import { BottomNav } from '../nav/BottomNav';
import { LEVELS } from '../../data/levels';
import { EPISODES } from '../../data/episodes';
import { DEITIES } from '../../data/deities';
import type { GameMode } from '../../types';

interface WorldMapProps {
  mode: GameMode;
  onSelectLevel: (index: number, mode: GameMode) => void;
}

export function WorldMap({ mode: initialMode, onSelectLevel }: WorldMapProps) {
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
  const firstLock = getFirstLockedLevelIndex(mapMode);

  return (
    <div className="relative min-h-screen p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
      <MenuMatchChantHeader />
      <h2 className="text-base sm:text-xl font-bold text-amber-400 mb-3 truncate" style={{ fontFamily: 'serif' }}>
        {levelsTitle}
      </h2>

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

      <DonateThankYouBox className="mt-4" />

      <div className="space-y-6 mt-4">
        {episodesToShow.map(ep => (
          <div key={ep.id}>
            <h2 className="text-amber-300 font-medium mb-2">{ep.name}</h2>
            <div className="grid grid-cols-5 gap-2">
              {LEVELS.filter(l => l.episode === ep.id).map((level, i) => {
                const idx = (ep.id - 1) * 10 + i;
                if (idx > revealedMax) return null;
                const progress = levelProgress[progressKey(mapMode, level.id)];
                const unlocked = levelsUnlocked === true;
                const canPlay =
                  idx <= currentLevelIndex && (idx < firstLock || unlocked);
                // First level that requires Pro: opens paywall from map. Higher levels stay disabled until Pro.
                const isPaywallGate =
                  !unlocked &&
                  idx === firstLock &&
                  currentLevelIndex >= firstLock;
                const isProLockedAhead = !unlocked && idx > firstLock;
                return (
                  <button
                    key={level.id}
                    onClick={() => (canPlay || isPaywallGate) && onSelectLevel(idx, mapMode)}
                    disabled={!canPlay && !isPaywallGate}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center
                      font-medium text-sm
                      ${canPlay ? 'bg-amber-500/30 text-amber-200' : isPaywallGate ? 'bg-amber-500/20 text-amber-300' : 'bg-black/20 text-gray-500'}
                    `}
                    title={
                      isPaywallGate
                        ? t('menu.offerDakshinaToUnlock')
                        : isProLockedAhead
                          ? t('menu.proLockedUntilLevel3')
                          : undefined
                    }
                  >
                    <span>{idx + 1}</span>
                    {isPaywallGate && <span className="text-xs">🔒</span>}
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
