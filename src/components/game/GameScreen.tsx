import { useEffect, useRef } from 'react';
import { Board } from './Board';
import { HUD } from './HUD';
import { GameOverlay } from './GameOverlay';
import { useGameStore } from '../../store/gameStore';
import { useSound } from '../../hooks/useSound';
import { useSettingsStore } from '../../store/settingsStore';

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
  const currentLevelIndex = useGameStore(s => s.levelIndex);
  const prevLengthRef = useRef(0);
  const bgMusicEnabled = useSettingsStore(s => s.backgroundMusicEnabled);
  const { playMantra } = useSound(bgMusicEnabled);

  useEffect(() => {
    initGame(mode as 'general', levelIndex);
    prevLengthRef.current = 0;
  }, [mode, levelIndex, initGame]);

  useEffect(() => {
    if (lastMatches.length === 0) return;
    if (lastMatches.length < prevLengthRef.current) {
      prevLengthRef.current = 0;
    }
    const newMatches = lastMatches.slice(prevLengthRef.current);
    prevLengthRef.current = lastMatches.length;

    let filtered: typeof newMatches;
    if (mode === 'general') {
      filtered = newMatches.filter(m => m.combo === 1);
    } else {
      filtered = newMatches.filter(m => m.deity === mode);
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

    for (let i = 0; i < deduped.length; i++) {
      const { deity } = deduped[i]!;
      setTimeout(() => playMantra(deity), i * 200);
    }
  }, [lastMatches, playMantra, mode]);

  const handleNext = () => {
    initGame(mode as 'general', Math.min(currentLevelIndex + 1, 49));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center p-4 pb-[env(safe-area-inset-bottom)] relative">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-amber-400 text-sm"
      >
        ← Back
      </button>

      <HUD />
      <Board />

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
