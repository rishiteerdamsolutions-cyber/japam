import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import { isFirebaseConfigured } from '../lib/firebase';
import { AppFooter } from '../components/layout/AppFooter';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { AccessBadge } from '../components/ui/AccessBadge';
import { LAUNCH_FEATURE_OCCASION_GAMES } from '../config/launchFeatures';
import { landingStartJapaButtonClass, landingTryJapaButtonClass } from '../lib/landingCtaStyles';

/** Same badges as Marathons / Maha Yāgā / Pushpa deity cards: Free path + Pro for full access. */
function SpecialsFreemiumBadges() {
  const { t } = useTranslation();
  return (
    <span className="absolute top-2 right-2 z-[2] flex flex-col gap-1 items-end pointer-events-none">
      <AccessBadge variant="free" label={t('common.free')} size="sm" />
      <AccessBadge variant="pro" label={t('menu.pro')} size="sm" />
    </span>
  );
}

export function SpecialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const loadUnlock = useUnlockStore((s) => s.load);

  useEffect(() => {
    if (user?.uid) void loadUnlock(user.uid);
  }, [user?.uid, loadUnlock]);

  const proOrPremiumActive =
    (tier === 'pro' || tier === 'premium') &&
    hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);
  /** Match MahaYagnasPage / MarathonsPage: hide corner badges once paid window is active. */
  const showFreemiumBadges = !proOrPremiumActive;

  /** Stay on Specials during Google popup, then open the feature (same pattern as main menu). */
  const openPushpaAradhana = async () => {
    if (isFirebaseConfigured && !user) {
      await signInWithGoogle();
      if (!useAuthStore.getState().user) return;
    }
    navigate('/pushpa-aradhana');
  };

  const openJapa108 = async () => {
    if (isFirebaseConfigured && !user) {
      await signInWithGoogle();
      if (!useAuthStore.getState().user) return;
    }
    navigate('/special-108-japa');
  };

  const openWeeklyStreak = async () => {
    if (isFirebaseConfigured && !user) {
      await signInWithGoogle();
      if (!useAuthStore.getState().user) return;
    }
    navigate('/weekly-streak');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        <MenuMatchChantHeader />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start text-amber-300/90 text-sm mb-4 hover:underline py-1"
        >
          {t('specials.back')}
        </button>
        <h1 className="text-xl font-bold text-amber-400 mb-6 text-center px-2" style={{ fontFamily: 'serif' }}>
          {t('specials.title')}
        </h1>

        <div className="w-full flex flex-col gap-3 max-w-sm">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            onClick={openPushpaAradhana}
            className={`relative ${landingStartJapaButtonClass} w-full min-h-[3rem] inline-flex items-center justify-center px-3`}
          >
            {showFreemiumBadges ? <SpecialsFreemiumBadges /> : null}
            <span className="text-white font-bold text-sm sm:text-base text-center px-10">{t('specials.pushpaAradhana')}</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            onClick={openJapa108}
            className={`relative ${landingStartJapaButtonClass} w-full min-h-[3rem] inline-flex items-center justify-center px-3`}
          >
            {showFreemiumBadges ? <SpecialsFreemiumBadges /> : null}
            <span className="text-white font-bold text-sm sm:text-base text-center px-10">{t('specials.japa108')}</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            onClick={openWeeklyStreak}
            className={`relative ${landingStartJapaButtonClass} w-full min-h-[3rem] inline-flex items-center justify-center px-3`}
          >
            {showFreemiumBadges ? <SpecialsFreemiumBadges /> : null}
            <span className="text-white font-bold text-sm sm:text-base text-center px-10">{t('specials.weeklyStreak')}</span>
          </motion.button>

          <motion.button
            type="button"
            disabled
            title={t('specials.comingSoon')}
            className={`${landingTryJapaButtonClass} w-full min-h-[3rem] inline-flex items-center justify-center px-3 opacity-60 cursor-not-allowed`}
          >
            <span className="text-sm sm:text-base text-center">
              {t('specials.happyBirthday')} · <span className="text-amber-300/90">{t('specials.comingSoon')}</span>
            </span>
          </motion.button>

          <motion.button
            type="button"
            disabled={!LAUNCH_FEATURE_OCCASION_GAMES}
            title={LAUNCH_FEATURE_OCCASION_GAMES ? t('specials.comingSoon') : undefined}
            className={`${landingTryJapaButtonClass} w-full min-h-[3rem] inline-flex items-center justify-center px-3 opacity-60 cursor-not-allowed`}
          >
            <span className="text-sm sm:text-base text-center">
              {t('specials.anniversary')} · <span className="text-amber-300/90">{t('specials.comingSoon')}</span>
            </span>
          </motion.button>
        </div>

        <div className="flex-1 min-h-16" />
        <AppFooter />
        <BottomNav />
      </div>
    </div>
  );
}
