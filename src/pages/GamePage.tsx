import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeReturnPath } from '../lib/navigationReturn';
import { useTranslation } from 'react-i18next';
import { GameScreen } from '../components/game/GameScreen';
import { Paywall } from '../components/payment/Paywall';
import { useGameStore, type PausedGameState } from '../store/gameStore';
import { loadUserPausedGame, saveUserPausedGame, resetMahaYagnaContribution } from '../lib/firestore';
import { setLastPausedGame } from '../lib/pausedGame';
import { useUnlockStore } from '../store/unlockStore';
import { useAuthStore } from '../store/authStore';
import { useLivesStore } from '../store/livesStore';
import { useLevelsConfigStore } from '../store/levelsConfigStore';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import {
  getFirstLockedLevelIndex,
  FIRST_LOCKED_LEVEL_INDEX_GENERAL,
  isLevelIndexCompleted,
} from '../lib/levelGates';
import { LEVELS, ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX } from '../data/levels';
import { DEITY_IDS } from '../data/deities';
import type { GameMode } from '../types';
import { getOccasionEntryGate } from '../lib/occasionEntryGate';
import { LAUNCH_FEATURE_OCCASION_GAMES } from '../config/launchFeatures';
import { LevelAlreadyCompleteModal, GeneralMalaCompleteModal } from '../components/game/LevelGateModals';
import { PushableButton } from '../components/ui/PushableButton';
import { pushableFullWidthFrontClass } from '../lib/landingCtaStyles';
import { CTA } from '../lib/ctaCopy';
import { shouldOfferResumePausedGame } from '../lib/pausedGameResume';

function parseGameMode(rawMode: string | null): GameMode {
  if (!rawMode) return 'general';
  const trimmed = rawMode.trim();
  if (!trimmed) return 'general';
  if (trimmed.toLowerCase() === 'general') return 'general';

  // Accept common URL spellings/casing (e.g. Rama, NARAYANA, iskcon).
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  const canonical =
    normalized === 'iskon'
      ? 'iskcon'
      : normalized;

  return (DEITY_IDS as readonly string[]).includes(canonical) ? (canonical as GameMode) : 'general';
}

export function GamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const guestParam = searchParams.get('guest');
  // Guest mode is URL-driven, but if the user signs in mid-session we should immediately
  // "upgrade" to signed-in gameplay (powers unlock, guest modal closes) without requiring reload.
  const isGuest = (guestParam === '1' || guestParam === 'true' || guestParam === 'yes') && !user?.uid;
  const levelParam = searchParams.get('level');
  const marathonId = searchParams.get('marathon');
  const yagnaId = searchParams.get('yagna');
  const targetParam = searchParams.get('target');
  const marathonTargetJapas =
    (marathonId || yagnaId) && targetParam ? parseInt(targetParam, 10) : null;
  const gameContextId = yagnaId || marathonId;
  const isMarathon = !!(marathonId || yagnaId) && marathonTargetJapas != null;

  const occasionBirthday = searchParams.get('occasion') === 'birthday';
  const anniversarySession = searchParams.get('anniversary');
  const coupleDaily = searchParams.get('coupleDaily') === '1';
  const anniversarySessionFlavor = coupleDaily ? ('couple_daily' as const) : ('occasion' as const);
  const anniversaryRole = searchParams.get('role') === 'wife' ? 'wife' : 'husband';
  const anniversaryHost = searchParams.get('host') === '1';
  const occasionTarget = Math.min(500, Math.max(1, parseInt(searchParams.get('target') || '108', 10) || 108));
  const occasionKind = anniversarySession ? ('anniversary' as const) : occasionBirthday ? ('birthday' as const) : null;

  const isSpecial108Url =
    searchParams.get('special108') === '1' && !gameContextId && !occasionKind;
  const isWeeklyStreakUrl =
    searchParams.get('weeklyStreak') === '1' && !gameContextId && !occasionKind;
  const introParam = searchParams.get('intro');
  const isInviteIntroUrl =
    (introParam === '1' || introParam === 'true') && !gameContextId && !occasionKind;
  const inviteFresh = searchParams.get('inviteFresh') === '1';
  /** Guest quick-play defaults to general, except Special 108 / weekly streak / invite intro from URL. */
  const parsedMode = parseGameMode(searchParams.get('mode'));
  /** Guest without a deity in the URL plays general; invite intro uses `?mode=shani&guest=1&intro=1`. */
  const mode =
    isGuest &&
    !isSpecial108Url &&
    !isWeeklyStreakUrl &&
    !isInviteIntroUrl &&
    parsedMode === 'general'
      ? 'general'
      : parsedMode;
  const isInviteIntro = isGuest && isInviteIntroUrl && parsedMode !== 'general';
  const isSpecial108 = isSpecial108Url && parsedMode !== 'general';
  const isWeeklyStreak = isWeeklyStreakUrl && parsedMode !== 'general';

  /** `special108=1` without a valid deity in `mode` — send user to the 108 Japa picker. */
  useEffect(() => {
    if (!isSpecial108Url || parsedMode !== 'general') return;
    navigate('/special-108-japa', { replace: true });
  }, [isSpecial108Url, parsedMode, navigate]);

  /** `weeklyStreak=1` without deity mode — open streak hub. */
  useEffect(() => {
    if (!isWeeklyStreakUrl || parsedMode !== 'general') return;
    navigate('/weekly-streak', { replace: true });
  }, [isWeeklyStreakUrl, parsedMode, navigate]);

  /** `intro=1` without a deity — back to menu invite. */
  useEffect(() => {
    if (!isInviteIntroUrl || parsedMode !== 'general') return;
    navigate('/menu', { replace: true });
  }, [isInviteIntroUrl, parsedMode, navigate]);

  useEffect(() => {
    if (!occasionKind) return;
    if (!LAUNCH_FEATURE_OCCASION_GAMES) {
      navigate('/', { replace: true });
      return;
    }
    const allow = getOccasionEntryGate();
    if (occasionKind === 'birthday' && allow !== 'birthday') {
      navigate('/occasion/birthday', { replace: true });
      return;
    }
    if (occasionKind === 'anniversary' && allow !== 'anniversary') {
      navigate('/occasion/anniversary', { replace: true });
    }
  }, [occasionKind, navigate]);

  const maxRevealedLevelIndex = useLevelsConfigStore((s) => s.maxRevealedLevelIndex);
  const loadLevelsConfig = useLevelsConfigStore((s) => s.load);
  const revealedMax = maxRevealedLevelIndex ?? 999;
  const parsedLevel = Math.max(0, Math.min(LEVELS.length - 1, parseInt(levelParam || '0', 10) || 0));
  const anniversaryLevelFromUrl = anniversarySession
    ? Math.min(ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX, parsedLevel)
    : parsedLevel;
  const storeAnniversaryLevel = useGameStore((s) =>
    anniversarySession &&
    s.anniversarySessionId === anniversarySession &&
    s.occasionKind === 'anniversary'
      ? s.levelIndex
      : -1,
  );
  const levelIndex = isGuest
    ? 0
    : gameContextId
    ? 0
    : isSpecial108 || isWeeklyStreak
    ? 0
    : anniversarySession
    ? Math.max(
        0,
        Math.min(
          ANNIVERSARY_COUPLE_LAST_LEVEL_INDEX,
          Math.max(anniversaryLevelFromUrl, storeAnniversaryLevel >= 0 ? storeAnniversaryLevel : 0),
        ),
      )
    : Math.max(0, Math.min(LEVELS.length - 1, revealedMax, parsedLevel));

  const [paywallPending, setPaywallPending] = useState<{ mode: GameMode; levelIndex: number } | null>(null);
  const [resumePending, setResumePending] = useState<PausedGameState | null>(null);
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const [justRestored, setJustRestored] = useState(false);
  const [pauseCheckDone, setPauseCheckDone] = useState(false);
  const [startFreshConfirmOpen, setStartFreshConfirmOpen] = useState(false);
  const [malaCompleteModal, setMalaCompleteModal] = useState(false);
  const [levelCompleteBlock, setLevelCompleteBlock] = useState<GameMode | null>(null);
  /** Prevent re-showing the same resume modal if Start Fresh was just confirmed. */
  const dismissedResumeKeyRef = useRef<string | null>(null);

  const progressLoaded = useProgressStore((s) => s.loaded);
  const firstLock = getFirstLockedLevelIndex(mode);

  const initGame = useGameStore((s) => s.initGame);
  const restoreGame = useGameStore((s) => s.restoreGame);
  const loadUnlock = useUnlockStore((s) => s.load);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const profileDisplayName = useProfileStore((s) => s.displayName);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const setProfileDisplayName = useProfileStore((s) => s.setDisplayName);
  // Only treat as locked once the server has answered `false`. `null` = still loading — never paywall on null
  // (previously `!== true` showed Paywall to paying users during the unlock fetch window).
  const isLocked = !isGuest && !isMarathon && levelIndex >= firstLock && levelsUnlocked === false;

  const [playNameDraft, setPlayNameDraft] = useState('');
  const [playNameSaving, setPlayNameSaving] = useState(false);
  const [playNameError, setPlayNameError] = useState<string | null>(null);

  const resolvedPlayName = (
    profileDisplayName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    ''
  ).trim();
  const needPlayName =
    !isGuest &&
    !!user?.uid &&
    profileLoaded &&
    !resolvedPlayName;

  useEffect(() => {
    if (!needPlayName || !user) return;
    setPlayNameDraft((prev) => {
      if (prev.trim()) return prev;
      return user.displayName ?? (user.email?.split('@')[0] ?? '');
    });
  }, [needPlayName, user]);

  useEffect(() => {
    loadLevelsConfig();
  }, [loadLevelsConfig]);

  /** Block skipping ahead by URL: only the next sequential level (per saved progress) may open. */
  useEffect(() => {
    if (!user?.uid || isGuest || gameContextId || occasionKind || isSpecial108 || !progressLoaded) return;
    const playable = useProgressStore.getState().getCurrentLevelIndex(mode);
    if (parsedLevel > playable) {
      const next = new URLSearchParams(searchParams);
      next.set('level', String(playable));
      navigate({ search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
    }
  }, [
    user?.uid,
    isGuest,
    gameContextId,
    occasionKind,
    isSpecial108,
    progressLoaded,
    mode,
    parsedLevel,
    navigate,
    searchParams,
  ]);

  const loadLives = useLivesStore((s) => s.load);
  const userForLives = useAuthStore((s) => s.user);

  // Load lives for signed-in users (general mode only; marathons don't use lives)
  useEffect(() => {
    if (userForLives?.uid && !isGuest && !isMarathon) {
      loadLives(() => userForLives.getIdToken());
    }
  }, [userForLives, isGuest, isMarathon, loadLives]);

  // Reload lives when user returns to tab (e.g. after midnight refill)
  useEffect(() => {
    if (!userForLives?.uid || isGuest || isMarathon) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadLives(() => userForLives.getIdToken());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [userForLives, isGuest, isMarathon, loadLives]);

  const expectedKey = isMarathon
    ? (yagnaId ? `japam-paused-yagna-${yagnaId}` : `japam-paused-marathon-${marathonId}`)
    : isSpecial108
    ? `japam-paused-special108-${mode}`
    : isWeeklyStreak
    ? `japam-paused-weeklyStreak-${mode}`
    : `japam-paused-${mode}-${levelIndex}`;

  useEffect(() => {
    if (paywallPending) return;
    if (occasionKind) {
      setResumePending(null);
      setResumeKey(null);
      setPauseCheckDone(true);
      setLevelCompleteBlock(null);
      if (isLocked) setPaywallPending({ mode, levelIndex });
      return;
    }
    if (isGuest || inviteFresh) {
      setResumePending(null);
      setResumeKey(null);
      setPauseCheckDone(true);
      setLevelCompleteBlock(null);
      if (isLocked) setPaywallPending({ mode, levelIndex });
      return;
    }
    // Wait for Firebase auth to settle so we can fetch ID token.
    if (user?.uid && authLoading) return;

    setLevelCompleteBlock(null);
    if (user?.uid && !isMarathon && !occasionKind && !isSpecial108 && !isWeeklyStreak && !inviteFresh) {
      if (!progressLoaded) return;
      // Read progress here; do NOT list `levelProgress` in effect deps — on win, saveLevel updates
      // progress in the same beat as the victory UI; re-running the effect would mistake "just won"
      // for "replaying a done level" and replace the next-level flow with the replay block.
      const lp = useProgressStore.getState().levelProgress;
      if (isLevelIndexCompleted(mode, levelIndex, lp)) {
        setLevelCompleteBlock(mode);
        setResumePending(null);
        setResumeKey(null);
        setPauseCheckDone(true);
        return;
      }
    }

    let cancelled = false;
    const load = async () => {
      if (user?.uid) {
        // token can be briefly unavailable right after reload; retry a couple times
        const data = await loadUserPausedGame(user.uid, user, expectedKey);
        if (cancelled) return;
        // Only show resume if the saved game's mode matches the game the user is opening.
        // e.g. paused a General game → only show resume when opening General game.
        if (data && typeof data === 'object' && data.key && typeof data.moves === 'number') {
          const saved = data as unknown as PausedGameState;
          const savedMode = saved.mode ?? null;
          const savedMarathon = saved.marathonId ?? null;
          const savedYagna =
            saved.yagnaId ??
            (saved.key && saved.key.startsWith('japam-paused-yagna-')
              ? saved.key.replace('japam-paused-yagna-', '')
              : null);
          const modeMatches = isMarathon
            ? (yagnaId ? savedYagna === yagnaId : savedMarathon === marathonId)
            : savedMode === mode;
          const savedLevelIndex = typeof saved.levelIndex === 'number' ? saved.levelIndex : levelIndex;
          const unlimitedPause =
            saved.marathonTargetJapas != null ||
            (saved.overrideJapaTarget != null && saved.overrideJapaTarget >= 50) ||
            saved.occasionKind === 'birthday' ||
            saved.occasionKind === 'anniversary';
          const resumable =
            modeMatches &&
            shouldOfferResumePausedGame(saved, savedLevelIndex, { isUnlimitedMoves: unlimitedPause });
          if (saved.key && dismissedResumeKeyRef.current === saved.key) {
            setResumePending(null);
            setResumeKey(null);
            setPauseCheckDone(true);
            return;
          }
          if (resumable) {
            setResumePending(saved);
            setResumeKey(saved.key);
            setPauseCheckDone(true);
            return;
          }
        }

      } else {
        try {
          const raw = localStorage.getItem(expectedKey);
          if (raw) {
            const parsed = JSON.parse(raw) as PausedGameState;
            const savedLevelIndex = typeof parsed.levelIndex === 'number' ? parsed.levelIndex : levelIndex;
            const unlimitedPause =
              parsed.marathonTargetJapas != null ||
              (parsed.overrideJapaTarget != null && parsed.overrideJapaTarget >= 50) ||
              parsed.occasionKind === 'birthday' ||
              parsed.occasionKind === 'anniversary';
            if (
              parsed?.savedAt &&
              shouldOfferResumePausedGame(parsed, savedLevelIndex, { isUnlimitedMoves: unlimitedPause })
            ) {
              if (dismissedResumeKeyRef.current === expectedKey) {
                setResumePending(null);
                setResumeKey(null);
                setPauseCheckDone(true);
                return;
              }
              setResumePending(parsed);
              setResumeKey(expectedKey);
              setPauseCheckDone(true);
              return;
            }
          }
        } catch {}
      }
      setResumePending(null);
      setResumeKey(null);
      setPauseCheckDone(true);

      if (isLocked) {
        setPaywallPending({ mode, levelIndex });
        return;
      }
    };
    load();
    return () => { cancelled = true; };
  }, [mode, levelIndex, isMarathon, isSpecial108, isWeeklyStreak, marathonId, yagnaId, expectedKey, isLocked, paywallPending, user, authLoading, occasionKind, isGuest, progressLoaded]);

  const handleResume = () => {
    if (resumePending) {
      const saved = { ...resumePending } as PausedGameState;
      if (!saved.yagnaId && saved.key?.startsWith('japam-paused-yagna-')) {
        saved.yagnaId = saved.key.replace('japam-paused-yagna-', '');
      }
      restoreGame(saved);
      setResumePending(null);
      setResumeKey(null);
      setJustRestored(true);
    }
  };

  const handleStartFreshConfirm = async () => {
    setStartFreshConfirmOpen(false);
    const keyToClear = resumeKey;
    if (keyToClear) {
      dismissedResumeKeyRef.current = keyToClear;
      // Optimistic close first to avoid race where pause-check reopens the same prompt.
      setResumePending(null);
      setResumeKey(null);
      if (user?.uid) {
        if (yagnaId) await resetMahaYagnaContribution(yagnaId, user);
        await saveUserPausedGame(user.uid, null, user, keyToClear);
      } else {
        try {
          localStorage.removeItem(keyToClear);
        } catch {}
      }
      setLastPausedGame(null);
    }
  };

  const handleNextLevel = (nextMode: GameMode, nextIndex: number) => {
    const idx = Math.min(nextIndex, LEVELS.length - 1, revealedMax);
    const nextFirstLock = getFirstLockedLevelIndex(nextMode);
    const needsPaidGate = idx >= nextFirstLock;

    const go = () => {
      const lu = useUnlockStore.getState().levelsUnlocked;
      const locked = needsPaidGate && lu === false;
      if (locked && nextMode === 'general' && idx === FIRST_LOCKED_LEVEL_INDEX_GENERAL) {
        setMalaCompleteModal(true);
        return;
      }
      if (locked) {
        setPaywallPending({ mode: nextMode, levelIndex: idx });
        return;
      }
      navigate(`/game?mode=${encodeURIComponent(nextMode)}&level=${idx}`);
      initGame(nextMode, idx);
    };

    if (needsPaidGate && levelsUnlocked === null) {
      void loadUnlock(user?.uid).then(go);
      return;
    }
    go();
  };

  const onJustRestoredCleared = useCallback(() => setJustRestored(false), []);
  const onBack = useCallback(() => {
    const navState = location.state as { returnTo?: string; from?: string } | null;
    const explicitReturn =
      normalizeReturnPath(navState?.returnTo) ?? normalizeReturnPath(navState?.from);
    if (explicitReturn) {
      navigate(explicitReturn);
      return;
    }
    if (occasionKind === 'birthday') {
      navigate(LAUNCH_FEATURE_OCCASION_GAMES ? '/occasion/birthday' : '/');
      return;
    }
    if (occasionKind === 'anniversary') {
      navigate(LAUNCH_FEATURE_OCCASION_GAMES ? '/occasion/anniversary' : '/');
      return;
    }
    if (isMarathon) {
      navigate(yagnaId ? '/maha-yagnas' : '/marathons');
    } else if (isInviteIntro) {
      navigate('/menu');
    } else if (isGuest) {
      navigate('/');
    } else if (isWeeklyStreak) {
      navigate('/weekly-streak');
    } else if (isSpecial108) {
      navigate('/special-108-japa');
    } else {
      navigate('/levels');
    }
  }, [navigate, location.state, isMarathon, yagnaId, isGuest, isInviteIntro, occasionKind, isSpecial108, isWeeklyStreak]);

  const handlePlayNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = playNameDraft.trim();
    if (!trimmed) {
      setPlayNameError(t('game.playNameRequired'));
      return;
    }
    setPlayNameSaving(true);
    setPlayNameError(null);
    try {
      const ok = await setProfileDisplayName(trimmed);
      if (!ok) setPlayNameError(t('game.playNameError'));
    } finally {
      setPlayNameSaving(false);
    }
  };

  const waitingProfile = !isGuest && !!user?.uid && !profileLoaded;
  const waitingUnlock =
    !isGuest &&
    !!user?.uid &&
    !isMarathon &&
    levelIndex >= firstLock &&
    levelsUnlocked === null;

  // Do not flash signed-out or guest UI while Firebase restores the persisted session.
  if (!isGuest && authLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 text-amber-400 text-sm">{t('common.loading')}</div>
      </div>
    );
  }

  // Signed-in: wait for progress (to detect completed levels) and pause check before game.
  if (
    !isGuest &&
    (waitingProfile ||
      waitingUnlock ||
      !pauseCheckDone ||
      (!!user?.uid &&
        !isMarathon &&
        !occasionKind &&
        !isSpecial108 &&
        !isWeeklyStreak &&
        !inviteFresh &&
        !progressLoaded))
  ) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 text-amber-400 text-sm">{t('common.loading')}</div>
      </div>
    );
  }

  if (levelCompleteBlock != null) {
    return (
      <LevelAlreadyCompleteModal
        mode={levelCompleteBlock}
        onClose={() => {
          setLevelCompleteBlock(null);
          navigate('/levels');
        }}
      />
    );
  }

  if (needPlayName) {
    return (
      <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-4">
        <form
          onSubmit={handlePlayNameSubmit}
          className="bg-[#C2185B]/90 rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
        >
          <h2 className="text-xl font-bold text-amber-400">{t('game.playNameTitle')}</h2>
          <p className="text-amber-200/80 text-sm text-left">{t('game.playNameDescription')}</p>
          <input
            type="text"
            value={playNameDraft}
            onChange={(e) => setPlayNameDraft(e.target.value)}
            maxLength={80}
            autoComplete="name"
            placeholder={user?.displayName || (user?.email ? user.email.split('@')[0] : '')}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 text-white border border-white/10 text-sm focus:border-amber-500/50 focus:outline-none text-left"
            aria-invalid={!!playNameError}
          />
          {playNameError && <p className="text-red-300/90 text-xs text-left">{playNameError}</p>}
          <PushableButton
            type="submit"
            fullWidth
            disabled={playNameSaving || !playNameDraft.trim()}
            frontClassName={pushableFullWidthFrontClass}
          >
            {playNameSaving ? CTA.game.playNameSaving : CTA.game.playNameSave}
          </PushableButton>
        </form>
      </div>
    );
  }

  if (resumePending) {
    return (
      <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-4">
        <div className="bg-[#C2185B]/90 rounded-2xl p-6 max-w-sm w-full text-center">
          {startFreshConfirmOpen ? (
            <>
              <h2 className="text-xl font-bold text-amber-400 mb-2">{t('game.startFreshConfirmTitle')}</h2>
              <p className="text-amber-200/80 mb-6 text-sm text-left break-words">
                {t('game.startFreshConfirmMessage')}
              </p>
              <div className="flex flex-col gap-2">
                <PushableButton
                  type="button"
                  fullWidth
                  onClick={handleStartFreshConfirm}
                  frontClassName={pushableFullWidthFrontClass}
                >
                  {CTA.game.startFreshConfirmYes}
                </PushableButton>
                <PushableButton
                  type="button"
                  fullWidth
                  onClick={() => setStartFreshConfirmOpen(false)}
                  frontClassName={pushableFullWidthFrontClass}
                >
                  {CTA.game.startFreshConfirmNo}
                </PushableButton>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-amber-400 mb-2">{t('game.resumeJapa')}</h2>
              <p className="text-amber-200/80 mb-4 text-sm">
                {t('game.resumeJapaMessage')}
              </p>
              <p className="text-amber-300/70 text-xs mb-6 italic">
                {t('game.saveProgressTip')}
              </p>
              <div className="flex flex-col gap-2">
                <PushableButton type="button" fullWidth onClick={handleResume} frontClassName={pushableFullWidthFrontClass}>
                  {CTA.game.resume}
                </PushableButton>
                <PushableButton
                  type="button"
                  fullWidth
                  onClick={() => setStartFreshConfirmOpen(true)}
                  frontClassName={pushableFullWidthFrontClass}
                >
                  {CTA.game.startFresh}
                </PushableButton>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (paywallPending) {
    const pending = paywallPending;
    return (
      <Paywall
        gateMode={pending.mode}
        onClose={() => navigate('/levels')}
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
    <>
    {malaCompleteModal && (
      <GeneralMalaCompleteModal
        onGetPro={() => {
          setMalaCompleteModal(false);
          setPaywallPending({ mode: 'general', levelIndex: FIRST_LOCKED_LEVEL_INDEX_GENERAL });
        }}
        onLater={() => {
          setMalaCompleteModal(false);
          navigate('/levels');
        }}
      />
    )}
    <GameScreen
      mode={mode}
      levelIndex={levelIndex}
      isMarathon={isMarathon}
      marathonId={yagnaId ? null : marathonId}
      marathonTargetJapas={marathonTargetJapas}
      yagnaId={yagnaId}
      isGuest={isGuest}
      inviteIntroJapa={isInviteIntro}
      justRestored={justRestored}
      onJustRestoredCleared={onJustRestoredCleared}
      onBack={onBack}
      onOpenWeeklyStreakHandwritingDownloads={
        isWeeklyStreak ? () => navigate('/japa#japa-dashboard-weekly-streak') : undefined
      }
      onNextLevel={isMarathon || isSpecial108 || isWeeklyStreak ? undefined : (m, idx) => handleNextLevel(m, idx)}
      occasionKind={occasionKind}
      occasionJapaTarget={occasionKind === 'birthday' ? occasionTarget : undefined}
      anniversarySessionId={anniversarySession}
      anniversaryMyRole={occasionKind === 'anniversary' ? anniversaryRole : undefined}
      anniversaryIsHost={occasionKind === 'anniversary' ? anniversaryHost : undefined}
      anniversarySessionFlavor={occasionKind === 'anniversary' ? anniversarySessionFlavor : undefined}
      special108Japa={isSpecial108}
      weeklyStreakJapa={isWeeklyStreak}
    />
    </>
  );
}
