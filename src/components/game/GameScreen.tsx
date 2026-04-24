import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Board } from './Board';
import { BoardDeityHints } from './BoardDeityHints';
import { GameOverlay } from './GameOverlay';
import { OutOfLivesOverlay } from './OutOfLivesOverlay';
import { ActiveUsersStrip } from './ActiveUsersStrip';
import { useGameStore, type AnniversarySessionFlavor } from '../../store/gameStore';
import { useJapaStore } from '../../store/japaStore';
import { useLivesStore } from '../../store/livesStore';
import { LEVELS, ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX } from '../../data/levels';
import { useAuthStore } from '../../store/authStore';
import { saveUserPausedGame } from '../../lib/firestore';
import { gameDebug } from '../../lib/gameDebug';
import { setLastPausedGame } from '../../lib/pausedGame';
import { useSound, stopAllMantras, stopMatchBonusAudio } from '../../hooks/useSound';
import { useSettingsStore } from '../../store/settingsStore';
import type { DeityId } from '../../data/deities';
import type { GameMode } from '../../types';
import { GoogleSignIn } from '../auth/GoogleSignIn';
import { LivesDisplay } from '../lives/LivesDisplay';
import { LivesModal } from '../lives/LivesModal';
import { GamePowersScrollStrip } from './GamePowersScrollStrip';
import { usePowersInventoryStore } from '../../store/powersInventoryStore';
import { useAnniversaryFirestore } from '../../hooks/useAnniversaryFirestore';
import { firestore, isFirebaseConfigured } from '../../lib/firebase';
import { pauseAnniversarySession, resumeAnniversarySession } from '../../lib/anniversarySessionFirestore';
import { completeBirthdayOccasion } from '../../lib/occasionsApi';
import { downloadAnniversaryReportPdf, downloadOccasionSummaryPdf } from '../../utils/occasionPdf';
import { formatMovesForDisplay, MOVES_INFINITY_CHAR } from '../../lib/formatMovesForDisplay';

/** Shown after ~20 min play; always English regardless of UI language (i18n keys live under `shared.*`). */
const JAPA_BREAK_REMINDER_MARATHON_EN =
  'You have been doing japa for 20 minutes, please take a break.';
const JAPA_BREAK_REMINDER_AFTER_LEVEL_EN =
  'You have been doing japa for 20 minutes, please take a break after this current level.';

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

function GameBottomStrip({
  isGuest,
  pauseSaving,
  onPause,
  onBack,
  occasionKind,
}: {
  isGuest: boolean;
  pauseSaving: boolean;
  onPause: () => void;
  onBack: () => void;
  occasionKind: null | 'birthday' | 'anniversary';
}) {
  const { t } = useTranslation();
  const moves = useGameStore((s) => s.moves);
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
  const overrideJapaTarget = useGameStore((s) => s.overrideJapaTarget);
  const anniversaryJapasHusband = useGameStore((s) => s.anniversaryJapasHusband);
  const anniversaryJapasWife = useGameStore((s) => s.anniversaryJapasWife);
  const level = LEVELS[levelIndex];
  const deityTarget: DeityId | undefined = mode !== 'general' ? (mode as DeityId) : undefined;
  const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : japasThisLevel;
  const japaTarget = overrideJapaTarget ?? marathonTargetJapas ?? level?.japaTarget ?? 15;
  const coupleTotal = anniversaryJapasHusband + anniversaryJapasWife;
  const leftLabel =
    occasionKind === 'anniversary'
      ? `${t('game.japas')}: ${japasThisLevel} / ${japaTarget} · ${t('occasions.coupleJapasHud')}: ${coupleTotal}`
      : `${t('game.japas')}: ${japasNeeded} / ${japaTarget}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 rounded-t-2xl bg-black/70 backdrop-blur-md border-t border-white/10"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      role="group"
      aria-label="Game controls"
    >
      <div className="flex-1 min-w-0 text-amber-200 text-xs sm:text-sm truncate" title={leftLabel}>
        {leftLabel}
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
      <div
        className="flex-1 min-w-0 text-amber-200 text-xs sm:text-sm font-medium text-right"
        title={movesTitle}
      >
        {t('game.moves')}: {movesShown}
      </div>
    </div>
  );
}

interface GameScreenProps {
  mode: GameMode;
  levelIndex: number;
  isMarathon?: boolean;
  marathonId?: string | null;
  marathonTargetJapas?: number | null;
  yagnaId?: string | null;
  isGuest?: boolean;
  justRestored?: boolean;
  onJustRestoredCleared?: () => void;
  onBack: () => void;
  onNextLevel?: (mode: GameMode, levelIndex: number) => void;
  occasionKind?: null | 'birthday' | 'anniversary';
  occasionJapaTarget?: number;
  anniversarySessionId?: string | null;
  anniversaryMyRole?: 'husband' | 'wife';
  anniversaryIsHost?: boolean;
  anniversarySessionFlavor?: AnniversarySessionFlavor;
}

export function GameScreen({
  mode,
  levelIndex,
  isMarathon,
  marathonId,
  marathonTargetJapas,
  yagnaId,
  isGuest,
  justRestored,
  onJustRestoredCleared,
  onBack,
  onNextLevel,
  occasionKind = null,
  occasionJapaTarget = 108,
  anniversarySessionId = null,
  anniversaryMyRole = 'husband',
  anniversaryIsHost = false,
  anniversarySessionFlavor = 'occasion',
}: GameScreenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const useLives = !!user && !isGuest && !isMarathon && !occasionKind;
  const load = useLivesStore((s) => s.load);
  const consume = useLivesStore((s) => s.consume);
  const getIdToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [guestPowerSignInOpen, setGuestPowerSignInOpen] = useState(false);
  const [occasionRecordSaved, setOccasionRecordSaved] = useState(false);

  const annSyncEnabled =
    occasionKind === 'anniversary' && !!anniversarySessionId && !!user?.uid;
  const { partnerJoined, error: anniversarySyncError, syncReady } = useAnniversaryFirestore(
    annSyncEnabled,
    anniversarySessionId,
    user?.uid ?? null,
    anniversaryIsHost,
    anniversaryMyRole,
  );

  const boardLen = useGameStore((s) => s.board.length);
  const anniversaryTurn = useGameStore((s) => s.anniversaryTurn);
  const anniversaryJH = useGameStore((s) => s.anniversaryJapasHusband);
  const anniversaryJW = useGameStore((s) => s.anniversaryJapasWife);
  const anniversaryHostFromStore = useGameStore((s) => s.anniversaryIsHost);
  const anniversarySessionPaused = useGameStore((s) => s.anniversarySessionPaused);
  const anniversaryAutoRefreshToken = useGameStore((s) => s.anniversaryAutoRefreshToken);
  const anniversaryMyRoleFromStore = useGameStore((s) => s.anniversaryMyRole);
  const anniversaryFlavorFromStore = useGameStore((s) => s.anniversarySessionFlavor);
  /** Firestore-derived role fixes URL mistakes; store updates every snapshot. */
  const anniversaryRoleForUi =
    occasionKind === 'anniversary' ? (anniversaryMyRoleFromStore ?? anniversaryMyRole) : anniversaryMyRole;
  const anniversaryInitKeyRef = useRef<string | null>(null);
  const [autoRefreshToast, setAutoRefreshToast] = useState(false);
  const autoRefreshToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (occasionKind !== 'anniversary') return;
    if (anniversaryAutoRefreshToken <= 0) return;
    setAutoRefreshToast(true);
    if (autoRefreshToastTimerRef.current) clearTimeout(autoRefreshToastTimerRef.current);
    autoRefreshToastTimerRef.current = setTimeout(() => setAutoRefreshToast(false), 2200);
    return () => {
      if (autoRefreshToastTimerRef.current) {
        clearTimeout(autoRefreshToastTimerRef.current);
        autoRefreshToastTimerRef.current = null;
      }
    };
  }, [anniversaryAutoRefreshToken, occasionKind]);

  const handleAnniversaryNextLevel = useCallback(() => {
    const s = useGameStore.getState();
    if (s.occasionKind !== 'anniversary' || !s.anniversaryIsHost || !s.anniversarySessionId) return;
    const next = s.levelIndex + 1;
    if (next > ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX) return;
    const role = s.anniversaryMyRole === 'wife' ? 'wife' : 'husband';
    const qs = new URLSearchParams();
    qs.set('anniversary', s.anniversarySessionId);
    qs.set('role', role);
    qs.set('host', '1');
    qs.set('mode', String(s.mode));
    qs.set('level', String(next));
    if (s.anniversarySessionFlavor === 'couple_daily') qs.set('coupleDaily', '1');
    navigate(`/game?${qs.toString()}`);
  }, [navigate]);

  const anniversaryIsFinalWin =
    occasionKind === 'anniversary' &&
    status === 'won' &&
    currentLevelIndex >= ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX;
  const anniversaryMidWin =
    occasionKind === 'anniversary' && status === 'won' && !anniversaryIsFinalWin;

  useEffect(() => {
    if (!isGuest) setGuestPowerSignInOpen(false);
  }, [isGuest]);

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

    if (occasionKind !== 'anniversary' || !anniversarySessionId) {
      anniversaryInitKeyRef.current = null;
    }

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
        occasionKind,
      });
      if (isMarathon && marathonTargetJapas != null && (marathonId || yagnaId)) {
        initGame(mode, 0, { marathonId: marathonId ?? undefined, marathonTargetJapas, yagnaId: yagnaId ?? undefined });
      } else if (occasionKind === 'birthday') {
        initGame(mode, levelIndex, {
          overrideJapaTarget: occasionJapaTarget,
          occasionKind: 'birthday',
        });
      } else if (occasionKind === 'anniversary' && anniversarySessionId) {
        const gs = useGameStore.getState();
        const sameSession =
          gs.anniversarySessionId === anniversarySessionId &&
          gs.occasionKind === 'anniversary' &&
          gs.anniversarySessionFlavor === anniversarySessionFlavor;
        let ah = 0;
        let aw = 0;
        let av = 0;
        if (sameSession && (levelIndex === gs.levelIndex || levelIndex === gs.levelIndex + 1)) {
          ah = gs.anniversaryJapasHusband;
          aw = gs.anniversaryJapasWife;
          av = gs.anniversaryFirestoreVersion;
        }
        const annKey = `${anniversarySessionId}|${anniversaryMyRole}|${anniversaryIsHost ? '1' : '0'}|${mode}|${levelIndex}|${anniversarySessionFlavor}`;
        if (anniversaryInitKeyRef.current === annKey) return;
        anniversaryInitKeyRef.current = annKey;
        initGame(mode, levelIndex, {
          occasionKind: 'anniversary',
          anniversarySessionId,
          anniversaryMyRole,
          anniversaryIsHost,
          anniversaryTurn: 'husband',
          anniversaryJapasHusband: ah,
          anniversaryJapasWife: aw,
          anniversaryFirestoreVersion: av,
          anniversarySessionFlavor,
        });
      } else if (isGuest) {
        initGame('general', 0, { overrideJapaTarget: 11, isGuest: true });
      } else {
        initGame(mode, levelIndex);
      }
    };

    doInit();
  }, [
    mode,
    levelIndex,
    isMarathon,
    marathonTargetJapas,
    marathonId,
    yagnaId,
    isGuest,
    justRestored,
    onJustRestoredCleared,
    initGame,
    occasionKind,
    occasionJapaTarget,
    anniversarySessionId,
    anniversaryMyRole,
    anniversaryIsHost,
    anniversarySessionFlavor,
  ]);

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
      if (gs.occasionKind === 'anniversary') return;
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
      if (!occasionKind) {
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
    }
  }, [status, user, getPausedKey, yagnaId, marathonId, flushJapas, occasionKind]);

  useEffect(() => {
    if (status !== 'won' || occasionKind !== 'birthday' || !user?.uid || occasionRecordSaved) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const s = useGameStore.getState();
        const deityTarget = s.mode !== 'general' ? (s.mode as DeityId) : undefined;
        const japasTotal = deityTarget
          ? (s.japasByDeity[deityTarget] ?? 0)
          : s.japasThisLevel;
        await completeBirthdayOccasion(token, {
          mode: s.mode,
          japasTotal,
          japasByDeity: { ...s.japasByDeity },
        });
        if (!cancelled) setOccasionRecordSaved(true);
      } catch (e) {
        console.error('occasion record', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, occasionKind, user, occasionRecordSaved]);

  const saveAndExit = useCallback(async () => {
    const gs = useGameStore.getState();
    if (gs.occasionKind === 'anniversary' && gs.anniversarySessionId && user?.uid) {
      setPauseError(null);
      if (isFirebaseConfigured && firestore && !gs.anniversarySessionPaused) {
        setPauseSaving(true);
        const r = await pauseAnniversarySession(firestore, gs.anniversarySessionId, user.uid);
        setPauseSaving(false);
        if (!r.ok) {
          setPauseError(r.error);
          return;
        }
      }
      onBack();
      return;
    }

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
  }, [savePausedState, user, onBack, flushJapas, yagnaId, marathonId]);

  const handleResumeCouple = useCallback(async () => {
    if (!anniversarySessionId || !user?.uid || !isFirebaseConfigured || !firestore) return;
    setPauseError(null);
    setPauseSaving(true);
    const r = await resumeAnniversarySession(firestore, anniversarySessionId);
    setPauseSaving(false);
    if (!r.ok) setPauseError(r.error);
  }, [anniversarySessionId, user]);

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

  const refreshBoard = useGameStore((s) => s.refreshBoard);
  const handleRefreshBoard = useCallback(() => {
    refreshBoard();
  }, [refreshBoard]);

  const deadBoardAutoRefreshPhase = useGameStore((s) => s.deadBoardAutoRefreshPhase);

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
      initGame(mode, nextIndex);
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

      {occasionKind === 'anniversary' && anniversaryIsHost && !partnerJoined && status === 'playing' && (
        <div className="w-full max-w-md mt-2 rounded-xl bg-amber-500/15 border border-amber-500/40 px-3 py-2 text-amber-100 text-xs text-center">
          {t('occasions.waitPartner')}
        </div>
      )}
      {occasionKind === 'anniversary' && autoRefreshToast && status === 'playing' && !anniversarySessionPaused && (
        <div className="w-full max-w-md mt-2 px-2">
          <div className="rounded-xl bg-black/40 border border-amber-400/35 text-amber-200 text-xs px-3 py-2 text-center">
            {t('occasions.boardAutoRefreshed')}
          </div>
        </div>
      )}
      {anniversarySyncError && (
        <div className="w-full max-w-md mt-2 text-red-300 text-xs px-2">{anniversarySyncError}</div>
      )}
      {occasionKind === 'anniversary' && status === 'playing' && !anniversarySessionPaused && (
        <div className="w-full max-w-md mt-2 text-center text-amber-200/90 text-xs font-medium">
          {anniversaryRoleForUi === anniversaryTurn ? t('occasions.yourTurn') : t('occasions.partnerTurn')}
        </div>
      )}

      {occasionKind === 'anniversary' && status === 'playing' && anniversarySessionPaused && (
        <div className="fixed inset-0 z-[38] flex flex-col items-center justify-center bg-black/88 p-6 text-center">
          <p className="text-amber-100 text-sm max-w-xs mb-4">{t('occasions.sessionPausedCouple')}</p>
          <p className="text-amber-200/70 text-xs max-w-xs mb-6">{t('occasions.resumeCoupleHint')}</p>
          <button
            type="button"
            disabled={pauseSaving || !isFirebaseConfigured || !firestore}
            onClick={() => void handleResumeCouple()}
            className="w-full max-w-xs py-3 rounded-2xl bg-amber-500 text-black font-semibold disabled:opacity-50 mb-3"
          >
            {pauseSaving ? '…' : t('occasions.resumeCoupleGame')}
          </button>
          <button
            type="button"
            onClick={() => onBack()}
            className="w-full max-w-xs py-2.5 rounded-xl border border-amber-500/50 text-amber-200 text-sm"
          >
            {t('occasions.leavePausedSession')}
          </button>
        </div>
      )}

      {occasionKind === 'anniversary' &&
        !anniversarySessionPaused &&
        !anniversaryIsHost &&
        status === 'playing' &&
        (!syncReady || boardLen === 0) && (
          <div className="absolute inset-0 z-[25] flex flex-col items-center justify-center bg-black/75 p-6">
            <p className="text-amber-200 text-center text-sm max-w-xs">
              {!syncReady ? t('occasions.waitHostBoard') : t('occasions.waitHostBoard')}
            </p>
          </div>
        )}

      {status === 'playing' && occasionKind !== 'anniversary' && (
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
          {deadBoardAutoRefreshPhase === 'notice' && status === 'playing' && (
            <div
              className="absolute inset-0 z-[22] flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/72 px-4 text-center pointer-events-none"
              role="status"
              aria-live="polite"
            >
              <p className="text-amber-200 font-semibold text-sm sm:text-base leading-snug max-w-[18rem]">
                {t('game.deadBoardAutoNoticeTitle')}
              </p>
              <p className="text-amber-100/85 text-xs sm:text-sm leading-snug max-w-[20rem]">
                {t('game.deadBoardAutoNoticeSubtitle')}
              </p>
            </div>
          )}
        </div>
      </div>

      {status === 'playing' && (
        <>
          {!occasionKind && (
            <div className="shrink-0 w-full max-w-md px-2 mt-0.5">
              <GamePowersScrollStrip
                isGuest={!!isGuest}
                onGuestPowerTap={() => setGuestPowerSignInOpen(true)}
              />
            </div>
          )}
          <div className="shrink-0 h-16" aria-hidden />
          <GameBottomStrip
            isGuest={!!isGuest}
            pauseSaving={pauseSaving}
            onPause={handlePause}
            onBack={onBack}
            occasionKind={occasionKind}
          />
        </>
      )}

      {status === 'won' && occasionKind && !isGuest && user && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-30 p-4 overflow-y-auto">
          <div className="bg-[#C2185B]/95 rounded-2xl p-5 max-w-sm w-full text-center border border-amber-500/30">
            <h2 className="text-xl font-bold text-amber-400 mb-2">
              {occasionKind === 'birthday'
                ? t('occasions.birthdayComplete')
                : anniversaryMidWin
                  ? t('occasions.coupleLevelComplete')
                  : t('occasions.anniversaryComplete')}
            </h2>
            {occasionKind === 'birthday' && (
              <p className="text-amber-200/85 text-sm mb-3">
                {t('game.japas')}: {useGameStore.getState().mode !== 'general' ? (useGameStore.getState().japasByDeity[useGameStore.getState().mode as DeityId] ?? 0) : useGameStore.getState().japasThisLevel} / {occasionJapaTarget}
              </p>
            )}
            {occasionKind === 'anniversary' && anniversaryMidWin && (
              <p className="text-amber-200/85 text-sm mb-3">
                {t('occasions.coupleLevelProgress', {
                  current: currentLevelIndex + 1,
                  total: ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX + 1,
                })}
              </p>
            )}
            {occasionKind === 'anniversary' && (
              <div className="text-left text-amber-200/90 text-xs space-y-2 mb-4">
                <p>
                  {t('occasions.husbandJapas')}: {anniversaryJH} · {t('occasions.wifeJapas')}: {anniversaryJW}
                </p>
                {anniversaryFlavorFromStore !== 'couple_daily' && (
                  <>
                    <p>
                      {t('occasions.sharedToWife')}: {Math.ceil(anniversaryJH / 2)}
                    </p>
                    <p>
                      {t('occasions.wifeTotal')}: {anniversaryJW + Math.ceil(anniversaryJH / 2)}
                    </p>
                  </>
                )}
                <p className="text-amber-400/90">
                  {t('occasions.yourJapas')}:{' '}
                  {anniversaryRoleForUi === 'husband' ? anniversaryJH : anniversaryJW}
                </p>
              </div>
            )}
            {occasionKind === 'birthday' && (
              <p className="text-emerald-300/90 text-xs mb-3">{t('occasions.savedToAccount')}</p>
            )}
            {occasionKind === 'anniversary' && anniversaryIsFinalWin && (
              <p className="text-emerald-300/90 text-xs mb-3">
                {anniversaryFlavorFromStore === 'couple_daily'
                  ? t('occasions.coupleGameCountedOnDashboard')
                  : t('occasions.coupleJapaCountedOnDashboard')}
              </p>
            )}
            {occasionKind === 'anniversary' && anniversaryMidWin && anniversaryHostFromStore && (
              <button
                type="button"
                onClick={handleAnniversaryNextLevel}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm mb-2"
              >
                {t('occasions.coupleNextLevel')}
              </button>
            )}
            {occasionKind === 'anniversary' && anniversaryMidWin && !anniversaryHostFromStore && (
              <p className="text-amber-200/75 text-xs mb-3">{t('occasions.coupleWaitHostNext')}</p>
            )}
            {(occasionKind === 'birthday' || anniversaryIsFinalWin) && (
              <button
                type="button"
                onClick={() => {
                  const s = useGameStore.getState();
                  if (occasionKind === 'birthday') {
                    const dt = s.mode !== 'general' ? (s.mode as DeityId) : undefined;
                    const jt = dt ? (s.japasByDeity[dt] ?? 0) : s.japasThisLevel;
                    downloadOccasionSummaryPdf({
                      title: t('occasions.birthdayTitle'),
                      lines: [
                        `${t('game.japas')}: ${jt} / ${occasionJapaTarget}`,
                        `Mode: ${s.mode}`,
                      ],
                      footer: t('occasions.savedToAccount'),
                    });
                  } else {
                    downloadAnniversaryReportPdf({
                      title: t('occasions.anniversaryTitle'),
                      husbandJapas: s.anniversaryJapasHusband,
                      wifeJapas: s.anniversaryJapasWife,
                      yourRoleLabel: anniversaryRoleForUi,
                      yourJapas: anniversaryRoleForUi === 'husband' ? s.anniversaryJapasHusband : s.anniversaryJapasWife,
                      footer: t('occasions.coupleJapaCountedOnDashboard'),
                    });
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm mb-2"
              >
                {t('occasions.downloadPdf')}
              </button>
            )}
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-2.5 rounded-xl bg-amber-500/80 text-white font-semibold text-sm mb-2"
            >
              {t('game.retry')}
            </button>
            <button
              type="button"
              onClick={() => void handleMenuBack()}
              className="w-full py-2.5 rounded-xl border border-amber-500/50 text-amber-300 text-sm"
            >
              {t('game.menu')}
            </button>
          </div>
        </div>
      )}

      {status === 'won' && (!occasionKind || isGuest || !user) && (
        isGuest ? (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4">
            <div className="bg-[#C2185B]/90 rounded-2xl p-4 sm:p-6 max-w-sm w-full text-center min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-400 mb-3 break-words">Jai!</h2>
              <p className="text-amber-200/90 mb-6 text-sm sm:text-base break-words">
                {t('shared.do_your_ista_devata_japa_sign_in_with_google')}
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
        ) : !occasionKind ? (
          <GameOverlay
            status="won"
            isMarathon={isMarathon}
            onRetry={handleRetry}
            onMenu={handleMenuBack}
            onNext={isMarathon ? undefined : handleNext}
          />
        ) : null
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
      {guestPowerSignInOpen && isGuest && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/75">
          <div className="bg-[#C2185B]/95 rounded-2xl p-4 sm:p-6 max-w-sm w-full text-center border-2 border-[#5D4037] shadow-xl">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400 mb-2">{t('game.guestPowersSignInTitle')}</h2>
            <p className="text-amber-200/90 text-sm sm:text-base mb-5">{t('game.guestPowersSignInBody')}</p>
            <div className="mb-3 flex justify-center">
              <GoogleSignIn />
            </div>
            <button
              type="button"
              onClick={() => setGuestPowerSignInOpen(false)}
              className="w-full py-2.5 rounded-xl border border-amber-500/50 text-amber-300 text-sm font-medium"
            >
              {t('common.later')}
            </button>
          </div>
        </div>
      )}
      {showLivesModal && <LivesModal onClose={() => setShowLivesModal(false)} />}
      {showBreakReminder && status === 'playing' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4">
          <div className="bg-[#C2185B]/90 rounded-2xl p-4 sm:p-6 max-w-sm w-full text-center min-w-0">
            <p className="text-amber-200/90 mb-8 text-sm sm:text-base break-words">
              {isMarathon ? JAPA_BREAK_REMINDER_MARATHON_EN : JAPA_BREAK_REMINDER_AFTER_LEVEL_EN}
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
