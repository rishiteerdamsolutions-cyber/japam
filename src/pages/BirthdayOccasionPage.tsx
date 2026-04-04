import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AppHeader } from '../components/layout/AppHeader';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import type { GameMode } from '../types';
import { setOccasionEntryGate } from '../lib/occasionEntryGate';

const TARGET = 108;

export function BirthdayOccasionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const go = (mode: GameMode, levelIndex = 0) => {
    if (!user) {
      navigate('/signin');
      return;
    }
    setOccasionEntryGate('birthday');
    navigate(
      `/game?occasion=birthday&mode=${encodeURIComponent(mode)}&level=${levelIndex}&target=${TARGET}`,
    );
  };

  return (
    <div className="relative min-h-screen p-4 pb-24 max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
        <AppHeader title={t('occasions.birthdayTitle')} showBack onBack={() => navigate('/')} />
        <p className="text-amber-200/85 text-sm mb-4">{t('occasions.birthdayIntro', { count: TARGET })}</p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => go('general', 0)}
          className="w-full mb-3 py-3 rounded-2xl bg-amber-500/25 border border-amber-500/50 text-amber-300 font-semibold"
        >
          {t('menu.generalJapa')}
        </motion.button>
        <p className="text-amber-200/70 text-xs uppercase tracking-wider mb-2">{t('menu.istaDevata')}</p>
        <div className="grid grid-cols-2 gap-2">
          {DEITIES.map((d) => (
            <motion.button
              key={d.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => go(d.id as GameMode, 0)}
              className="py-2.5 rounded-xl bg-black/25 border border-amber-500/30 text-amber-200 text-sm"
            >
              {d.name}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
