import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CTA } from '../lib/ctaCopy';
import { PushableButton } from '../components/ui/PushableButton';
import { pushableCompactFrontClass, pushableFullWidthFrontClass } from '../lib/landingCtaStyles';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { BottomNav } from '../components/nav/BottomNav';
import { Paywall } from '../components/payment/Paywall';
import { DonateModal } from '../components/donation/DonateModal';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess, getProfileRingFlags } from '../lib/membershipDisplay';
import { isFirebaseConfigured } from '../lib/firebase';
import { loadPricingConfig } from '../lib/firestore';
import { trackProductUsage } from '../lib/productUsage';

function PlanFeature({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-snug text-amber-50/90">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] text-emerald-300"
        aria-hidden
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function PriceBlock({
  displayRupees,
  priceRupees,
  periodLabel,
}: {
  displayRupees: string | null;
  priceRupees: string | null;
  periodLabel: string;
}) {
  const showStrike = displayRupees && priceRupees && displayRupees !== priceRupees;
  return (
    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
      {showStrike ? (
        <span className="text-lg text-amber-200/45 line-through tabular-nums">₹{displayRupees}</span>
      ) : null}
      <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
        ₹{priceRupees ?? '—'}
      </span>
      <span className="text-sm font-medium text-amber-200/65">{periodLabel}</span>
    </div>
  );
}

/**
 * Pro (unlock / monthly dakshina) vs Premium (dakshina to fund the mission) — one place to read and pay.
 */
export function PlansDakshinaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signInPending } = useAuthStore();
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const isDonor = useUnlockStore((s) => s.isDonor);
  const loadUnlock = useUnlockStore((s) => s.load);

  const [showProPay, setShowProPay] = useState(false);
  const [showPremiumDonate, setShowPremiumDonate] = useState(false);
  const [priceRupees, setPriceRupees] = useState<string | null>(null);
  const [displayRupees, setDisplayRupees] = useState<string | null>(null);
  const [priceLoaded, setPriceLoaded] = useState(false);

  const accessActive = hasActivePaidAccess(levelsUnlocked, unlockExpiresAt);
  const { showProRing, showPremiumRing } = getProfileRingFlags({
    tier,
    levelsUnlocked,
    unlockExpiresAt,
    isDonor,
  });
  const isProMember = showProRing;
  const isPremiumMember = showPremiumRing;
  const canDonateForPremium = accessActive && tier === 'pro' && !isPremiumMember;

  useEffect(() => {
    let c = false;
    loadPricingConfig()
      .then((config) => {
        if (c) return;
        const p = config.unlockPricePaise;
        const d = config.displayPricePaise;
        setPriceRupees((typeof p === 'number' && p >= 100 ? p / 100 : 108).toFixed(0));
        setDisplayRupees((typeof d === 'number' && d >= 100 ? d / 100 : 99).toFixed(0));
        setPriceLoaded(true);
      })
      .catch(() => {
        if (!c) {
          setPriceRupees('108');
          setDisplayRupees('99');
          setPriceLoaded(true);
        }
      });
    return () => {
      c = true;
    };
  }, []);

  const refreshUnlock = useCallback(async () => {
    if (user?.uid) await loadUnlock(user.uid);
  }, [loadUnlock, user]);

  const onUnlocked = async () => {
    setShowProPay(false);
    await refreshUnlock();
  };

  const periodLabel = `/ ${t('plans.monthlyDakshina')}`;

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full max-w-lg mx-auto px-4 pt-3 gap-4 overflow-y-auto overscroll-contain">
        <MenuMatchChantHeader className="!mb-0 shrink-0" />

        <div className="shrink-0 text-center px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/70 mb-1.5">
            {t('plans.eyebrow')}
          </p>
          <h1 className="text-[1.35rem] sm:text-2xl font-bold text-white leading-tight" style={{ fontFamily: 'serif' }}>
            {t('plans.heroTitle')}
          </h1>
          <p className="text-amber-200/75 text-sm leading-relaxed mt-2 max-w-[20rem] mx-auto">
            {t('plans.heroSubtitle')}
          </p>
          <p className="text-amber-200/45 text-[11px] mt-2">{t('plans.trustLine')}</p>
        </div>

        {loading ? <p className="text-amber-200/60 text-sm text-center shrink-0">…</p> : null}

        {/* Pro — primary offer */}
        <section
          className="shrink-0 relative overflow-hidden rounded-2xl border border-emerald-400/35 bg-gradient-to-b from-emerald-950/50 via-black/35 to-black/45 p-4 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.35)]"
          aria-labelledby="plans-pro-heading"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-200 bg-emerald-500/25 px-2 py-0.5 rounded-full">
              {t('plans.proBadge')}
            </span>
            {user && isProMember && !isPremiumMember && (
              <span className="text-[10px] font-semibold text-green-300/90 px-2 py-0.5 rounded-full bg-green-500/20">
                {t('plans.statusActive')}
              </span>
            )}
            {user && isPremiumMember && (
              <span className="text-[10px] font-semibold text-amber-300/90 px-2 py-0.5 rounded-full bg-amber-500/20">
                {t('menu.premium')}
              </span>
            )}
          </div>
          <h2 id="plans-pro-heading" className="relative text-xl font-bold text-emerald-300 mb-1">
            {t('plans.proTitleShort')}
          </h2>
          <p className="relative text-amber-100/80 text-sm mb-4">{t('plans.proTagline')}</p>

          {user && !isProMember && !isPremiumMember && !accessActive && priceLoaded && (
            <div className="relative mb-4">
              <PriceBlock displayRupees={displayRupees} priceRupees={priceRupees} periodLabel={periodLabel} />
            </div>
          )}

          <ul className="relative space-y-2.5 mb-4">
            <PlanFeature>{t('plans.proBullet1')}</PlanFeature>
            <PlanFeature>{t('plans.proBullet2')}</PlanFeature>
            <PlanFeature>{t('plans.proBullet3')}</PlanFeature>
          </ul>

          {user && unlockExpiresAt && accessActive && (
            <p className="relative text-amber-200/55 text-xs mb-3">
              {t('plans.proAccessUntil', {
                date: new Date(unlockExpiresAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
              })}
            </p>
          )}

          <div className="relative space-y-2">
            {!user && isFirebaseConfigured && (
              <PushableButton
                type="button"
                fullWidth
                variant="success"
                disabled={signInPending}
                onClick={async () => {
                  await signInWithGoogle();
                  if (useAuthStore.getState().user) await refreshUnlock();
                }}
                frontClassName={pushableFullWidthFrontClass}
              >
                {signInPending ? '…' : CTA.plans.signInToPayPro}
              </PushableButton>
            )}
            {user && !isProMember && !isPremiumMember && !accessActive && (
              <PushableButton
                type="button"
                fullWidth
                variant="success"
                onClick={() => {
                  trackProductUsage('action_plans_pro_open');
                  setShowProPay(true);
                }}
                frontClassName={pushableFullWidthFrontClass}
              >
                {CTA.plans.ctaPro}
              </PushableButton>
            )}
            {user && isProMember && !isPremiumMember && (
              <p className="text-center text-green-300/85 text-sm py-1">{t('plans.proCurrentLine')}</p>
            )}
            {user && isPremiumMember && (
              <p className="text-center text-amber-200/80 text-sm py-1">{t('plans.proCoveredByPremium')}</p>
            )}
          </div>
          <p className="relative text-amber-200/45 text-[10px] text-center mt-3">{t('plans.proFootnote')}</p>
        </section>

        {/* Premium — optional uplift */}
        <section
          className="shrink-0 rounded-2xl border border-amber-500/25 bg-black/30 p-4"
          aria-labelledby="plans-premium-heading"
        >
          <h2 id="plans-premium-heading" className="text-lg font-bold text-amber-300 mb-1">
            {t('plans.premiumTitleShort')}
          </h2>
          <p className="text-amber-100/75 text-sm mb-3">{t('plans.premiumTagline')}</p>
          <ul className="space-y-2.5 mb-4">
            <PlanFeature>{t('plans.premiumBullet1')}</PlanFeature>
            <PlanFeature>{t('plans.premiumBullet2')}</PlanFeature>
          </ul>
          {user && isPremiumMember && (
            <p className="text-amber-300/90 text-sm font-medium text-center py-1">{t('plans.premiumThankYou')}</p>
          )}
          {!user && isFirebaseConfigured && (
            <p className="text-amber-200/55 text-xs text-center">{t('plans.premiumAfterSignIn')}</p>
          )}
          {user && canDonateForPremium && (
            <PushableButton
              type="button"
              fullWidth
              onClick={() => {
                trackProductUsage('action_plans_premium_open');
                setShowPremiumDonate(true);
              }}
              frontClassName={pushableFullWidthFrontClass}
            >
              {CTA.plans.ctaPremium}
            </PushableButton>
          )}
          {user && !canDonateForPremium && !isPremiumMember && (
            <p className="text-amber-200/60 text-xs text-center rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2.5">
              {t('plans.premiumNeedProFirst')}
            </p>
          )}
        </section>

        <p className="shrink-0 text-center text-amber-200/45 text-[10px] pb-1">
          <PushableButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => navigate('/terms')}
            frontClassName={pushableCompactFrontClass}
          >
            {t('landing.terms')}
          </PushableButton>
          <span className="mx-1">·</span>
          {t('plans.legalLinkSuffix')}
        </p>

        <div
          className="shrink-0 h-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
          aria-hidden
        />
      </div>

      <BottomNav />

      {showProPay && (
        <Paywall gateMode="general" onClose={() => setShowProPay(false)} onUnlocked={onUnlocked} />
      )}
      {showPremiumDonate && user && canDonateForPremium && (
        <DonateModal
          onClose={() => {
            setShowPremiumDonate(false);
            void refreshUnlock();
          }}
          onDonated={() => {
            setShowPremiumDonate(false);
            void refreshUnlock();
          }}
        />
      )}
    </div>
  );
}
