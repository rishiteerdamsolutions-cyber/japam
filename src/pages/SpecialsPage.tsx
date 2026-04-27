import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AppFooter } from '../components/layout/AppFooter';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { LAUNCH_FEATURE_OCCASION_GAMES } from '../config/launchFeatures';
import { landingStartJapaButtonClass, landingTryJapaButtonClass } from '../lib/landingCtaStyles';

export function SpecialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
            onClick={() => navigate('/pushpa-aradhana')}
            className={`${landingStartJapaButtonClass} w-full min-h-[3rem] inline-flex items-center justify-center px-3`}
          >
            <span className="text-white font-bold text-sm sm:text-base text-center">{t('specials.pushpaAradhana')}</span>
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
