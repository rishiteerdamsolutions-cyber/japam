import { useEffect, useRef, useCallback, useState } from 'react';
import { Board } from './Board';
import { HUD } from './HUD';
import { GameOverlay } from './GameOverlay';
import { ActiveUsersStrip } from './ActiveUsersStrip';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { saveUserPausedGame } from '../../lib/firestore';
import { useSound, stopAllMantras, stopMatchBonusAudio } from '../../hooks/useSound';
import { useSettingsStore } from '../../store/settingsStore';
import type { DeityId } from '../../data/deities';
import { GoogleSignIn } from '../auth/GoogleSignIn';

interface GameScreenProps {
  mode: 'general' | string;
  levelIndex: number;
  isMarathon?: boolean;
  marathonId?: string | null;
  marathonTargetJapas?: number | null;
  isGuest?: boolean;
  justRestored?: boolean;
  onJustRestoredCleared?: () => void;
  onBack: () => void;
  onNextLevel?: (mode: 'general' | string, levelIndex: number) => void;
}

export function GameScreen({ mode, levelIndex, isMarathon, marathonId, marathonTargetJapas, isGuest, justRestored, onJustRestoredCleared, onBack, onNextLevel }: GameScreenProps) {
  const initGame = useGameStore(s => s.initGame);
  const status = useGameStore(s => s.status);
  const reset = useGameStore(s => s.reset);
  const lastMatches = useGameStore(s => s.lastMatches);
  const lastSwappedTypes = useGameStore(s => s.lastSwappedTypes);
  const matchGeneration = useGameStore(s => s.matchGeneration);
  const matchBonusAudio = useGameStore(s => s.matchBonusAudio);
  const currentLevelIndex = useGameStore(s => s.levelIndex);
  const prevGenerationRef = useRef(0);
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bgMusicEnabled = useSettingsStore(s => s.backgroundMusicEnabled);
  const bgMusicVolume = useSettingsStore(s => s.backgroundMusicVolume);
  const setBackgroundMusic = useSettingsStore(s => s.setBackgroundMusic);
  const setBackgroundMusicVolume = useSettingsStore(s => s.setBackgroundMusicVolume);
  const { playMantra, playMatchBonusAudio } = useSound(bgMusicEnabled, bgMusicVolume);

  const clearPendingAudio = () => {
    for (const id of pendingTimersRef.current) clearTimeout(id);
    pendingTimersRef.current = [];
    stopAllMantras();
    stopMatchBonusAudio();
  };

  const savePausedState = useGameStore(s => s.savePausedState);
  const prevRestoredRef = useRef(false);

  useEffect(() => {
    clearPendingAudio();
    if (justRestored || prevRestoredRef.current) {
      prevRestoredRef.current = !!justRestored;
      if (justRestored && onJustRestoredCleared) {
        const id = setTimeout(onJustRestoredCleared, 0);
        return () => clearTimeout(id);
      }
      return;
    }
    prevRestoredRef.current = false;
    if (isMarathon && marathonTargetJapas != null && marathonId) {
      initGame(mode as 'general', 0, { marathonId, marathonTargetJapas });
    } else if (isGuest) {
      initGame('general', 0, { overrideJapaTarget: 11, isGuest: true });
    } else {
      initGame(mode as 'general', levelIndex);
    }
    prevGenerationRef.current = 0;
  }, [mode, levelIndex, isMarathon, marathonTargetJapas, marathonId, isGuest, justRestored, onJustRestoredCleared, initGame]);

  const user = useAuthStore(s => s.user);
  const getPausedKey = useGameStore(s => s.getPausedKey);
  const [showBreakReminder, setShowBreakReminder] = useState(false);

  const breakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleBreakReminder = useCallback(() => {
    if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    breakTimerRef.current = setTimeout(() => setShowBreakReminder(true), 20 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    scheduleBreakReminder();
    return () => {
      if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    };
  }, [status, scheduleBreakReminder]);

  useEffect(() => {
    if (status === 'won') {
      if (user?.uid) {
        saveUserPausedGame(user.uid, null);
      } else {
        try {
          localStorage.removeItem(getPausedKey());
        } catch {}
      }
    }
  }, [status, user?.uid, getPausedKey]);

  const handlePause = useCallback(async () => {
    const payload = savePausedState();
    if (payload) {
      if (user?.uid) {
        await saveUserPausedGame(user.uid, payload as unknown as Record<string, unknown>);
      } else {
        try {
          localStorage.setItem(payload.key, JSON.stringify(payload));
        } catch {}
      }
      onBack();
    }
  }, [savePausedState, user?.uid, onBack]);

  useEffect(() => {
    if (lastMatches.length === 0 || matchGeneration === prevGenerationRef.current) return;
    prevGenerationRef.current = matchGeneration;

    const swapped = lastSwappedTypes;
    const intendedDeity = swapped?.[0] ?? null;
    const uniqueDeities = new Set(lastMatches.map(m => m.deity));
    const isMultiDeity = uniqueDeities.size > 1;

    let filtered: typeof lastMatches;
    if (mode === 'general') {
      filtered = lastMatches.filter(m =>
        m.combo === 1 && (!swapped || swapped.includes(m.deity))
      );
      if (isMultiDeity && intendedDeity && filtered.some(m => m.deity === intendedDeity)) {
        filtered = filtered.filter(m => m.deity === intendedDeity);
      }
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
    if (matchBonusAudio !== 'none') {
      const bonusDelay = Math.max(600, deduped.length * 200 + 400);
      const id = setTimeout(() => playMatchBonusAudio(matchBonusAudio), bonusDelay);
      pendingTimersRef.current.push(id);
    }

    return () => {
      clearPendingAudio();
    };
  }, [lastMatches, matchGeneration, lastSwappedTypes, matchBonusAudio, playMantra, playMatchBonusAudio, mode]);

  const handleNext = () => {
    const nextIndex = Math.min(currentLevelIndex + 1, 49);
    if (onNextLevel) {
      onNextLevel(mode, nextIndex);
    } else {
      initGame(mode as 'general', nextIndex);
    }
  };

  const handleToggleMusic = () => {
    setBackgroundMusic(!bgMusicEnabled);
  };

  const handleVolumeChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value)) {
      setBackgroundMusicVolume(value / 100);
    }
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
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-amber-400 text-sm py-1 px-2"
          >
            ← Back
          </button>
          {status === 'playing' && !isGuest && (
            <button
              onClick={handlePause}
              className="text-amber-400 text-sm py-1 px-2 border border-amber-500/50 rounded"
            >
              Pause
            </button>
          )}
          {status === 'playing' && isGuest && (
            <button
              onClick={onBack}
              className="text-amber-400 text-sm py-1 px-2 border border-amber-500/50 rounded"
            >
              Exit
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-200/80">
          <button
            type="button"
            onClick={handleToggleMusic}
            className={`px-2 py-1 rounded-lg border text-[11px] ${
              bgMusicEnabled
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-black/40 text-amber-200 border-amber-500/40'
            }`}
          >
            {bgMusicEnabled ? 'Music ON' : 'Music OFF'}
          </button>
          <div className={`flex items-center gap-1 ${bgMusicEnabled ? '' : 'opacity-50'}`}>
            <span className="text-[11px]">Vol</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((bgMusicVolume ?? 0.25) * 100)}
              onChange={handleVolumeChange}
              disabled={!bgMusicEnabled}
              className="w-20 accent-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 w-full max-w-md">
        <HUD />
        <ActiveUsersStrip />
      </div>

      <div className="flex-1 w-full max-w-md min-h-0 flex items-center justify-center">
        <Board />
      </div>

      {status === 'won' && (
        isGuest ? (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4">
            <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full text-center">
              <h2 className="text-2xl font-bold text-amber-400 mb-3">Jai!</h2>
              <p className="text-amber-200/90 mb-6">
                Play your favourite God&apos;s Japam? Login with Gmail
              </p>
              <div className="mb-4">
                <GoogleSignIn />
              </div>
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl bg-amber-500/80 text-white font-semibold"
              >
                Play again as guest
              </button>
              <button
                onClick={onBack}
                className="mt-2 w-full py-3 rounded-xl border border-amber-500/50 text-amber-400"
              >
                Menu
              </button>
            </div>
          </div>
        ) : (
          <GameOverlay
            status="won"
            isMarathon={isMarathon}
            onRetry={reset}
            onMenu={onBack}
            onNext={isMarathon ? undefined : handleNext}
          />
        )
      )}
      {status === 'lost' && (
        <GameOverlay
          status="lost"
          onRetry={reset}
          onMenu={onBack}
        />
      )}
      {showBreakReminder && status === 'playing' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-amber-200/90 mb-8">
              {isMarathon
                ? 'You have been playing the game for 20 minutes, please take a break.'
                : 'You have been playing the game for 20 minutes, please take a break after this current level.'}
            </p>
            <button
              onClick={() => {
                setShowBreakReminder(false);
                scheduleBreakReminder();
              }}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
