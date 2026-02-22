import { useEffect, useRef } from 'react';
import { Board } from './Board';
import { HUD } from './HUD';
import { GameOverlay } from './GameOverlay';
import { useGameStore } from '../../store/gameStore';
import { useSound, stopAllMantras } from '../../hooks/useSound';
import { useSettingsStore } from '../../store/settingsStore';
import type { DeityId } from '../../data/deities';

interface GameScreenProps {
  mode: 'general' | string;
  levelIndex: number;
  onBack: () => void;
}

export function GameScreen({ mode, levelIndex, onBack }: GameScreenProps) {
  const initGame = useGameStore(s => s.initGame);
  const status = useGameStore(s => s.status);
  const reset = useGameStore(s => s.reset);
  const lastMatches = useGameStore(s => s.lastMatches);
  const lastSwappedTypes = useGameStore(s => s.lastSwappedTypes);
  const matchGeneration = useGameStore(s => s.matchGeneration);
  const currentLevelIndex = useGameStore(s => s.levelIndex);
  const prevGenerationRef = useRef(0);
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bgMusicEnabled = useSettingsStore(s => s.backgroundMusicEnabled);
  const bgMusicVolume = useSettingsStore(s => s.backgroundMusicVolume);
  const { playMantra } = useSound(bgMusicEnabled, bgMusicVolume);

  const clearPendingAudio = () => {
    for (const id of pendingTimersRef.current) clearTimeout(id);
    pendingTimersRef.current = [];
    stopAllMantras();
  };

  useEffect(() => {
    clearPendingAudio();
    initGame(mode as 'general', levelIndex);
    prevGenerationRef.current = 0;
  }, [mode, levelIndex, initGame]);

  useEffect(() => {
    if (lastMatches.length === 0 || matchGeneration === prevGenerationRef.current) return;
    prevGenerationRef.current = matchGeneration;

    const swapped = lastSwappedTypes;
    let filtered: typeof lastMatches;
    if (mode === 'general') {
      filtered = lastMatches.filter(m =>
        m.combo === 1 && (!swapped || swapped.includes(m.deity))
      );
    } else {
      const userSwappedTarget = swapped ? swapped.includes(mode as DeityId) : false;
      filtered = userSwappedTarget
        ? lastMatches.filter(m => m.deity === mode && m.combo === 1)
        : [];
    }

    const deduped: typeof filtered = [];
    const seen = new Set<string>();
    for (const m of filtered) {
      const key = `${m.deity}-${m.combo}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(m);
      }
    }

    pendingTimersRef.current = [];
    for (let i = 0; i < deduped.length; i++) {
      const { deity } = deduped[i]!;
      const id = setTimeout(() => playMantra(deity), i * 200);
      pendingTimersRef.current.push(id);
    }

    return () => {
      clearPendingAudio();
    };
  }, [lastMatches, matchGeneration, lastSwappedTypes, playMantra, mode]);

  const handleNext = () => {
    initGame(mode as 'general', Math.min(currentLevelIndex + 1, 49));
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col items-center overflow-hidden"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="w-full max-w-md flex items-center justify-between shrink-0 mb-1">
        <button
          onClick={onBack}
          className="text-amber-400 text-sm py-1 px-2"
        >
          ← Back
        </button>
      </div>

      <div className="shrink-0 w-full max-w-md">
        <HUD />
      </div>

      <div className="flex-1 w-full max-w-md min-h-0 flex items-center justify-center">
        <Board />
      </div>

      {status === 'won' && (
        <GameOverlay
          status="won"
          onRetry={reset}
          onMenu={onBack}
          onNext={handleNext}
        />
      )}
      {status === 'lost' && (
        <GameOverlay
          status="lost"
          onRetry={reset}
          onMenu={onBack}
        />
      )}
    </div>
  );
}
