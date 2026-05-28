import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { NaturalBackButton } from '../components/nav/NaturalBackButton';
import { currentReturnPath, withReturnTo } from '../lib/navigationReturn';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DEITIES, type DeityId } from '../data/deities';
import { useJapaStore } from '../store/japaStore';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import { AccessBadge } from '../components/ui/AccessBadge';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { PushableButton } from '../components/ui/PushableButton';
import { pushableFullWidthFrontClass } from '../lib/landingCtaStyles';
import { CTA } from '../lib/ctaCopy';

/** Free path for 108 Japa special (Pro unlocks all deities). */
const FREE_JAPA_108_DEITY: DeityId = 'shakthi';

function japa108DeityAllowedForUser(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === FREE_JAPA_108_DEITY) return true;
  return proOrPremiumActive;
}

function parseDeity(raw: string | null): DeityId | null {
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as DeityId;
  return DEITIES.some((d) => d.id === id) ? id : null;
}

export function Japa108SpecialPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const deityId = useMemo(() => parseDeity(searchParams.get('deity')), [searchParams]);
  const user = useAuthStore((s) => s.user);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const proOrPremiumActive =
    (tier === 'pro' || tier === 'premium') &&
    hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);
  const unlockPending = Boolean(user?.uid && levelsUnlocked === null);

  const special108Total = useJapaStore((s) => s.counts.special108JapaTotal ?? 0);
  const special108ForDeity = useJapaStore((s) =>
    deityId ? (s.counts.special108JapaByDeity?.[deityId] ?? 0) : 0,
  );

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    void useJapaStore.getState().load(uid);
  }, [user?.uid]);

  const setDeity = useCallback(
    (id: DeityId) => {
      setSearchParams({ deity: id }, { replace: true });
    },
    [setSearchParams],
  );

  const handleDeityCardClick = useCallback(
    (id: DeityId) => {
      if (unlockPending) return;
      if (!japa108DeityAllowedForUser(id, proOrPremiumActive)) {
        navigate('/plans', {
          state: withReturnTo(currentReturnPath(location.pathname, location.search)),
        });
        return;
      }
      setDeity(id);
    },
    [location.pathname, location.search, navigate, proOrPremiumActive, unlockPending, setDeity],
  );

  const startGame = () => {
    if (!deityId || unlockPending) return;
    if (!japa108DeityAllowedForUser(deityId, proOrPremiumActive)) {
      navigate('/plans', {
        state: withReturnTo(currentReturnPath(location.pathname, location.search)),
      });
      return;
    }
    navigate(
      `/game?mode=${encodeURIComponent(deityId)}&level=0&special108=1&target=108`,
      {
        state: withReturnTo(currentReturnPath(location.pathname, location.search)),
      },
    );
  };

  if (!deityId) {
    return (
      <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-28 overflow-y-auto overflow-x-hidden">
        <div className="relative z-10 w-full max-w-[min(100%,28rem)] flex flex-col items-center">
          <MenuMatchChantHeader />
          <NaturalBackButton
            fallback="/specials"
            className="self-start text-amber-300/90 text-sm mb-4 hover:underline"
          />
          <h1 className="text-[clamp(1.05rem,4.5vw,1.35rem)] font-bold text-amber-300 text-center mb-1 px-1">
            {t('specials.japa108Title')}
          </h1>
          <p className="text-amber-200/80 text-[clamp(0.7rem,3.2vw,0.8rem)] text-center mb-2 max-w-sm px-1">
            {t('specials.japa108ChooseDeity')}
          </p>
          <p className="text-amber-200/70 text-[10px] text-center mb-2 max-w-sm">{t('specials.japa108ProGate')}</p>
          {user ? (
            <p className="text-amber-200/80 text-[11px] text-center mb-3 tabular-nums">
              {t('specials.japa108TotalSessions', { n: special108Total })}
            </p>
          ) : null}
          {user && unlockPending ? (
            <p className="text-amber-200/75 text-[11px] text-center py-10 w-full">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2 sm:gap-3 w-full">
              {DEITIES.map((d, i) => {
                const locked = !japa108DeityAllowedForUser(d.id, proOrPremiumActive);
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
                    ) : d.id === FREE_JAPA_108_DEITY && !proOrPremiumActive ? (
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

  const deity = DEITIES.find((d) => d.id === deityId)!;

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] overflow-y-auto">
      <div className="relative z-10 w-full max-w-md flex flex-col items-center flex-1">
        <MenuMatchChantHeader />
        <button
          type="button"
          onClick={() => setSearchParams({}, { replace: true })}
          className="self-start text-amber-300/90 text-sm mb-3 hover:underline"
        >
          {t('specials.japa108ChangeDeity')}
        </button>
        <div className="w-40 h-40 rounded-2xl overflow-hidden border border-amber-500/30 mb-3">
          <img src={deity.image} alt="" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-lg font-bold text-amber-300 text-center mb-1">{t(`deities.${deity.id}`)}</h1>
        <p className="text-amber-200/80 text-sm text-center mb-1">{t('specials.japa108Blurb')}</p>
        <p className="text-amber-200/70 text-xs tabular-nums mb-4">
          {t('specials.japa108YourCompletions', { n: special108ForDeity })}
        </p>
        <PushableButton
          type="button"
          fullWidth
          onClick={startGame}
          disabled={unlockPending}
          className="max-w-sm"
          frontClassName={pushableFullWidthFrontClass}
        >
          {CTA.specials.japa108Start}
        </PushableButton>
        {user && special108ForDeity > 0 ? (
          <p className="mt-2 text-amber-200/70 text-xs text-center max-w-sm">
            {t('specials.japa108DownloadHint')}
          </p>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
