import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { currentReturnPath, withReturnTo } from '../lib/navigationReturn';
import { NaturalBackButton } from '../components/nav/NaturalBackButton';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { isFirebaseConfigured } from '../lib/firebase';
import { trackProductUsage } from '../lib/productUsage';
import { CTA } from '../lib/ctaCopy';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import {
  SpecialsCategoryPanel,
  SpecialsDualOption,
  SpecialsFeaturedCard,
  SpecialsIcon108Once,
  SpecialsIcon108Weekly,
  SpecialsIconAuto,
  SpecialsIconManual,
  SpecialsIconTwoPlayer,
  SpecialsOptionTile,
} from '../components/specials/SpecialsHub';

export function SpecialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const openWithAuth = useCallback(
    async (path: string, usageKey?: string) => {
      if (usageKey) trackProductUsage(usageKey);
      if (isFirebaseConfigured && !user) {
        await signInWithGoogle();
        if (!useAuthStore.getState().user) return;
      }
      navigate(path, {
        state: withReturnTo(currentReturnPath(location.pathname, location.search)),
      });
    },
    [location.pathname, location.search, navigate, signInWithGoogle, user],
  );

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] overflow-y-auto overflow-x-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-stretch">
        <MenuMatchChantHeader />
        <NaturalBackButton fallback="/menu" className="self-start text-amber-300/90 text-sm mb-3 hover:underline py-1" />
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 text-center px-1"
        >
          <h1 className="text-xl font-bold text-amber-400" style={{ fontFamily: 'serif' }}>
            {t('specials.title')}
          </h1>
          <p className="text-amber-200/60 text-[11px] mt-1 leading-snug">{t('specials.hubSubtitle')}</p>
        </motion.div>

        <div className="flex flex-col gap-4 w-full">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
            <SpecialsFeaturedCard
              title={CTA.specials.pushpaAradhana}
              subtitle={t('specials.hubPushpaBlurb')}
              icon="🌸"
              onClick={() => void openWithAuth('/pushpa-aradhana', 'action_specials_pushpa')}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <SpecialsCategoryPanel
              title={t('specials.hub108Title')}
              subtitle={t('specials.hub108Subtitle')}
              tone="amber"
              badge="108"
            >
              <SpecialsDualOption
                variant="amber"
                left={{
                  label: CTA.specials.hub108OneTime,
                  hint: CTA.specials.hub108OneTimeHint,
                  icon: <SpecialsIcon108Once />,
                  onClick: () => void openWithAuth('/special-108-japa', 'action_specials_108_once'),
                }}
                right={{
                  label: CTA.specials.hub108Weekly,
                  hint: CTA.specials.hub108WeeklyHint,
                  icon: <SpecialsIcon108Weekly />,
                  onClick: () => void openWithAuth('/weekly-streak', 'action_specials_108_weekly'),
                }}
              />
            </SpecialsCategoryPanel>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <SpecialsCategoryPanel
              title={t('specials.hubCounterTitle')}
              subtitle={t('specials.hubCounterSubtitle')}
              tone="emerald"
            >
              <SpecialsDualOption
                variant="emerald"
                left={{
                  label: CTA.specials.hubCounterManual,
                  hint: CTA.specials.hubCounterManualHint,
                  icon: <SpecialsIconManual />,
                  onClick: () => void openWithAuth('/special-japam-counter', 'action_specials_counter_manual'),
                }}
                right={{
                  label: CTA.specials.hubCounterAuto,
                  hint: CTA.specials.hubCounterAutoHint,
                  icon: <SpecialsIconAuto />,
                  onClick: () => void openWithAuth('/special-auto-japam-counter', 'action_specials_counter_auto'),
                }}
              />
            </SpecialsCategoryPanel>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <SpecialsCategoryPanel
              title={t('specials.hubOccasionsTitle')}
              headerTag={CTA.specials.twoPlayerGame}
              subtitle={t('specials.hubOccasionsSubtitle')}
              tone="muted"
            >
              <div className="max-w-[11rem] mx-auto">
                <SpecialsOptionTile
                  label={CTA.specials.twoPlayerGame}
                  hint={CTA.specials.anniversaryComingSoonHint}
                  icon={<SpecialsIconTwoPlayer />}
                  disabled
                  variant="muted"
                />
              </div>
            </SpecialsCategoryPanel>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
