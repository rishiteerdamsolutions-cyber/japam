import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DEITIES, getDeity, type DeityId } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import {
  FREE_JAPAM_COUNTER_DEITY,
  japamCounterDeityAllowed,
  parseJapamCounterDeity,
} from '../lib/japamCounterSpecial';
import { AccessBadge } from '../components/ui/AccessBadge';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { JapamCounterLeaderboardPanel } from '../components/japamCounter/JapamCounterLeaderboardPanel';
import { playMantraOnce, primeAudio, stopAllMantras } from '../hooks/useSound';

type JapamCounterMode = 'manual' | 'auto';

function JapamCounterSession({ mode }: { mode: JapamCounterMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deityId = useMemo(() => parseJapamCounterDeity(searchParams.get('deity')), [searchParams]);
  const user = useAuthStore((s) => s.user);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const proOrPremiumActive =
    (tier === 'pro' || tier === 'premium') &&
    hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);
  const unlockPending = Boolean(user?.uid && levelsUnlocked === null);

  const [count, setCount] = useState(0);
  const [mantraBusy, setMantraBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const autoRunningRef = useRef(false);
  const manualBusyRef = useRef(false);

  const isAuto = mode === 'auto';
  const titleKey = isAuto ? 'specials.autoJapamCounterTitle' : 'specials.japamCounterTitle';
  const blurbKey = isAuto ? 'specials.autoJapamCounterBlurb' : 'specials.japamCounterBlurb';

  useEffect(() => {
    return () => {
      autoRunningRef.current = false;
      stopAllMantras();
    };
  }, []);

  useEffect(() => {
    autoRunningRef.current = autoRunning;
  }, [autoRunning]);

  const setDeity = useCallback(
    (id: DeityId) => {
      setCount(0);
      setMantraBusy(false);
      setAutoRunning(false);
      autoRunningRef.current = false;
      manualBusyRef.current = false;
      stopAllMantras();
      setSearchParams({ deity: id }, { replace: true });
    },
    [setSearchParams],
  );

  const handleDeityCardClick = useCallback(
    (id: DeityId) => {
      if (unlockPending) return;
      if (!japamCounterDeityAllowed(id, proOrPremiumActive)) {
        navigate('/plans');
        return;
      }
      setDeity(id);
    },
    [navigate, proOrPremiumActive, unlockPending, setDeity],
  );

  useEffect(() => {
    if (!isAuto || !autoRunning || !deityId) return;
    let cancelled = false;

    const loop = async () => {
      while (!cancelled && autoRunningRef.current) {
        await playMantraOnce(deityId);
        if (cancelled || !autoRunningRef.current) break;
        setCount((n) => n + 1);
      }
      if (!cancelled) {
        setMantraBusy(false);
      }
    };

    setMantraBusy(true);
    void loop();

    return () => {
      cancelled = true;
      stopAllMantras();
    };
  }, [autoRunning, deityId, isAuto]);

  const onManualJapa = useCallback(async () => {
    if (!deityId || manualBusyRef.current) return;
    primeAudio();
    manualBusyRef.current = true;
    setMantraBusy(true);
    await playMantraOnce(deityId);
    setCount((n) => n + 1);
    manualBusyRef.current = false;
    setMantraBusy(false);
  }, [deityId]);

  const onToggleAuto = useCallback(() => {
    primeAudio();
    if (autoRunning) {
      autoRunningRef.current = false;
      setAutoRunning(false);
      stopAllMantras();
      setMantraBusy(false);
      return;
    }
    setCount(0);
    autoRunningRef.current = true;
    setAutoRunning(true);
  }, [autoRunning]);

  const onResetCount = useCallback(() => {
    if (autoRunning) {
      autoRunningRef.current = false;
      setAutoRunning(false);
      stopAllMantras();
      setMantraBusy(false);
    }
    manualBusyRef.current = false;
    setMantraBusy(false);
    setCount(0);
  }, [autoRunning]);

  if (!deityId) {
    return (
      <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-28 overflow-y-auto overflow-x-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 w-full max-w-[min(100%,28rem)] flex flex-col items-center">
          <MenuMatchChantHeader />
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="self-start text-amber-300/90 text-sm mb-4 hover:underline"
          >
            {t('specials.back')}
          </button>
          <h1 className="text-[clamp(1.05rem,4.5vw,1.35rem)] font-bold text-amber-300 text-center mb-1 px-1">
            {t(titleKey)}
          </h1>
          <p className="text-amber-200/80 text-[clamp(0.7rem,3.2vw,0.8rem)] text-center mb-2 max-w-sm px-1">
            {t('specials.japamCounterChooseDeity')}
          </p>
          <p className="text-amber-200/70 text-[10px] text-center mb-2 max-w-sm">{t('specials.japamCounterProGate')}</p>
          {user && unlockPending ? (
            <p className="text-amber-200/75 text-[11px] text-center py-10 w-full">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2 sm:gap-3 w-full">
              {DEITIES.map((d, i) => {
                const locked = !japamCounterDeityAllowed(d.id, proOrPremiumActive);
                return (
                  <motion.button
                    key={d.id}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`relative flex flex-col items-center rounded-2xl overflow-hidden border hover:border-amber-400/50 ${
                      locked ? 'bg-black/30 border-white/15' : 'bg-black/40 border-white/20'
                    }`}
                    onClick={() => handleDeityCardClick(d.id)}
                  >
                    {locked ? (
                      <AccessBadge
                        variant="pro"
                        label={t('pushpa.proGateCard')}
                        className="absolute top-2 right-2 z-[2]"
                      />
                    ) : d.id === FREE_JAPAM_COUNTER_DEITY && !proOrPremiumActive ? (
                      <AccessBadge
                        variant="free"
                        label={t('common.free')}
                        className="absolute top-2 right-2 z-[2]"
                      />
                    ) : null}
                    <div className="w-full aspect-square relative bg-black/30">
                      <img src={d.image} alt="" className={`w-full h-full object-cover ${locked ? 'opacity-55' : ''}`} />
                    </div>
                    <span className="py-2 px-2 text-xs font-semibold text-white truncate w-full text-center">
                      {t(`deities.${d.id}`)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  const deity = getDeity(deityId);
  const manualDisabled = mantraBusy;

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] overflow-y-auto">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center flex-1">
        <MenuMatchChantHeader />
        <button
          type="button"
          onClick={() => {
            stopAllMantras();
            setSearchParams({}, { replace: true });
          }}
          className="self-start text-amber-300/90 text-sm mb-3 hover:underline"
        >
          {t('specials.japamCounterChangeDeity')}
        </button>
        <div className="w-32 h-32 rounded-2xl overflow-hidden border border-amber-500/30 mb-2">
          <img src={deity.image} alt="" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-lg font-bold text-amber-300 text-center mb-0.5">{t(`deities.${deity.id}`)}</h1>
        <p className="text-amber-200/70 text-xs text-center mb-1 max-w-sm leading-snug italic">{deity.mantra}</p>
        <p className="text-amber-200/75 text-[11px] text-center mb-3 max-w-sm">{t(blurbKey)}</p>

        <p
          className="text-[clamp(3rem,18vw,4.5rem)] font-bold text-white tabular-nums leading-none mb-4"
          aria-live="polite"
        >
          {count}
        </p>

        {isAuto ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={onToggleAuto}
            disabled={unlockPending}
            className={`w-full max-w-sm py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50 ${
              autoRunning ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {autoRunning ? t('specials.autoJapamCounterStop') : t('specials.autoJapamCounterStart')}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={manualDisabled ? undefined : { scale: 0.98 }}
            onPointerDown={() => primeAudio()}
            onClick={() => void onManualJapa()}
            disabled={manualDisabled || unlockPending}
            aria-busy={mantraBusy}
            className={`w-full max-w-sm py-4 rounded-2xl font-semibold text-white transition-opacity ${
              manualDisabled ? 'bg-amber-600/50 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400'
            }`}
          >
            {mantraBusy ? t('specials.japamCounterListening') : t('specials.japamCounterTap')}
          </motion.button>
        )}

        {mantraBusy && isAuto ? (
          <p className="mt-2 text-amber-200/60 text-[10px] text-center">{t('specials.japamCounterListening')}</p>
        ) : null}

        <button
          type="button"
          onClick={onResetCount}
          disabled={count === 0 && !autoRunning}
          className="mt-4 text-amber-300/80 text-xs hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {t('specials.japamCounterReset')}
        </button>

        <JapamCounterLeaderboardPanel
          mode={isAuto ? 'auto' : 'manual'}
          deityLabel={t(`deities.${deity.id}`)}
          sessionCount={count}
        />
      </div>
      <BottomNav />
    </div>
  );
}

export function JapamCounterSpecialPage() {
  return <JapamCounterSession mode="manual" />;
}

export function AutoJapamCounterSpecialPage() {
  return <JapamCounterSession mode="auto" />;
}
