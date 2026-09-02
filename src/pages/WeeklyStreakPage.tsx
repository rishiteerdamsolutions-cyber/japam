import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NaturalBackButton } from '../components/nav/NaturalBackButton';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DEITY_IDS, type DeityId } from '../data/deities';
import { istWeekYmdsFromMonday, istYmdFromDate, istWeekdayShortFromYmd, istIsoWeekdayMon1Sun7FromYmd } from '../lib/weeklyStreakIst';
import type { StreakIsoWeekday } from '../lib/weeklyStreakPlan';
import { FREE_WEEKLY_STREAK_DEITY, FREE_WEEKLY_STREAK_DEITY_ID } from '../lib/weeklyStreakPlan';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import { useUnlockStore } from '../store/unlockStore';
import { useWeeklyStreakStore, type WeeklyStreakProPlan } from '../store/weeklyStreakStore';
import { BottomNav } from '../components/nav/BottomNav';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { AccessBadge } from '../components/ui/AccessBadge';

const WEEKDAYS: { key: StreakIsoWeekday; label: string }[] = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 7, label: 'Sun' },
];

export function WeeklyStreakPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);

  const hydrate = useWeeklyStreakStore((s) => s.hydrate);
  const trackedWeekMondayIst = useWeeklyStreakStore((s) => s.trackedWeekMondayIst);
  const proPlanByWeekday = useWeeklyStreakStore((s) => s.proPlanByWeekday);
  const proNextWeekPlan = useWeeklyStreakStore((s) => s.proNextWeekPlan);
  const setProCurrentPlan = useWeeklyStreakStore((s) => s.setProCurrentPlan);
  const setProNextWeekPlan = useWeeklyStreakStore((s) => s.setProNextWeekPlan);
  const deityForYmd = useWeeklyStreakStore((s) => s.deityForYmd);
  const isDayDone = useWeeklyStreakStore((s) => s.isDayDone);

  const [draftCurrent, setDraftCurrent] = useState<WeeklyStreakProPlan>({});
  const [draftNext, setDraftNext] = useState<WeeklyStreakProPlan>({});
  const proActive =
    (tier === 'pro' || tier === 'premium') && hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) hydrate(proActive);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [hydrate, proActive]);

  useEffect(() => {
    setDraftCurrent({ ...(proPlanByWeekday ?? {}) });
    setDraftNext({ ...(proNextWeekPlan ?? {}) });
  }, [proPlanByWeekday, proNextWeekPlan]);

  const weekYmds = useMemo(() => istWeekYmdsFromMonday(trackedWeekMondayIst), [trackedWeekMondayIst]);
  const todayIst = istYmdFromDate();
  const startGamePath = (deityId: DeityId) =>
    `/game?mode=${encodeURIComponent(deityId)}&level=0&weeklyStreak=1&target=108`;

  const onSaveCurrentPlan = () => {
    setProCurrentPlan(draftCurrent);
  };
  const onSaveNextPlan = () => {
    setProNextWeekPlan(draftNext);
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] overflow-y-auto overflow-x-hidden">
      <div className="relative z-10 w-full max-w-md flex flex-col flex-1 min-w-0">
        <MenuMatchChantHeader />
        <NaturalBackButton fallback="/specials" className="self-start text-amber-300/90 text-sm mb-3 hover:underline" />
        <h1 className="text-lg font-bold text-amber-300 text-center mb-1 px-1">{t('weeklyStreak.title')}</h1>
        <p className="text-amber-200/75 text-[11px] text-center mb-4 px-1 leading-snug">{t('weeklyStreak.subtitle')}</p>

        <p className="text-amber-200/60 text-[10px] mb-3 text-center">{t('weeklyStreak.istNote')}</p>

        <section className="w-full mb-4 rounded-xl border border-emerald-500/25 bg-black/25 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <AccessBadge variant="free" label={t('common.free')} size="sm" />
            <h2 className="text-emerald-100/95 text-sm font-bold">{t('weeklyStreak.freeSectionTitle')}</h2>
          </div>
          <p className="text-amber-200/75 text-[11px] leading-snug mb-3">
            {t('weeklyStreak.freeSectionBody', { deity: t(`deities.${FREE_WEEKLY_STREAK_DEITY_ID}`) })}
          </p>
          <p className="text-amber-300/90 text-[10px] font-semibold mb-1.5">{t('weeklyStreak.defaultMapHeading')}</p>
          <ul className="space-y-1 text-amber-200/85 text-[11px]">
            {WEEKDAYS.map(({ key, label }) => (
              <li key={key} className="flex justify-between gap-2 min-w-0">
                <span className="shrink-0 text-amber-200/60">{label}</span>
                <span className="truncate text-right">{t(`deities.${FREE_WEEKLY_STREAK_DEITY[key]}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <h2 className="text-amber-300/95 text-sm font-bold mb-2 w-full">{t('weeklyStreak.thisWeekTitle')}</h2>

        <div className="w-full space-y-2 mb-4">
          {weekYmds.map((ymd, idx) => {
            const wd = Number(istIsoWeekdayMon1Sun7FromYmd(ymd)) as StreakIsoWeekday;
            const usesProPlanRow = proActive && Boolean(proPlanByWeekday?.[wd]);
            const wdLabel = WEEKDAYS[idx]!;
            const deityId = deityForYmd(ymd, proActive);
            const done = isDayDone(ymd);
            const isToday = ymd === todayIst;
            return (
              <div
                key={ymd}
                className={`rounded-xl border p-3 min-w-0 ${
                  isToday ? 'border-amber-400/50 bg-black/35' : 'border-white/15 bg-black/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-amber-400 text-xs font-semibold">
                      {wdLabel.label} · {istWeekdayShortFromYmd(ymd)}{' '}
                      <span className="text-amber-200/50 font-normal tabular-nums">{ymd}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 min-w-0">
                      <AccessBadge
                        variant={usesProPlanRow ? 'pro' : 'free'}
                        label={usesProPlanRow ? t('menu.pro') : t('common.free')}
                        size="xs"
                      />
                      <p className="text-amber-100 text-sm font-medium truncate">{t(`deities.${deityId}`)}</p>
                    </div>
                    <p className="text-amber-200/55 text-[10px] mt-0.5">
                      {done ? t('weeklyStreak.done') : isToday ? t('weeklyStreak.today') : t('weeklyStreak.pending')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    {isToday && !done ? (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(startGamePath(deityId))}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold text-center"
                      >
                        {t('weeklyStreak.play108')}
                      </motion.button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="w-full mb-4 text-amber-200/70 text-[11px] text-center leading-snug px-1">
          {t('weeklyStreak.downloadOnJapaDashboard', {
            defaultValue:
              'Download 108-japa PDFs (your handwriting) and the week progress card from Japa count → Weekly streak at the bottom.',
          })}
        </p>

        <section className="w-full mb-6 space-y-3 rounded-xl border border-amber-500/25 bg-black/25 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <AccessBadge variant="pro" label={t('menu.pro')} size="sm" />
            <h2 className="text-amber-200/95 text-sm font-bold">{t('weeklyStreak.proSectionTitle')}</h2>
          </div>
          <p className="text-amber-200/70 text-[11px] leading-snug">{t('weeklyStreak.proSectionBody')}</p>

          {proActive ? (
            <div className="space-y-4 pt-1">
              <p className="text-amber-300 text-xs font-semibold">{t('weeklyStreak.proPlanTitle')}</p>
              <p className="text-amber-200/70 text-[10px] leading-snug">{t('weeklyStreak.proPlanHelp')}</p>
              <div className="space-y-2">
                <p className="text-amber-200/90 text-[11px] font-medium">{t('weeklyStreak.proThisWeek')}</p>
                {WEEKDAYS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-[11px] text-amber-200/90">
                    <span className="w-8 shrink-0">{label}</span>
                    <select
                      value={draftCurrent[key] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value as DeityId | '';
                        setDraftCurrent((prev) => {
                          const n = { ...prev };
                          if (!v) delete n[key];
                          else n[key] = v;
                          return n;
                        });
                      }}
                      className="flex-1 min-w-0 rounded-lg bg-black/40 text-white border border-white/15 text-xs py-1.5 px-2"
                    >
                      <option value="">{t('weeklyStreak.useDefault')}</option>
                      {DEITY_IDS.map((id) => (
                        <option key={id} value={id}>
                          {t(`deities.${id}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={onSaveCurrentPlan}
                  className="w-full py-2 rounded-lg bg-amber-500/90 text-white text-xs font-semibold"
                >
                  {t('weeklyStreak.saveThisWeek')}
                </button>
              </div>
              <div className="space-y-2 pt-2 border-t border-white/10">
                <p className="text-amber-200/90 text-[11px] font-medium">{t('weeklyStreak.proNextWeek')}</p>
                {WEEKDAYS.map(({ key, label }) => (
                  <label key={`n-${key}`} className="flex items-center gap-2 text-[11px] text-amber-200/90">
                    <span className="w-8 shrink-0">{label}</span>
                    <select
                      value={draftNext[key] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value as DeityId | '';
                        setDraftNext((prev) => {
                          const n = { ...prev };
                          if (!v) delete n[key];
                          else n[key] = v;
                          return n;
                        });
                      }}
                      className="flex-1 min-w-0 rounded-lg bg-black/40 text-white border border-white/15 text-xs py-1.5 px-2"
                    >
                      <option value="">{t('weeklyStreak.useDefault')}</option>
                      {DEITY_IDS.map((id) => (
                        <option key={id} value={id}>
                          {t(`deities.${id}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={onSaveNextPlan}
                  className="w-full py-2 rounded-lg bg-amber-600/80 text-white text-xs font-semibold"
                >
                  {t('weeklyStreak.saveNextWeek')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-amber-200/65 text-[11px] leading-snug">{t('weeklyStreak.proUpsellBody')}</p>
              <button
                type="button"
                onClick={() => navigate('/plans')}
                className="w-full py-2.5 rounded-xl bg-amber-500/90 text-white text-xs font-semibold"
              >
                {t('weeklyStreak.proUpsellCta')}
              </button>
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
