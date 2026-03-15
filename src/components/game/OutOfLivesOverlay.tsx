import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RewardVideoModal } from './RewardVideoModal';
import { useLivesStore } from '../../store/livesStore';
import { useAuthStore } from '../../store/authStore';
import { loadPricingConfig } from '../../lib/firestore';
import { openCashfreeCheckout } from '../../lib/cashfree';
import { getApiBase } from '../../lib/apiBase';
import { fetchWithRetry } from '../../lib/fetchWithRetry';

const LIVES_RETURN_KEY = 'japam_lives_return';

interface OutOfLivesOverlayProps {
  onClose: () => void;
  onRetryAfterLife?: () => void;
  /** Mode and level to return to after buying lives (so same level opens, Candy Crush style) */
  returnMode?: string;
  returnLevelIndex?: number;
}

export function OutOfLivesOverlay({ onClose, onRetryAfterLife, returnMode, returnLevelIndex }: OutOfLivesOverlayProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const load = useLivesStore((s) => s.load);
  const grant = useLivesStore((s) => s.grant);
  const lives = useLivesStore((s) => s.lives);
  const nextRefillAt = useLivesStore((s) => s.nextRefillAt);
  const canBuyLives = lives <= 0;

  const [showVideo, setShowVideo] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const handleWatchComplete = useCallback(async () => {
    setShowVideo(false);
    const ok = await grant(getIdToken);
    if (ok) {
      await load(getIdToken);
      if (onRetryAfterLife) onRetryAfterLife();
      else onClose();
    }
  }, [grant, load, getIdToken, onRetryAfterLife, onClose]);

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
      try {
        if (returnMode != null && returnLevelIndex != null) {
          sessionStorage.setItem(LIVES_RETURN_KEY, JSON.stringify({ mode: returnMode, levelIndex: returnLevelIndex }));
        }
      } catch {
        // ignore
      }
      await openCashfreeCheckout(data.paymentSessionId, { redirectTarget: '_self' });
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBuying(false);
    }
  }, [user?.uid, returnMode, returnLevelIndex]);

  const [livesPrice, setLivesPrice] = useState<number>(19);
  useEffect(() => {
    loadPricingConfig().then((c) => setLivesPrice(Math.round((c.livesPricePaise ?? 1900) / 100)));
  }, []);

  const refillIn = nextRefillAt ? Math.max(0, Math.ceil((nextRefillAt - Date.now()) / (60 * 60 * 1000))) : 0;

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
        <h2 className="text-lg font-bold text-rose-800 mb-1" style={{ fontFamily: 'serif' }}>
          {t('game.outOfLives')}
        </h2>
        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="emptyHeartGloss" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff9ebb" />
                <stop offset="40%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#be185d" />
              </linearGradient>
            </defs>
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="url(#emptyHeartGloss)"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
            />
            <text x="12" y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">0</text>
          </svg>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-rose-600/90 text-sm mb-6"
        >
          {t('game.outOfLivesMessage')}
        </motion.p>
        <div className="flex flex-col gap-2">
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowVideo(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-b from-violet-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
            style={{ fontFamily: 'serif' }}
          >
            {t('game.watchForLife')}
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleBuyLives}
            disabled={buying || !canBuyLives}
            className="w-full py-3 rounded-xl bg-gradient-to-b from-rose-500 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-shadow"
            style={{ fontFamily: 'serif' }}
            title={!canBuyLives ? t('game.buyLivesOnlyWhenZero', 'Buy only when you have no lives') : undefined}
          >
            {buying ? t('common.loading') : t('game.buyLives', { price: livesPrice })}
          </motion.button>
          {refillIn > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-rose-600/80 text-xs"
            >
              {t('game.refillIn', { hours: refillIn })}
            </motion.p>
          )}
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="w-full py-3 rounded-xl border-2 border-rose-400/60 text-rose-700 font-semibold hover:bg-rose-100/50 transition-colors"
          >
            {t('game.menu')}
          </motion.button>
        </div>
        {buyError && <p className="mt-3 text-red-600 text-sm font-medium">{buyError}</p>}
      </motion.div>
    </div>
  );
}
