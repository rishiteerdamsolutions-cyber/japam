import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameScreen } from '../components/game/GameScreen';
import { Paywall } from '../components/payment/Paywall';
import { useGameStore } from '../store/gameStore';
import { useUnlockStore } from '../store/unlockStore';
import { useAuthStore } from '../store/authStore';
import { FIRST_LOCKED_LEVEL_INDEX } from '../store/unlockStore';
import { LEVELS } from '../data/levels';
import type { GameMode } from '../types';

export function GamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') || 'general') as GameMode;
  const levelParam = searchParams.get('level');
  const levelIndex = Math.max(0, Math.min(LEVELS.length - 1, parseInt(levelParam || '0', 10) || 0));

  const [paywallPending, setPaywallPending] = useState<{ mode: GameMode; levelIndex: number } | null>(null);
  const initGame = useGameStore((s) => s.initGame);
  const loadUnlock = useUnlockStore((s) => s.load);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const user = useAuthStore((s) => s.user);

  const isLocked = levelIndex >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;

  useEffect(() => {
    if (isLocked && !paywallPending) {
      setPaywallPending({ mode, levelIndex });
      return;
    }
    const unlocked = levelsUnlocked === true;
    if (!isLocked || unlocked) {
      setPaywallPending(null);
      initGame(mode, levelIndex);
    }
  }, [mode, levelIndex, isLocked, levelsUnlocked, initGame, paywallPending]);

  const handleNextLevel = (nextMode: GameMode, nextIndex: number) => {
    const idx = Math.min(nextIndex, LEVELS.length - 1);
    const locked = idx >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;
    if (locked) {
      setPaywallPending({ mode: nextMode, levelIndex: idx });
      return;
    }
    navigate(`/game?mode=${encodeURIComponent(nextMode)}&level=${idx}`);
    initGame(nextMode, idx);
  };

  if (paywallPending) {
    const pending = paywallPending;
    return (
      <Paywall
        onClose={() => navigate(-1)}
        onUnlocked={() => {
          loadUnlock(user?.uid).then(() => {
            setPaywallPending(null);
            initGame(pending.mode, pending.levelIndex);
          });
        }}
      />
    );
  }

  return (
    <GameScreen
      mode={mode}
      levelIndex={levelIndex}
      onBack={() => navigate(-1)}
      onNextLevel={(mode, idx) => handleNextLevel(mode as GameMode, idx)}
    />
  );
}
