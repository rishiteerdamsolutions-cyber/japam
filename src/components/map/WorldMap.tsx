import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgressStore, progressKey } from '../../store/progressStore';
import { useUnlockStore } from '../../store/unlockStore';
import { useAuthStore } from '../../store/authStore';
import { getFirstLockedLevelIndex } from '../../lib/levelGates';
import { useLevelsConfigStore } from '../../store/levelsConfigStore';
import { DonateThankYouBox } from '../donation/DonateThankYouBox';
import { MenuMatchChantHeader } from '../layout/MenuMatchChantHeader';
import { AppFooter } from '../layout/AppFooter';
import { BottomNav } from '../nav/BottomNav';
import { LEVELS } from '../../data/levels';
import { EPISODES } from '../../data/episodes';
import type { GameMode } from '../../types';

/** Bottom-nav Levels map is All-Devatā only so free tiers match general gates (5 levels), not per-deity gates. */
const MAP_MODE: GameMode = 'general';

interface WorldMapProps {
  onSelectLevel: (index: number, mode: GameMode) => void;
}

export function WorldMap({ onSelectLevel }: WorldMapProps) {
  const { t } = useTranslation();
  const { levelProgress, getCurrentLevelIndex } = useProgressStore();
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const user = useAuthStore((s) => s.user);
  const unlockResolving = Boolean(user?.uid && levelsUnlocked === null);
  const unlocked = levelsUnlocked === true || unlockResolving;
  const loadLevelsConfig = useLevelsConfigStore((s) => s.load);
  const maxRevealedLevelIndex = useLevelsConfigStore((s) => s.maxRevealedLevelIndex);
  const currentLevelIndex = getCurrentLevelIndex(MAP_MODE);
  const levelsTitle = t('menu.levels');

  useEffect(() => {
    loadLevelsConfig();
  }, [loadLevelsConfig]);

  const revealedMax = maxRevealedLevelIndex ?? 49;
  const maxEpisodeId = Math.min(100, Math.ceil((revealedMax + 1) / 10));
  const episodesToShow = EPISODES.filter(ep => ep.id <= maxEpisodeId);
  const firstLock = getFirstLockedLevelIndex(MAP_MODE);

  return (
    <div className="relative min-h-screen p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
      <MenuMatchChantHeader />
      <h2 className="text-base sm:text-xl font-bold text-amber-400 mb-3 truncate" style={{ fontFamily: 'serif' }}>
        {levelsTitle}
      </h2>

      <DonateThankYouBox className="mt-4" />

      <div className="space-y-6 mt-4">
        {episodesToShow.map(ep => (
          <div key={ep.id}>
            <h2 className="text-amber-300 font-medium mb-2">{ep.name}</h2>
            <div className="grid grid-cols-5 gap-2">
              {LEVELS.filter(l => l.episode === ep.id).map((level, i) => {
                const idx = (ep.id - 1) * 10 + i;
                if (idx > revealedMax) return null;
                const progress = levelProgress[progressKey(MAP_MODE, level.id)];
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
                    onClick={() => (canPlay || isPaywallGate) && onSelectLevel(idx, MAP_MODE)}
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
                          ? t('menu.proLockedUntilLevel6')
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
