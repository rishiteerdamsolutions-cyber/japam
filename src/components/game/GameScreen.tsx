import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from './Board';
import { BoardDeityHints } from './BoardDeityHints';
import { GameOverlay } from './GameOverlay';
import { OutOfLivesOverlay } from './OutOfLivesOverlay';
import { ActiveUsersStrip } from './ActiveUsersStrip';
import { useGameStore } from '../../store/gameStore';
import { useJapaStore } from '../../store/japaStore';
import { useLivesStore } from '../../store/livesStore';
import { LEVELS } from '../../data/levels';
import { useAuthStore } from '../../store/authStore';
import { saveUserPausedGame } from '../../lib/firestore';
import { gameDebug } from '../../lib/gameDebug';
import { setLastPausedGame } from '../../lib/pausedGame';
import { useSound, stopAllMantras, stopMatchBonusAudio } from '../../hooks/useSound';
import { useSettingsStore } from '../../store/settingsStore';
import type { DeityId } from '../../data/deities';
import { GoogleSignIn } from '../auth/GoogleSignIn';
import { LivesDisplay } from '../lives/LivesDisplay';
import { LivesModal } from '../lives/LivesModal';
import { GamePowersScrollStrip } from './GamePowersScrollStrip';
import { usePowersInventoryStore } from '../../store/powersInventoryStore';

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

/** Rounded curved arrows (cycle / rim spin) — clear at toolbar size. */
function CandySpinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
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
  const matchSfxPlayToken = useGameStore((s) => s.matchSfxPlayToken);
  const currentLevelIndex = useGameStore(s => s.levelIndex);
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bgMusicEnabled = useSettingsStore(s => s.backgroundMusicEnabled);
  const bgMusicVolume = useSettingsStore(s => s.backgroundMusicVolume);
  const setBackgroundMusic = useSettingsStore(s => s.setBackgroundMusic);
  const setBackgroundMusicVolume = useSettingsStore(s => s.setBackgroundMusicVolume);
  const candyBorderSpinEnabled = useSettingsStore((s) => s.candyBorderSpinEnabled);
  const setCandyBorderSpin = useSettingsStore((s) => s.setCandyBorderSpin);
  const { playMatchSfx } = useSound(bgMusicEnabled, bgMusicVolume);

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
      gameDebug('GameScreen re-init effect → initGame', {
        mode,
        levelIndex,
        isMarathon,
        marathonTargetJapas,
        marathonId,
        yagnaId,
        isGuest,
        justRestored,
      });
      if (isMarathon && marathonTargetJapas != null && (marathonId || yagnaId)) {
        initGame(mode as 'general', 0, { marathonId: marathonId ?? undefined, marathonTargetJapas, yagnaId: yagnaId ?? undefined });
      } else if (isGuest) {
        initGame('general', 0, { overrideJapaTarget: 11, isGuest: true });
      } else {
        initGame(mode as 'general', levelIndex);
      }
    };

    doInit();
  }, [mode, levelIndex, isMarathon, marathonTargetJapas, marathonId, yagnaId, isGuest, justRestored, onJustRestoredCleared, initGame]);

  const powersInventoryLoaded = usePowersInventoryStore((s) => s.loaded);
  const syncBoardForOfferingPowers = useGameStore((s) => s.syncBoardForOfferingPowers);

  /** If inventory loaded after the first board build, refresh once so offering-backed deities (e.g. Hanuman) appear. */
  useEffect(() => {
    if (!powersInventoryLoaded || isGuest) return;
    syncBoardForOfferingPowers();
  }, [powersInventoryLoaded, isGuest, syncBoardForOfferingPowers]);

  /**
   * Swipe-back / browser back often unmounts this screen without clicking Pause.
   * Persist the same payload Pause would save, plus pagehide for full unloads.
   */
  useEffect(() => {
    const persistQuiet = (reason: 'pagehide' | 'unmount') => {
      const gs = useGameStore.getState();
      if (gs.status !== 'playing' || !gs.board.length) {
        gameDebug('persistQuiet skip', { reason, status: gs.status, boardLen: gs.board.length });
        return;
      }
      const payload = gs.savePausedState();
      if (!payload) {
        gameDebug('persistQuiet skip (no payload)', { reason, isGuest: gs.isGuest });
        return;
      }
      gameDebug('persistQuiet', {
        reason,
        key: payload.key,
        levelIndex: payload.levelIndex,
        japasThisLevel: gs.japasThisLevel,
        mode: payload.mode,
      });
      const authUser = useAuthStore.getState().user;
      if (authUser?.uid) {
        void (async () => {
          try {
            if (gs.marathonTargetJapas != null && (gs.marathonId || gs.yagnaId)) {
              await useJapaStore.getState().flushJapas();
            }
          } catch {
            /* ignore */
          }
          await saveUserPausedGame(
            authUser.uid,
            payload as unknown as Record<string, unknown>,
            authUser,
            undefined,
            { keepalive: reason === 'pagehide' },
          );
        })();
      } else {
        try {
          localStorage.setItem(payload.key, JSON.stringify(payload));
          setLastPausedGame({
            mode: payload.mode,
            levelIndex: payload.levelIndex,
            marathonId: payload.marathonId,
            marathonTargetJapas: payload.marathonTargetJapas,
            yagnaId: payload.yagnaId,
          });
        } catch {
          /* ignore */
        }
      }
    };

    const onPageHide = () => persistQuiet('pagehide');
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      persistQuiet('unmount');
    };
  }, []);
  const flushJapas = useJapaStore((s) => s.flushJapas);
  const getPausedKey = useGameStore(s => s.getPausedKey);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  const breakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const scheduleBreakReminder = useCallback(() => {
    if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    sessionStartRef.current = Date.now();
    breakTimerRef.current = setTimeout(() => setShowBreakReminder(true), 20 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    scheduleBreakReminder();
    return () => {
      if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    };
  }, [status, scheduleBreakReminder]);

  // When tab becomes visible, check if 20 min passed (handles mobile timer throttling)
  useEffect(() => {
    if (status !== 'playing') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionStartRef.current > 0) {
        const elapsed = Date.now() - sessionStartRef.current;
        if (elapsed >= 20 * 60 * 1000) setShowBreakReminder(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [status]);

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

  const refreshBoard = useGameStore(s => s.refreshBoard);
  const handleRefreshBoard = useCallback(() => {
    refreshBoard();
  }, [refreshBoard]);

  const addMoves = useGameStore((s) => s.addMoves);
  const handleRetryAfterLife = useCallback(() => {
    setShowOutOfLives(false);
    const level = LEVELS[currentLevelIndex];
    const movesToAdd = level?.moves ?? 20;
    addMoves(movesToAdd);
  }, [addMoves, currentLevelIndex]);

  /** Per-deity 3/4/5 match SFX: play as soon as the match pop animation starts (store bumps token with highlight). */
  useEffect(() => {
    if (matchSfxPlayToken === 0) return;
    const sel = useGameStore.getState().matchSfx;
    if (sel) playMatchSfx(sel);
  }, [matchSfxPlayToken, playMatchSfx]);

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

  const handleToggleCandyBorderSpin = () => {
    setCandyBorderSpin(!candyBorderSpinEnabled);
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
        <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-wrap justify-end">
          <button
            type="button"
            onClick={handleToggleMusic}
            className={`p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
              bgMusicEnabled ? 'bg-amber-500/80 text-black' : 'bg-black/40 text-amber-200'
            }`}
            aria-label={bgMusicEnabled ? 'Music ON' : 'Music OFF'}
          >
            <MusicIcon />
          </button>
          <div className={`flex items-center gap-1 shrink-0 ${bgMusicEnabled ? '' : 'opacity-50'}`}>
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
          <button
            type="button"
            onClick={handleToggleCandyBorderSpin}
            className={`p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
              candyBorderSpinEnabled ? 'bg-amber-500/80 text-black' : 'bg-black/40 text-amber-200'
            }`}
            aria-label={
              candyBorderSpinEnabled
                ? t('game.candyBorderSpinTurnOff')
                : t('game.candyBorderSpinTurnOn')
            }
            title={
              candyBorderSpinEnabled
                ? t('game.candyBorderSpinTurnOff')
                : t('game.candyBorderSpinTurnOn')
            }
          >
            <CandySpinIcon />
          </button>
        </div>
      </div>
      {pauseError && (
        <div className="w-full max-w-md mb-2 px-2">
          <div className="rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs px-3 py-2">
            {pauseError}
          </div>
        </div>
      )}

      <div className="relative z-20 shrink-0 w-full max-w-md mt-0.5 -mx-1 px-1 py-0.5 rounded-lg bg-black/15">
        <ActiveUsersStrip />
      </div>

      {status === 'playing' && (
        <div className="shrink-0 w-full max-w-md mt-1 flex justify-center">
          <button
            type="button"
            onClick={handleRefreshBoard}
            aria-label={t('game.refreshBoard')}
            title={t('game.refreshBoard')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/75 text-black font-semibold text-[10px] sm:text-xs leading-snug border border-amber-400/50 shadow-sm hover:bg-amber-400/90 active:scale-[0.98] transition-transform max-w-full text-center whitespace-nowrap"
          >
            {t('game.refreshBoard')}
          </button>
        </div>
      )}

      <div className="flex-1 w-full max-w-md min-h-0 flex items-center justify-center">
        <div className="relative w-full pt-5 sm:pt-6">
          <BoardDeityHints />
          <Board />
        </div>
      </div>

      {status === 'playing' && (
        <>
          {/* Powers strip in all modes; only normal levels add to inventory (not marathon/yāga). */}
          <div className="shrink-0 w-full max-w-md px-2 mt-0.5">
            <GamePowersScrollStrip />
          </div>
          <div className="shrink-0 h-16" aria-hidden />
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
                ? t('you_have_been_doing_japa_for_20_minutes_please_take_a_break')
                : t('you_have_been_doing_japa_for_20_minutes_please_take_a_break_after_this_current_level')}
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
