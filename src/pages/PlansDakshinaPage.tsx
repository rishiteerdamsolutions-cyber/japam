import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { AppFooter } from '../components/layout/AppFooter';
import { BottomNav } from '../components/nav/BottomNav';
import { Paywall } from '../components/payment/Paywall';
import { DonateModal } from '../components/donation/DonateModal';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess, getProfileRingFlags } from '../lib/membershipDisplay';
import { isFirebaseConfigured } from '../lib/firebase';
import { loadPricingConfig } from '../lib/firestore';

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

  return (
    <div className="relative min-h-screen p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 w-full">
        <MenuMatchChantHeader />
        <h1 className="text-base sm:text-xl font-bold text-amber-400 mb-2" style={{ fontFamily: 'serif' }}>
          {t('plans.title')}
        </h1>
        <p className="text-amber-200/85 text-sm leading-relaxed mb-6">
          {t('plans.subtitle')}
        </p>

        {loading && <p className="text-amber-200/60 text-sm mb-4">…</p>}

        <div className="space-y-4 mb-4">
          {/* Pro */}
          <section
            className="rounded-2xl p-4 border-2 border-green-500/40 bg-black/25"
            aria-labelledby="plans-pro-heading"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 id="plans-pro-heading" className="text-lg font-bold text-green-400">
                {t('plans.proTitle')}
              </h2>
              {user && isProMember && <span className="text-xs font-semibold text-green-300/90 px-2 py-0.5 rounded bg-green-500/20">{t('plans.statusActive')}</span>}
              {user && isPremiumMember && <span className="text-xs font-semibold text-amber-300/90 px-2 py-0.5 rounded bg-amber-500/20">{t('menu.premium')}</span>}
            </div>
            <p className="text-amber-100/85 text-sm leading-relaxed mb-3">
              {t('plans.proBody')}
            </p>
            <ul className="text-amber-200/80 text-sm list-disc pl-5 space-y-1 mb-3">
              <li>{t('plans.proBullet1')}</li>
              <li>{t('plans.proBullet2')}</li>
              <li>{t('plans.proBullet3')}</li>
            </ul>
            {user && unlockExpiresAt && accessActive && (
              <p className="text-amber-200/60 text-xs mb-3">
                {t('plans.proAccessUntil', {
                  date: new Date(unlockExpiresAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }),
                })}
              </p>
            )}
            {user && (isProMember || isPremiumMember)
              ? null
              : !accessActive && priceLoaded && (
              <p className="text-white font-semibold mb-2 text-lg">
                {displayRupees && priceRupees && displayRupees !== priceRupees ? (
                  <>
                    <span className="line-through text-amber-200/70 mr-2">₹{displayRupees}</span>
                    <span>₹{priceRupees}</span>
                  </>
                ) : priceRupees ? (
                  <>₹{priceRupees}</>
                ) : null}
                <span className="text-amber-200/70 text-sm font-normal ml-2"> / {t('plans.monthlyDakshina')}</span>
              </p>
            )}
            {!isPremiumMember && <p className="text-amber-200/60 text-xs mb-3">{t('plans.proFootnote')}</p>}
            {!user && isFirebaseConfigured && (
              <button
                type="button"
                disabled={signInPending}
                onClick={async () => {
                  await signInWithGoogle();
                  if (useAuthStore.getState().user) await refreshUnlock();
                }}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50"
              >
                {signInPending ? '…' : t('plans.signInToPayPro')}
              </button>
            )}
            {user && !isProMember && !isPremiumMember && !accessActive && (
              <button
                type="button"
                onClick={() => setShowProPay(true)}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold"
              >
                {t('plans.ctaPro')}
              </button>
            )}
            {user && isProMember && !isPremiumMember && (
              <p className="text-green-300/80 text-sm">{t('plans.proCurrentLine')}</p>
            )}
            {user && isPremiumMember && (
              <p className="text-amber-200/80 text-sm">{t('plans.proCoveredByPremium')}</p>
            )}
          </section>

          {/* Premium */}
          <section
            className="rounded-2xl p-4 border-2 border-amber-500/50 bg-amber-950/20"
            aria-labelledby="plans-premium-heading"
          >
            <h2 id="plans-premium-heading" className="text-lg font-bold text-amber-300 mb-2">
              {t('plans.premiumTitle')}
            </h2>
            <p className="text-amber-100/85 text-sm leading-relaxed mb-3">
              {t('plans.premiumBody')}
            </p>
            <ul className="text-amber-200/80 text-sm list-disc pl-5 space-y-1 mb-3">
              <li>{t('plans.premiumBullet1')}</li>
              <li>{t('plans.premiumBullet2')}</li>
              <li>{t('plans.premiumBullet3')}</li>
            </ul>
            {user && isPremiumMember && (
              <p className="text-amber-300/90 text-sm font-medium mb-2">{t('plans.premiumThankYou')}</p>
            )}
            {!user && isFirebaseConfigured && (
              <p className="text-amber-200/60 text-sm mb-2">{t('plans.premiumAfterSignIn')}</p>
            )}
            {user && canDonateForPremium && (
              <button
                type="button"
                onClick={() => setShowPremiumDonate(true)}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
              >
                {t('plans.ctaPremium')}
              </button>
            )}
            {user && !canDonateForPremium && !isPremiumMember && (
              <p className="text-amber-200/70 text-sm border border-amber-500/30 rounded-xl p-3">
                {t('plans.premiumNeedProFirst')}
              </p>
            )}
          </section>
        </div>

        <p className="text-amber-200/50 text-xs mb-8">
          <button
            type="button"
            className="text-amber-300 underline underline-offset-2"
            onClick={() => navigate('/terms')}
          >
            {t('landing.terms')}
          </button>
          {' · '}
          {t('plans.legalLinkSuffix')}
        </p>

        <div className="mb-6" />
        <AppFooter />
        <BottomNav />
      </div>

      {showProPay && (
        <Paywall
          gateMode="general"
          onClose={() => setShowProPay(false)}
          onUnlocked={onUnlocked}
        />
      )}
      {showPremiumDonate && user && canDonateForPremium && (
        <DonateModal
          onClose={() => { setShowPremiumDonate(false); void refreshUnlock(); }}
          onDonated={() => {
            setShowPremiumDonate(false);
            void refreshUnlock();
          }}
        />
      )}
    </div>
  );
}
