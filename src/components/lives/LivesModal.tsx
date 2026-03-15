/** Candy Crush–style lives modal: big heart display, Watch ad, Buy lives, etc. */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RewardVideoModal } from '../game/RewardVideoModal';
import { useLivesStore } from '../../store/livesStore';
import { useAuthStore } from '../../store/authStore';
import { loadPricingConfig } from '../../lib/firestore';
import { openCashfreeCheckout } from '../../lib/cashfree';
import { getApiBase } from '../../lib/apiBase';
import { fetchWithRetry } from '../../lib/fetchWithRetry';

const MAX_LIVES = 5;

function BigHeartWithNumber({ count }: { count: number }) {
  const display = String(Math.min(Math.max(0, count), MAX_LIVES));
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4">
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200/80 to-amber-400/60 shadow-[0_4px_20px_rgba(245,158,11,0.5)] border-2 border-amber-300/70"
        style={{ clipPath: 'ellipse(50% 50% at 50% 50%)' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg">
          <defs>
            <linearGradient id="modalHeartGloss" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9ebb" />
              <stop offset="40%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
          </defs>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#modalHeartGloss)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
        </svg>
      </div>
      <span
        className="absolute inset-0 flex items-center justify-center text-white font-bold"
        style={{
          fontSize: '2.5rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {display}
      </span>
    </div>
  );
}

interface LivesModalProps {
  onClose: () => void;
}

export function LivesModal({ onClose }: LivesModalProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const lives = useLivesStore((s) => s.lives);
  const nextRefillAt = useLivesStore((s) => s.nextRefillAt);
  const load = useLivesStore((s) => s.load);
  const grant = useLivesStore((s) => s.grant);

  const [showVideo, setShowVideo] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [livesPrice, setLivesPrice] = useState<number>(19);

  const getIdToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);

  useEffect(() => {
    loadPricingConfig().then((c) => setLivesPrice(Math.round((c.livesPricePaise ?? 1900) / 100)));
  }, []);

  const handleWatchComplete = useCallback(async () => {
    setShowVideo(false);
    const ok = await grant(getIdToken);
    if (ok) await load(getIdToken);
  }, [grant, load, getIdToken]);

  const handleBuyLives = useCallback(async () => {
    if (!user?.uid) return;
    setBuyError(null);
    setBuying(true);
    try {
      const base = getApiBase();
      const url = base ? `${base}/api/create-lives-order` : '/api/create-lives-order';
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = (await res.json()) as { orderId?: string; paymentSessionId?: string; error?: string };
      if (!res.ok) {
        setBuyError(data.error || 'Failed');
        return;
      }
      if (!data.paymentSessionId) {
        setBuyError('Invalid response');
        return;
      }
      await openCashfreeCheckout(data.paymentSessionId, { redirectTarget: '_self' });
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBuying(false);
    }
  }, [user?.uid]);

  const refillIn = nextRefillAt ? Math.max(0, Math.ceil((nextRefillAt - Date.now()) / (60 * 60 * 1000))) : 0;
  const isFull = lives >= MAX_LIVES;
  const canBuyLives = lives <= 0;

  if (showVideo) {
    return (
      <RewardVideoModal
        onComplete={handleWatchComplete}
        onClose={() => setShowVideo(false)}
        rewardLabel={t('game.continue')}
        rewardType="life"
        getIdToken={getIdToken}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="relative rounded-2xl bg-gradient-to-b from-pink-100/95 to-rose-200/95 border-2 border-pink-300/60 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)] p-6 max-w-sm w-full text-center overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-400/80 text-white font-bold text-lg flex items-center justify-center hover:bg-rose-500 shadow-md"
          aria-label={t('common.cancel')}
        >
          ×
        </button>

        <h2 className="text-lg font-bold text-rose-800 mb-1" style={{ fontFamily: 'serif' }}>
          {t('game.totalLives', 'Total lives')}
        </h2>
        <BigHeartWithNumber count={lives} />
        {isFull ? (
          <p className="text-rose-700/90 text-sm font-semibold mb-4">{t('game.livesFull', 'Full')}</p>
        ) : (
          refillIn > 0 && (
            <p className="text-rose-600/90 text-xs mb-4">{t('game.refillIn', { hours: refillIn })}</p>
          )
        )}

        <div className="flex flex-col gap-2">
          <motion.button
            type="button"
            onClick={() => setShowVideo(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-b from-violet-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
            style={{ fontFamily: 'serif' }}
          >
            {t('game.watchForLife', 'Watch ad for +1 life')}
          </motion.button>
          <motion.button
            type="button"
            onClick={handleBuyLives}
            disabled={buying || !canBuyLives}
            className="w-full py-3 rounded-xl bg-gradient-to-b from-rose-500 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-shadow"
            style={{ fontFamily: 'serif' }}
            title={!canBuyLives ? t('game.buyLivesOnlyWhenZero', 'Buy only when you have no lives') : undefined}
          >
            {buying ? t('common.loading') : t('game.buyLives', { price: livesPrice })}
          </motion.button>
          {buyError && <p className="text-red-600 text-sm">{buyError}</p>}
        </div>
      </motion.div>
    </div>
  );
}
