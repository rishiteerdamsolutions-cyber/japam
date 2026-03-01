import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameScreen } from '../components/game/GameScreen';
import { Paywall } from '../components/payment/Paywall';
import { useGameStore, type PausedGameState } from '../store/gameStore';
import { loadUserPausedGame, saveUserPausedGame } from '../lib/firestore';
import { useUnlockStore } from '../store/unlockStore';
import { useAuthStore } from '../store/authStore';
import { useLevelsConfigStore } from '../store/levelsConfigStore';
import { FIRST_LOCKED_LEVEL_INDEX } from '../store/unlockStore';
import { LEVELS } from '../data/levels';
import type { GameMode } from '../types';

export function GamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guestParam = searchParams.get('guest');
  const isGuest = guestParam === '1' || guestParam === 'true' || guestParam === 'yes';
  const mode = (isGuest ? 'general' : (searchParams.get('mode') || 'general')) as GameMode;
  const levelParam = searchParams.get('level');
  const marathonId = searchParams.get('marathon');
  const targetParam = searchParams.get('target');
  const marathonTargetJapas = targetParam ? parseInt(targetParam, 10) : null;

  const maxRevealedLevelIndex = useLevelsConfigStore((s) => s.maxRevealedLevelIndex);
  const loadLevelsConfig = useLevelsConfigStore((s) => s.load);
  const revealedMax = maxRevealedLevelIndex ?? 999;
  const levelIndex = isGuest
    ? 0
    : marathonId
    ? 0
    : Math.max(0, Math.min(LEVELS.length - 1, revealedMax, parseInt(levelParam || '0', 10) || 0));

  const [paywallPending, setPaywallPending] = useState<{ mode: GameMode; levelIndex: number } | null>(null);
  const [resumePending, setResumePending] = useState<PausedGameState | null>(null);
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const [justRestored, setJustRestored] = useState(false);

  const initGame = useGameStore((s) => s.initGame);
  const restoreGame = useGameStore((s) => s.restoreGame);
  const loadUnlock = useUnlockStore((s) => s.load);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const user = useAuthStore((s) => s.user);

  const isMarathon = !!marathonId && marathonTargetJapas != null;
  const isLocked = !isGuest && !isMarathon && levelIndex >= FIRST_LOCKED_LEVEL_INDEX && levelsUnlocked !== true;

  useEffect(() => {
    loadLevelsConfig();
  }, [loadLevelsConfig]);

  const expectedKey = isMarathon ? `japam-paused-marathon-${marathonId}` : `japam-paused-${mode}-${levelIndex}`;

  useEffect(() => {
    if (paywallPending) return;
    if (isGuest) {
      setResumePending(null);
      setResumeKey(null);
      if (isLocked) setPaywallPending({ mode, levelIndex });
      return;
    }

    let cancelled = false;
    const load = async () => {
      if (user?.uid) {
        const data = await loadUserPausedGame(user.uid);
        if (cancelled) return;
        if (data && typeof data === 'object' && data.key === expectedKey && Array.isArray(data.board)) {
          const saved = data as unknown as PausedGameState;
          if (saved.savedAt && Date.now() - saved.savedAt < 7 * 24 * 60 * 60 * 1000) {
            setResumePending(saved);
            setResumeKey(expectedKey);
            return;
          }
        }
      } else {
        try {
          const raw = localStorage.getItem(expectedKey);
          if (raw) {
            const parsed = JSON.parse(raw) as PausedGameState;
            if (parsed?.savedAt && Date.now() - parsed.savedAt < 7 * 24 * 60 * 60 * 1000) {
              setResumePending(parsed);
              setResumeKey(expectedKey);
              return;
            }
          }
        } catch {}
      }
      setResumePending(null);
      setResumeKey(null);

      if (isLocked) {
        setPaywallPending({ mode, levelIndex });
        return;
      }
    };
    load();
    return () => { cancelled = true; };
  }, [mode, levelIndex, isMarathon, marathonId, expectedKey, isLocked, paywallPending, user?.uid]);

  const handleResume = () => {
    if (resumePending) {
      restoreGame(resumePending);
      setResumePending(null);
      setResumeKey(null);
      setJustRestored(true);
    }
  };

  const handleStartFresh = async () => {
    if (resumeKey) {
      if (user?.uid) {
        await saveUserPausedGame(user.uid, null);
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

  if (resumePending) {
    return (
      <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-4">
        <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full text-center">
          <h2 className="text-xl font-bold text-amber-400 mb-2">Resume game?</h2>
          <p className="text-amber-200/80 mb-6 text-sm">
            You have a saved game. Continue where you left off?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResume}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
            >
              Resume
            </button>
            <button
              onClick={handleStartFresh}
              className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-400"
            >
              Start fresh
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

  return (
    <GameScreen
      mode={mode}
      levelIndex={levelIndex}
      isMarathon={isMarathon}
      marathonId={marathonId}
      marathonTargetJapas={marathonTargetJapas}
      isGuest={isGuest}
      justRestored={justRestored}
      onJustRestoredCleared={() => setJustRestored(false)}
      onBack={() => (isMarathon ? navigate('/marathons') : isGuest ? navigate('/') : navigate('/levels'))}
      onNextLevel={isMarathon ? undefined : (m, idx) => handleNextLevel(m as GameMode, idx)}
    />
  );
}
