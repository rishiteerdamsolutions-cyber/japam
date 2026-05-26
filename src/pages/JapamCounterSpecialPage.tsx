import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { NaturalBackButton } from '../components/nav/NaturalBackButton';
import { currentReturnPath, withReturnTo } from '../lib/navigationReturn';
import { ManualMalaJapaPad } from '../components/japamCounter/ManualMalaJapaPad';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DEITIES, getDeity, type DeityId } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import {
  AUTO_JAPAM_SESSION_TARGET,
  FREE_JAPAM_COUNTER_DEITY,
  japamCounterDeityAllowed,
  MANUAL_JAPAM_COUNTER_INITIAL_COUNT,
  parseJapamCounterDeity,
} from '../lib/japamCounterSpecial';
import { AccessBadge } from '../components/ui/AccessBadge';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { JapamCounterLeaderboardPanel } from '../components/japamCounter/JapamCounterLeaderboardPanel';
import { incrementJapamCounter } from '../lib/japamCounterApi';
import { useManualJapaTouchLock } from '../hooks/useManualJapaTouchLock';
import { pulseMalaBeadTouchHaptic } from '../lib/malaHaptics';
import { ensureMantraPreloaded, playMantraOnce, primeAudio, stopAllMantras } from '../hooks/useSound';
import { useJapaStore } from '../store/japaStore';

type JapamCounterMode = 'manual' | 'auto';

const AUTO_MALA_PREF_KEY = 'japam_auto_counter_show_mala';

function readAutoMalaPref(): boolean {
  try {
    return localStorage.getItem(AUTO_MALA_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function JapamCounterSession({ mode }: { mode: JapamCounterMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const deityId = useMemo(() => parseJapamCounterDeity(searchParams.get('deity')), [searchParams]);
  const isSpecial108Session = searchParams.get('special108') === '1';
  const special108LoggedRef = useRef(false);
  const user = useAuthStore((s) => s.user);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const proOrPremiumActive =
    (tier === 'pro' || tier === 'premium') &&
    hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);
  const unlockPending = Boolean(user?.uid && levelsUnlocked === null);

  const [count, setCount] = useState(MANUAL_JAPAM_COUNTER_INITIAL_COUNT);
  const [mantraBusy, setMantraBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [commitRequest, setCommitRequest] = useState<{ id: number; delta: number } | null>(null);
  const [showAutoMala, setShowAutoMala] = useState(() => (mode === 'auto' ? readAutoMalaPref() : false));
  const autoRunningRef = useRef(false);
  const countRef = useRef(MANUAL_JAPAM_COUNTER_INITIAL_COUNT);
  const japaInFlightRef = useRef(false);
  const prevManualSyncCountRef = useRef(MANUAL_JAPAM_COUNTER_INITIAL_COUNT);

  const isAuto = mode === 'auto';
  const titleKey = isAuto ? 'specials.autoJapamCounterTitle' : 'specials.japamCounterTitle';
  const blurbKey = isAuto ? 'specials.autoJapamCounterBlurb' : 'specials.japamCounterBlurb';

  useEffect(() => {
    return () => {
      autoRunningRef.current = false;
      stopAllMantras();
    };
  }, []);

  useManualJapaTouchLock(!isAuto && Boolean(deityId));

  useEffect(() => {
    if (!deityId || isAuto) return;
    primeAudio();
    ensureMantraPreloaded(deityId);
  }, [deityId, isAuto]);

  useEffect(() => {
    autoRunningRef.current = autoRunning;
  }, [autoRunning]);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const setDeity = useCallback(
    (id: DeityId) => {
      const initial = isAuto ? 0 : MANUAL_JAPAM_COUNTER_INITIAL_COUNT;
      countRef.current = initial;
      setCount(initial);
      setMantraBusy(false);
      setAutoRunning(false);
      setSaveNotice(null);
      setCommitRequest(null);
      autoRunningRef.current = false;
      japaInFlightRef.current = false;
      prevManualSyncCountRef.current = MANUAL_JAPAM_COUNTER_INITIAL_COUNT;
      special108LoggedRef.current = false;
      stopAllMantras();
      setSearchParams(
        isSpecial108Session ? { deity: id, special108: '1' } : { deity: id },
        { replace: true },
      );
    },
    [isAuto, isSpecial108Session, setSearchParams],
  );

  const handleDeityCardClick = useCallback(
    (id: DeityId) => {
      if (unlockPending) return;
      if (!japamCounterDeityAllowed(id, proOrPremiumActive)) {
        navigate('/plans', {
          state: withReturnTo(currentReturnPath(location.pathname, location.search)),
        });
        return;
      }
      setDeity(id);
    },
    [location.pathname, location.search, navigate, proOrPremiumActive, unlockPending, setDeity],
  );

  const toggleShowAutoMala = useCallback(() => {
    setShowAutoMala((on) => {
      const next = !on;
      try {
        localStorage.setItem(AUTO_MALA_PREF_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isAuto || !autoRunning || !deityId) return;
    let cancelled = false;

    const loop = async () => {
      while (!cancelled && autoRunningRef.current && countRef.current < AUTO_JAPAM_SESSION_TARGET) {
        await playMantraOnce(deityId);
        if (cancelled || !autoRunningRef.current) break;
        const next = Math.min(countRef.current + 1, AUTO_JAPAM_SESSION_TARGET);
        countRef.current = next;
        setCount(next);
        if (next >= AUTO_JAPAM_SESSION_TARGET) {
          autoRunningRef.current = false;
          setAutoRunning(false);
        }
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

  const onManualBeadRoll = useCallback(() => {
    if (!deityId || japaInFlightRef.current || countRef.current >= AUTO_JAPAM_SESSION_TARGET) return;
    japaInFlightRef.current = true;

    const next = Math.min(countRef.current + 1, AUTO_JAPAM_SESSION_TARGET);
    countRef.current = next;
    setCount(next);
    pulseMalaBeadTouchHaptic();
    void (async () => {
      try {
        await playMantraOnce(deityId);
      } finally {
        japaInFlightRef.current = false;
      }
    })();
  }, [deityId]);

  useEffect(() => {
    if (isAuto || !deityId || !user?.uid) return;
    if (count <= prevManualSyncCountRef.current) {
      prevManualSyncCountRef.current = count;
      return;
    }
    const delta = count - prevManualSyncCountRef.current;
    prevManualSyncCountRef.current = count;
    void incrementJapamCounter('manual', deityId, delta);
  }, [count, deityId, isAuto, user?.uid]);

  useEffect(() => {
    if (isAuto || !isSpecial108Session || !deityId) return;
    if (count < AUTO_JAPAM_SESSION_TARGET) return;
    if (special108LoggedRef.current) return;
    special108LoggedRef.current = true;
    useJapaStore.getState().addSpecial108JapaCompletion(deityId);
  }, [count, deityId, isAuto, isSpecial108Session]);

  const stopAutoPlayback = useCallback(() => {
    autoRunningRef.current = false;
    setAutoRunning(false);
    stopAllMantras();
    setMantraBusy(false);
  }, []);

  const saveAutoSession = useCallback(
    (delta: number) => {
      if (delta <= 0) return;
      setCommitRequest({ id: Date.now(), delta });
      countRef.current = 0;
      setCount(0);
      setSaveNotice(t('specials.autoJapamCounterSaved'));
    },
    [t],
  );

  const onStartAuto = useCallback(() => {
    primeAudio();
    setSaveNotice(null);
    countRef.current = 0;
    setCount(0);
    autoRunningRef.current = true;
    setAutoRunning(true);
  }, []);

  const onEndAuto = useCallback(() => {
    primeAudio();
    stopAutoPlayback();
    const toSave = countRef.current;
    if (toSave > 0) saveAutoSession(toSave);
  }, [stopAutoPlayback, saveAutoSession]);

  const onCompleteAuto = useCallback(() => {
    stopAutoPlayback();
    const toSave = countRef.current;
    if (toSave > 0) saveAutoSession(toSave);
  }, [stopAutoPlayback, saveAutoSession]);

  const onResetCount = useCallback(() => {
    if (autoRunning) {
      stopAutoPlayback();
    }
    japaInFlightRef.current = false;
    prevManualSyncCountRef.current = MANUAL_JAPAM_COUNTER_INITIAL_COUNT;
    setMantraBusy(false);
    countRef.current = 0;
    setCount(0);
    special108LoggedRef.current = false;
    setSaveNotice(null);
  }, [autoRunning, stopAutoPlayback]);

  if (!deityId) {
    return (
      <div
        className={`relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 sm:p-4 overflow-y-auto overflow-x-hidden ${
          isAuto ? 'pb-[max(6rem,env(safe-area-inset-bottom))] sm:pb-28' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'
        }`}
      >
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 w-full max-w-[min(100%,28rem)] flex flex-col items-center">
          <MenuMatchChantHeader />
          <NaturalBackButton
            fallback="/specials"
            className="self-start text-amber-300/90 text-sm mb-4 hover:underline"
          />
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
        {!isAuto ? null : <BottomNav />}
      </div>
    );
  }

  const deity = getDeity(deityId);

  if (!isAuto) {
    return (
      <div
        className="fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-visible overflow-y-hidden touch-none"
        style={{ overscrollBehavior: 'none' }}
      >
        <div className="absolute inset-0 bg-gloss-bubblegum pointer-events-none" aria-hidden />
        <div
          data-immersive-ui
          className="relative z-10 flex min-h-0 flex-1 flex-col w-full max-w-md mx-auto px-3 overflow-x-visible overflow-y-hidden touch-manipulation"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <MenuMatchChantHeader />
          <button
            type="button"
            onClick={() => {
              stopAllMantras();
              setSearchParams({}, { replace: true });
            }}
            className="shrink-0 self-start text-amber-300/90 text-sm mb-1 hover:underline"
          >
            {t('specials.japamCounterChangeDeity')}
          </button>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-visible pb-1">
            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-amber-500/30">
              <img src={deity.image} alt="" className="w-full h-full object-cover" />
            </div>
            <h1 className="shrink-0 text-base font-bold text-amber-300 text-center leading-tight">
              {t(`deities.${deity.id}`)}
            </h1>
            <p className="shrink-0 text-amber-200/65 text-[10px] text-center max-w-[16rem] leading-snug italic line-clamp-2 px-1">
              {deity.mantra}
            </p>

            <p
              className="shrink-0 text-[clamp(2.75rem,16vw,4rem)] font-bold text-white tabular-nums leading-none text-center"
              aria-live="polite"
              aria-atomic="true"
            >
              {count}
              <span className="text-[0.42em] font-semibold text-amber-200/55">
                {' '}
                / {AUTO_JAPAM_SESSION_TARGET}
              </span>
            </p>
            <div className="relative shrink-0 min-h-[1.35rem] w-full max-w-[18rem] px-2 flex items-center justify-center">
              {count >= AUTO_JAPAM_SESSION_TARGET ? (
                <p
                  className="text-emerald-200/90 text-xs font-semibold text-center leading-snug"
                  role="status"
                >
                  {isSpecial108Session
                    ? t('specials.japamCounterSessionComplete108', {
                        defaultValue: '108 japas complete — session finished.',
                      })
                    : t('specials.japamCounterSessionComplete', {
                        defaultValue: 'Session complete.',
                      })}
                </p>
              ) : (
                <p className="text-amber-200/55 text-[10px] text-center leading-snug max-w-[16rem]">
                  {t('specials.japamCounterMalaHint', {
                    defaultValue: 'Roll the digital japa mala — one bead, one japa.',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className="relative z-20 shrink-0 w-full max-w-md mx-auto flex justify-center overflow-visible"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <ManualMalaJapaPad
            className={count >= AUTO_JAPAM_SESSION_TARGET ? 'opacity-45' : ''}
            onBead={onManualBeadRoll}
            sessionCount={count}
            sessionCountRef={countRef}
            japaInFlightRef={japaInFlightRef}
            disabled={unlockPending || count >= AUTO_JAPAM_SESSION_TARGET}
            sessionTarget={AUTO_JAPAM_SESSION_TARGET}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] overflow-y-auto">
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
        <div className="w-32 h-32 rounded-2xl overflow-hidden border border-amber-500/30 mb-2 mx-auto">
          <img src={deity.image} alt="" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-lg font-bold text-amber-300 text-center mb-0.5">{t(`deities.${deity.id}`)}</h1>
        <p className="text-amber-200/70 text-xs text-center mb-1 max-w-sm leading-snug italic mx-auto">
          {deity.mantra}
        </p>
        <p className="text-amber-200/75 text-[11px] text-center mb-3 max-w-sm mx-auto">{t(blurbKey)}</p>

        <p
          className="text-[clamp(3rem,18vw,4.5rem)] font-bold text-white tabular-nums leading-none mb-1 text-center"
          aria-live="polite"
        >
          {count}
          <span className="text-[clamp(1.25rem,6vw,1.75rem)] text-amber-200/55 font-semibold">
            {' '}
            / {AUTO_JAPAM_SESSION_TARGET}
          </span>
        </p>
        <p className="text-amber-200/65 text-[10px] text-center mb-3 max-w-sm leading-snug mx-auto">
          {count >= AUTO_JAPAM_SESSION_TARGET && !autoRunning
            ? t('specials.autoJapamCounterPaused')
            : t('specials.autoJapamCounterTargetNote')}
        </p>

        <label className="flex items-center justify-center gap-2 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAutoMala}
            onChange={toggleShowAutoMala}
            className="accent-amber-500 w-4 h-4"
          />
          <span className="text-amber-200/85 text-xs">{t('specials.autoJapamCounterShowMala')}</span>
        </label>

        {showAutoMala ? (
          <div className="w-full flex justify-center mb-4 -mt-1">
            <ManualMalaJapaPad
              displayOnly
              autoSpinOnCount={count}
              sessionCount={count}
              sessionCountRef={countRef}
              sessionTarget={AUTO_JAPAM_SESSION_TARGET}
              className={autoRunning ? 'opacity-100' : 'opacity-90'}
            />
          </div>
        ) : null}

        <div className="w-full max-w-sm flex flex-col gap-2 mx-auto">
          {autoRunning ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={onEndAuto}
              disabled={unlockPending}
              className="w-full py-3.5 rounded-2xl font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
            >
              {t('specials.autoJapamCounterStop')}
            </motion.button>
          ) : count > 0 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={onCompleteAuto}
              disabled={unlockPending}
              className="w-full py-3.5 rounded-2xl font-semibold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50"
            >
              {count >= AUTO_JAPAM_SESSION_TARGET
                ? t('specials.autoJapamCounterComplete')
                : t('specials.autoJapamCounterSaveSession')}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={onStartAuto}
              disabled={unlockPending}
              className="w-full py-3.5 rounded-2xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              {t('specials.autoJapamCounterStart')}
            </motion.button>
          )}
        </div>

        {mantraBusy ? (
          <p className="mt-2 text-amber-200/60 text-[10px] text-center">{t('specials.japamCounterListening')}</p>
        ) : null}
        {saveNotice ? (
          <p className="mt-2 text-emerald-200/85 text-[11px] text-center" role="status">
            {saveNotice}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onResetCount}
          disabled={count === 0 && !autoRunning}
          className="mt-4 text-amber-300/80 text-xs hover:underline disabled:opacity-40 disabled:no-underline mx-auto block"
        >
          {t('specials.japamCounterReset')}
        </button>

        <JapamCounterLeaderboardPanel
          mode="auto"
          deityId={deity.id}
          deityLabel={t(`deities.${deity.id}`)}
          sessionCount={count}
          syncMode="commit"
          commitRequest={commitRequest}
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
