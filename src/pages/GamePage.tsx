import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { FIRST_LOCKED_LEVEL_INDEX } from '../store/unlockStore';
import { LEVELS } from '../data/levels';
import type { GameMode } from '../types';
import { getOccasionEntryGate } from '../lib/occasionEntryGate';

export function GamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guestParam = searchParams.get('guest');
  const isGuest = guestParam === '1' || guestParam === 'true' || guestParam === 'yes';
  const mode = (isGuest ? 'general' : (searchParams.get('mode') || 'general')) as GameMode;
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
  const anniversaryRole = searchParams.get('role') === 'wife' ? 'wife' : 'husband';
  const anniversaryHost = searchParams.get('host') === '1';
  const occasionTarget = Math.min(500, Math.max(1, parseInt(searchParams.get('target') || '108', 10) || 108));
  const occasionKind = anniversarySession ? ('anniversary' as const) : occasionBirthday ? ('birthday' as const) : null;

  useEffect(() => {
    if (!occasionKind) return;
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
  const levelIndex = isGuest
    ? 0
    : gameContextId
    ? 0
    : Math.max(0, Math.min(LEVELS.length - 1, revealedMax, parseInt(levelParam || '0', 10) || 0));

  const [paywallPending, setPaywallPending] = useState<{ mode: GameMode; levelIndex: number } | null>(null);
  const [resumePending, setResumePending] = useState<PausedGameState | null>(null);
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const [justRestored, setJustRestored] = useState(false);
  const [pauseCheckDone, setPauseCheckDone] = useState(false);
  const [startFreshConfirmOpen, setStartFreshConfirmOpen] = useState(false);

  const initGame = useGameStore((s) => s.initGame);
  const restoreGame = useGameStore((s) => s.restoreGame);
  const loadUnlock = useUnlockStore((s) => s.load);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const profileDisplayName = useProfileStore((s) => s.displayName);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const setProfileDisplayName = useProfileStore((s) => s.setDisplayName);
  const isLocked = !isGuest && !isMarathon && levelIndex >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;

  const [playNameDraft, setPlayNameDraft] = useState('');
  const [playNameSaving, setPlayNameSaving] = useState(false);
  const [playNameError, setPlayNameError] = useState<string | null>(null);

  const needPlayName =
    !isGuest &&
    !!user?.uid &&
    profileLoaded &&
    !(profileDisplayName && profileDisplayName.trim());

  useEffect(() => {
    if (!needPlayName || !user) return;
    setPlayNameDraft((prev) => {
      if (prev.trim()) return prev;
      return user.displayName ?? (user.email?.split('@')[0] ?? '');
    });
  }, [needPlayName, user?.uid, user?.displayName, user?.email]);

  useEffect(() => {
    loadLevelsConfig();
  }, [loadLevelsConfig]);

  const loadLives = useLivesStore((s) => s.load);
  const userForLives = useAuthStore((s) => s.user);

  // Load lives for signed-in users (general mode only; marathons don't use lives)
  useEffect(() => {
    if (userForLives?.uid && !isGuest && !isMarathon) {
      loadLives(() => userForLives.getIdToken());
    }
  }, [userForLives?.uid, isGuest, isMarathon, loadLives]);

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
  }, [userForLives?.uid, isGuest, isMarathon, loadLives]);

  const expectedKey = isMarathon
    ? (yagnaId ? `japam-paused-yagna-${yagnaId}` : `japam-paused-marathon-${marathonId}`)
    : `japam-paused-${mode}-${levelIndex}`;

  useEffect(() => {
    if (paywallPending) return;
    if (occasionKind) {
      setResumePending(null);
      setResumeKey(null);
      setPauseCheckDone(true);
      if (isLocked) setPaywallPending({ mode, levelIndex });
      return;
    }
    if (isGuest) {
      setResumePending(null);
      setResumeKey(null);
      setPauseCheckDone(true);
      if (isLocked) setPaywallPending({ mode, levelIndex });
      return;
    }
    // Wait for Firebase auth to settle so we can fetch ID token.
    if (user?.uid && authLoading) return;

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
          if (modeMatches) {
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
            if (parsed?.savedAt) {
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
  }, [mode, levelIndex, isMarathon, marathonId, yagnaId, expectedKey, isLocked, paywallPending, user?.uid, authLoading, occasionKind]);

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
    if (resumeKey) {
      if (user?.uid) {
        if (yagnaId) await resetMahaYagnaContribution(yagnaId, user);
        await saveUserPausedGame(user.uid, null, user, resumeKey);
      } else {
        try {
          localStorage.removeItem(resumeKey);
        } catch {}
      }
      setLastPausedGame(null);
      setResumePending(null);
      setResumeKey(null);
    }
  };

  const handleNextLevel = (nextMode: GameMode, nextIndex: number) => {
    const idx = Math.min(nextIndex, LEVELS.length - 1, revealedMax);
    const locked = idx >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;
    if (locked) {
      setPaywallPending({ mode: nextMode, levelIndex: idx });
      return;
    }
    navigate(`/game?mode=${encodeURIComponent(nextMode)}&level=${idx}`);
    initGame(nextMode, idx);
  };

  const onJustRestoredCleared = useCallback(() => setJustRestored(false), []);
  const onBack = useCallback(() => {
    if (occasionKind === 'birthday') {
      navigate('/occasion/birthday');
      return;
    }
    if (occasionKind === 'anniversary') {
      navigate('/occasion/anniversary');
      return;
    }
    if (isMarathon) {
      navigate(yagnaId ? '/maha-yagnas' : '/marathons');
    } else if (isGuest) {
      navigate('/');
    } else {
      navigate('/levels');
    }
  }, [navigate, isMarathon, yagnaId, isGuest, occasionKind]);

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

  // Signed-in: wait for pause check and profile before resume / name gate / game.
  if (!isGuest && (waitingProfile || !pauseCheckDone)) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 text-amber-400 text-sm">{t('common.loading')}</div>
      </div>
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
          <button
            type="submit"
            disabled={playNameSaving || !playNameDraft.trim()}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            {playNameSaving ? t('game.playNameSaving') : t('game.playNameSave')}
          </button>
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
                <button
                  type="button"
                  onClick={handleStartFreshConfirm}
                  className="w-full py-3 rounded-xl bg-red-600/90 text-white font-semibold"
                >
                  {t('game.startFreshConfirmYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setStartFreshConfirmOpen(false)}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
                >
                  {t('game.startFreshConfirmNo')}
                </button>
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
                <button
                  type="button"
                  onClick={handleResume}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
                >
                  {t('game.resume')}
                </button>
                <button
                  type="button"
                  onClick={() => setStartFreshConfirmOpen(true)}
                  className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-400"
                >
                  {t('game.startFresh')}
                </button>
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
    <GameScreen
      mode={mode}
      levelIndex={levelIndex}
      isMarathon={isMarathon}
      marathonId={yagnaId ? null : marathonId}
      marathonTargetJapas={marathonTargetJapas}
      yagnaId={yagnaId}
      isGuest={isGuest}
      justRestored={justRestored}
      onJustRestoredCleared={onJustRestoredCleared}
      onBack={onBack}
      onNextLevel={isMarathon ? undefined : (m, idx) => handleNextLevel(m as GameMode, idx)}
      occasionKind={occasionKind}
      occasionJapaTarget={occasionKind ? occasionTarget : undefined}
      anniversarySessionId={anniversarySession}
      anniversaryMyRole={occasionKind === 'anniversary' ? anniversaryRole : undefined}
      anniversaryIsHost={occasionKind === 'anniversary' ? anniversaryHost : undefined}
    />
  );
}
