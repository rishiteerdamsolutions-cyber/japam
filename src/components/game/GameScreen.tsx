import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from './Board';
import { GameOverlay } from './GameOverlay';
import { OutOfLivesOverlay } from './OutOfLivesOverlay';
import { ActiveUsersStrip } from './ActiveUsersStrip';
import { useGameStore } from '../../store/gameStore';
import { useJapaStore } from '../../store/japaStore';
import { useLivesStore } from '../../store/livesStore';
import { LEVELS } from '../../data/levels';
import { useAuthStore } from '../../store/authStore';
import { saveUserPausedGame } from '../../lib/firestore';
import { setLastPausedGame } from '../../lib/pausedGame';
import { useSound, stopAllMantras, stopMatchBonusAudio } from '../../hooks/useSound';
import { useSettingsStore } from '../../store/settingsStore';
import type { DeityId } from '../../data/deities';
import { GoogleSignIn } from '../auth/GoogleSignIn';
import { LivesDisplay } from '../lives/LivesDisplay';
import { LivesModal } from '../lives/LivesModal';

function PauseIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function GameBottomStrip({ isGuest, pauseSaving, onPause, onBack }: {
  isGuest: boolean;
  pauseSaving: boolean;
  onPause: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const moves = useGameStore((s) => s.moves);
  const mode = useGameStore((s) => s.mode);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const japasThisLevel = useGameStore((s) => s.japasThisLevel);
  const japasByDeity = useGameStore((s) => s.japasByDeity);
  const marathonTargetJapas = useGameStore((s) => s.marathonTargetJapas);
  const overrideJapaTarget = useGameStore((s) => s.overrideJapaTarget);
  const level = LEVELS[levelIndex];
  const deityTarget: DeityId | undefined = mode !== 'general' ? (mode as DeityId) : undefined;
  const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : japasThisLevel;
  const japaTarget = overrideJapaTarget ?? marathonTargetJapas ?? level?.japaTarget ?? 15;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 rounded-t-2xl bg-black/70 backdrop-blur-md border-t border-white/10"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      role="group"
      aria-label="Game controls"
    >
      <div className="flex-1 min-w-0 text-amber-200 text-xs sm:text-sm truncate" title={`${t('game.japas')}: ${japasNeeded} / ${japaTarget}`}>
        {t('game.japas')}: {japasNeeded} / {japaTarget}
      </div>
      {!isGuest ? (
        <button
          type="button"
          onClick={onPause}
          disabled={pauseSaving}
          aria-label={t('game.pause')}
          className="flex-shrink-0 w-14 h-14 -mt-5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/40 flex items-center justify-center text-white border-4 border-black/80 hover:bg-amber-400 active:scale-95 transition-transform disabled:opacity-50 mx-1"
        >
          <PauseIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('game.exit')}
          className="flex-shrink-0 w-14 h-14 -mt-5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/40 flex items-center justify-center text-white border-4 border-black/80 hover:bg-amber-400 active:scale-95 transition-transform mx-1"
        >
          <ExitIcon />
        </button>
      )}
      <div className="flex-1 min-w-0 text-amber-200 text-xs sm:text-sm font-medium text-right">
        {t('game.moves')}: {moves}
      </div>
    </div>
  );
}

interface GameScreenProps {
  mode: 'general' | string;
  levelIndex: number;
  isMarathon?: boolean;
  marathonId?: string | null;
  marathonTargetJapas?: number | null;
  yagnaId?: string | null;
  isGuest?: boolean;
  justRestored?: boolean;
  onJustRestoredCleared?: () => void;
  onBack: () => void;
  onNextLevel?: (mode: 'general' | string, levelIndex: number) => void;
}

export function GameScreen({ mode, levelIndex, isMarathon, marathonId, marathonTargetJapas, yagnaId, isGuest, justRestored, onJustRestoredCleared, onBack, onNextLevel }: GameScreenProps) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
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

  const useLives = !!user && !isGuest && !isMarathon;
  const load = useLivesStore((s) => s.load);
  const consume = useLivesStore((s) => s.consume);
  const getIdToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);
  const [showOutOfLives, setShowOutOfLives] = useState(false);

  const clearPendingAudio = () => {
    for (const id of pendingTimersRef.current) clearTimeout(id);
    pendingTimersRef.current = [];
    stopAllMantras();
    stopMatchBonusAudio();
  };

  const savePausedState = useGameStore(s => s.savePausedState);
  const prevRestoredRef = useRef(false);
  const prevStatusRef = useRef<string>(status);

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

    const doInit = () => {
      if (isMarathon && marathonTargetJapas != null && (marathonId || yagnaId)) {
        initGame(mode as 'general', 0, { marathonId: marathonId ?? undefined, marathonTargetJapas, yagnaId: yagnaId ?? undefined });
      } else if (isGuest) {
        initGame('general', 0, { overrideJapaTarget: 11, isGuest: true });
      } else {
        initGame(mode as 'general', levelIndex);
      }
      prevGenerationRef.current = 0;
    };

    doInit();
  }, [mode, levelIndex, isMarathon, marathonTargetJapas, marathonId, yagnaId, isGuest, justRestored, onJustRestoredCleared, initGame]);
  const flushJapas = useJapaStore((s) => s.flushJapas);
  const getPausedKey = useGameStore(s => s.getPausedKey);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

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

  // Consume 1 life only when user LOSES (runs out of moves). Winning levels does not consume.
  useEffect(() => {
    if (status !== 'lost') {
      prevStatusRef.current = status;
      return;
    }
    if (!useLives || !user || prevStatusRef.current === 'lost') return;
    prevStatusRef.current = 'lost';
    let cancelled = false;
    (async () => {
      const ok = await consume(getIdToken);
      if (cancelled) return;
      if (!ok) {
        await load(getIdToken);
        if (cancelled) return;
        if (useLivesStore.getState().lives <= 0) setShowOutOfLives(true);
      }
    })();
    return () => { cancelled = true; };
  }, [status, useLives, user, consume, load, getIdToken]);

  useEffect(() => {
    if (status === 'won') {
      if (user?.uid && (yagnaId || marathonId)) flushJapas().catch(() => {});
      const key = getPausedKey();
      if (user?.uid) {
        saveUserPausedGame(user.uid, null, user, key);
      } else {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
      setLastPausedGame(null);
    }
  }, [status, user?.uid, getPausedKey, yagnaId, marathonId, flushJapas]);

  const saveAndExit = useCallback(async () => {
    const payload = savePausedState();
    if (payload) {
      if (user?.uid) {
        setPauseError(null);
        setPauseSaving(true);
        // Flush japas first so Maha Yagna / marathon attribution is persisted
        if (yagnaId || marathonId) await flushJapas();
        const ok = await saveUserPausedGame(user.uid, payload as unknown as Record<string, unknown>, user);
        setPauseSaving(false);
        if (!ok) {
          setPauseError('Could not save. Check internet and try again.');
          return;
        }
      } else {
        try {
          localStorage.setItem(payload.key, JSON.stringify(payload));
        } catch {}
      }
      setLastPausedGame({
        mode: payload.mode,
        levelIndex: payload.levelIndex,
        marathonId: payload.marathonId,
        marathonTargetJapas: payload.marathonTargetJapas,
        yagnaId: payload.yagnaId,
      });
      onBack();
    } else {
      if (user?.uid && (yagnaId || marathonId)) await flushJapas();
      onBack();
    }
  }, [savePausedState, user?.uid, user, onBack, flushJapas, yagnaId, marathonId]);

  // Both Back and Pause save then exit — retain japa count and allow resume.
  const handleBack = useCallback(() => {
    saveAndExit();
  }, [saveAndExit]);

  // When leaving via overlay (won/lost), flush japas before navigating.
  const handleMenuBack = useCallback(async () => {
    if (user?.uid && (yagnaId || marathonId)) await flushJapas();
    onBack();
  }, [user?.uid, yagnaId, marathonId, flushJapas, onBack]);

  const handlePause = useCallback(() => {
    saveAndExit();
  }, [saveAndExit]);

  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  const handleRetryAfterLife = useCallback(() => {
    setShowOutOfLives(false);
    reset();
  }, [reset]);

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

  const [showLivesModal, setShowLivesModal] = useState(false);
  const handleToggleMusic = () => {
    setBackgroundMusic(!bgMusicEnabled);
  };

  const handleVolumeChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value)) {
      setBackgroundMusicVolume(value / 100);
    }
  };

  if (showOutOfLives) {
    return (
      <OutOfLivesOverlay
        onClose={onBack}
        onRetryAfterLife={handleRetryAfterLife}
        returnMode={mode}
        returnLevelIndex={levelIndex}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 flex flex-col items-center w-full flex-1 min-h-0" style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))',
      }}>
        <div className="w-full max-w-md flex items-center justify-between shrink-0 mb-1 min-w-0 gap-2 min-h-[44px]">
        <button onClick={handleBack} className="text-amber-400 text-sm font-medium py-2 px-2 -ml-2 min-h-[44px] flex items-center shrink-0" aria-label={t('game.back')}>
          {t('game.back')}
        </button>
        {(useLives || (!!user && !isGuest && isMarathon)) && (
            <LivesDisplay
              onClick={useLives ? () => setShowLivesModal(true) : undefined}
              compact
              className="shrink-0"
              unlimited={!!user && !isGuest && isMarathon}
            />
          )}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <button
            type="button"
            onClick={handleToggleMusic}
            className={`p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center ${
              bgMusicEnabled ? 'bg-amber-500/80 text-black' : 'bg-black/40 text-amber-200'
            }`}
            aria-label={bgMusicEnabled ? 'Music ON' : 'Music OFF'}
          >
            <MusicIcon />
          </button>
          <div className={`flex items-center gap-1 ${bgMusicEnabled ? '' : 'opacity-50'}`}>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((bgMusicVolume ?? 0.25) * 100)}
              onChange={handleVolumeChange}
              disabled={!bgMusicEnabled}
              className="w-16 sm:w-20 accent-amber-500 h-6"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
      {pauseError && (
        <div className="w-full max-w-md mb-2 px-2">
          <div className="rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs px-3 py-2">
            {pauseError}
          </div>
        </div>
      )}

      <div className="relative z-20 shrink-0 w-full max-w-md mt-1 -mx-1 px-1 py-2 rounded-lg bg-black/20">
        <ActiveUsersStrip />
      </div>

      <div className="flex-1 w-full max-w-md min-h-0 flex items-center justify-center">
        <Board />
      </div>

      {status === 'playing' && (
        <>
          <div className="shrink-0 h-20" aria-hidden />
          <GameBottomStrip
            isGuest={!!isGuest}
            pauseSaving={pauseSaving}
            onPause={handlePause}
            onBack={onBack}
          />
        </>
      )}

      {status === 'won' && (
        isGuest ? (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4">
            <div className="bg-[#C2185B]/90 rounded-2xl p-4 sm:p-6 max-w-sm w-full text-center min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-400 mb-3 break-words">Jai!</h2>
              <p className="text-amber-200/90 mb-6 text-sm sm:text-base break-words">
                Do your ista devata japa? Sign in with Google
              </p>
              <div className="mb-4">
                <GoogleSignIn />
              </div>
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl bg-amber-500/80 text-white font-semibold"
              >
                Continue as guest
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
            onRetry={handleRetry}
            onMenu={handleMenuBack}
            onNext={isMarathon ? undefined : handleNext}
          />
        )
      )}
      {status === 'lost' && (
        <GameOverlay
          status="lost"
          onRetry={handleRetry}
          onMenu={handleMenuBack}
          showWatchForMoves={useLives}
          getIdToken={useLives ? getIdToken : undefined}
        />
      )}
      {showLivesModal && <LivesModal onClose={() => setShowLivesModal(false)} />}
      {showBreakReminder && status === 'playing' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4">
          <div className="bg-[#C2185B]/90 rounded-2xl p-4 sm:p-6 max-w-sm w-full text-center min-w-0">
            <p className="text-amber-200/90 mb-8 text-sm sm:text-base break-words">
              {isMarathon
                ? 'You have been doing japa for 20 minutes, please take a break.'
                : 'You have been doing japa for 20 minutes, please take a break after this current level.'}
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
    </div>
  );
}
