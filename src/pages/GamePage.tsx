import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GameScreen } from '../components/game/GameScreen';
import { Paywall } from '../components/payment/Paywall';
import { useGameStore, type PausedGameState } from '../store/gameStore';
import { loadUserPausedGame, saveUserPausedGame, resetMahaYagnaContribution } from '../lib/firestore';
import { useUnlockStore } from '../store/unlockStore';
import { useAuthStore } from '../store/authStore';
import { useLevelsConfigStore } from '../store/levelsConfigStore';
import { FIRST_LOCKED_LEVEL_INDEX } from '../store/unlockStore';
import { LEVELS } from '../data/levels';
import type { GameMode } from '../types';

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
  const marathonTargetJapas = targetParam ? parseInt(targetParam, 10) : null;
  const gameContextId = yagnaId || marathonId;
  const isMarathon = !!(marathonId || yagnaId) && marathonTargetJapas != null;

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

  const initGame = useGameStore((s) => s.initGame);
  const restoreGame = useGameStore((s) => s.restoreGame);
  const loadUnlock = useUnlockStore((s) => s.load);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const isLocked = !isGuest && !isMarathon && levelIndex >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;

  useEffect(() => {
    loadLevelsConfig();
  }, [loadLevelsConfig]);

  const expectedKey = isMarathon
    ? (yagnaId ? `japam-paused-yagna-${yagnaId}` : `japam-paused-marathon-${marathonId}`)
    : `japam-paused-${mode}-${levelIndex}`;

  useEffect(() => {
    if (paywallPending) return;
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
  }, [mode, levelIndex, isMarathon, marathonId, yagnaId, expectedKey, isLocked, paywallPending, user?.uid, authLoading]);

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

  const handleStartFresh = async () => {
    if (resumeKey) {
      if (user?.uid) {
        if (yagnaId) await resetMahaYagnaContribution(yagnaId, user);
        await saveUserPausedGame(user.uid, null, user, resumeKey);
      } else {
        try {
          localStorage.removeItem(resumeKey);
        } catch {}
      }
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
    if (isMarathon) {
      navigate(yagnaId ? '/maha-yagnas' : '/marathons');
    } else if (isGuest) {
      navigate('/');
    } else {
      navigate('/levels');
    }
  }, [navigate, isMarathon, yagnaId, isGuest]);

  if (resumePending) {
    return (
      <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-4">
        <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full text-center">
          <h2 className="text-xl font-bold text-amber-400 mb-2">{t('game.resumeJapa')}</h2>
          <p className="text-amber-200/80 mb-6 text-sm">
            {t('game.resumeJapaMessage')}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResume}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
            >
              {t('game.resume')}
            </button>
            <button
              onClick={handleStartFresh}
              className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-400"
            >
              {t('game.startFresh')}
            </button>
          </div>
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

  // Avoid starting a fresh game before we've checked for a paused game (prevents japa count from resetting on reload).
  if (!pauseCheckDone && !isGuest) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(/images/gameplaybg.png)' }}>
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative z-10 text-amber-400 text-sm">{t('common.loading')}</div>
      </div>
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
    />
  );
}
