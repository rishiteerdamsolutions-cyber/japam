import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DEITIES } from '../../data/deities';
import { GoogleSignIn } from '../auth/GoogleSignIn';
import { JapamLogo } from '../ui/JapamLogo';
import { DonateModal } from '../donation/DonateModal';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import type { GameMode } from '../../store/gameStore';
import { useProfileStore } from '../../store/profileStore';

const BG_IMAGE = '/images/game%20menupagebg.png';

interface MainMenuProps {
  onSelect: (mode: GameMode) => void;
  onOpenMap: () => void;
  onOpenJapaDashboard: () => void;
  onOpenSettings: () => void;
}

export function MainMenu({ onSelect, onOpenMap, onOpenJapaDashboard, onOpenSettings }: MainMenuProps) {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuthStore();
  const tier = useUnlockStore((s) => s.tier);
  const [showDonate, setShowDonate] = useState(false);
  const profileName = useProfileStore((s) => s.displayName);
  const fallbackName = user?.displayName || (user?.email ? user.email.split('@')[0] : null);
  const displayName = profileName || fallbackName || 'Signed in';
  const isPro = tier === 'pro';
  const isPremium = tier === 'premium';
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || '?';

  return (
    <div
      className="relative min-h-screen flex flex-col items-center p-4 pb-[env(safe-area-inset-bottom)] bg-cover bg-center"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Top: back to home (left) and user/sign in (right) */}
        <div className="w-full flex justify-between items-center gap-2 mt-2 mb-1 min-h-[40px]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-amber-400/90 text-sm font-medium hover:text-amber-400 shrink-0"
          >
            ← Back
          </button>
          <div className="flex justify-end items-center gap-2 flex-1 min-w-0">
          {loading && (
            <span className="text-amber-200/60 text-sm">…</span>
          )}
          {!loading && !user && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap"
              >
                Sign in
              </button>
            </div>
          )}
          {!loading && user && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={`relative flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-amber-200 font-semibold text-sm
                    ${isPremium ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/20' : isPro ? 'border-green-500 ring-2 ring-green-500/50 bg-green-500/20' : 'border-amber-500/40 bg-black/30'}`}
                  title={isPremium ? 'Premium' : isPro ? 'Pro' : undefined}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                  {isPremium && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold" title="Premium">★</span>
                  )}
                  {isPro && !isPremium && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold" title="Pro">✓</span>
                  )}
                </div>
                <span className="text-amber-200/90 text-sm truncate max-w-[120px]" title={displayName}>
                  {displayName}
                  {isPremium && <span className="ml-1 text-xs text-amber-400">(Premium)</span>}
                  {isPro && !isPremium && <span className="ml-1 text-xs text-green-400">(Pro)</span>}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDonate(true)}
                className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap"
              >
                Donate
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-amber-400/80 text-xs font-medium hover:text-amber-400 whitespace-nowrap"
              >
                Sign out
              </button>
            </div>
          )}
          </div>
        </div>

        {showDonate && (
          <DonateModal
            onClose={() => setShowDonate(false)}
            onDonated={() => { setShowDonate(false); }}
          />
        )}

        <JapamLogo size={100} className="mt-4 drop-shadow-lg" />
        <h1 className="text-4xl font-bold text-amber-400 mt-2 mb-1 drop-shadow-lg" style={{ fontFamily: 'serif' }}>
          Japam
        </h1>
        <p className="text-amber-200/90 text-sm mb-6">Match & Chant</p>

        {!user && (
          <div className="mb-6">
            <GoogleSignIn />
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-2xl bg-amber-500/95 text-white font-bold text-lg shadow-lg shadow-amber-500/30 mb-4"
          onClick={() => onSelect('general')}
        >
          General Game
        </motion.button>

        <p className="text-amber-200/80 text-xs uppercase tracking-wider mb-2">Deity games</p>
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          {DEITIES.map((deity, i) => (
            <motion.button
              key={deity.id}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex flex-col items-center rounded-2xl overflow-hidden shadow-xl bg-black/40 border-2 border-white/20 hover:border-amber-400/50 transition-colors"
              onClick={() => onSelect(deity.id)}
            >
              <div className="w-full aspect-square relative bg-black/30">
                <img
                  src={deity.image}
                  alt={deity.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="py-2 px-2 text-sm font-semibold text-white w-full text-center truncate">
                {deity.name}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mt-2 mb-8">
          <button
            onClick={() => navigate('/marathons')}
            className="text-amber-200 font-medium text-sm hover:text-amber-400 transition-colors"
          >
            Japa Marathons
          </button>
          <button
            onClick={onOpenJapaDashboard}
            className="text-amber-200 font-medium text-sm hover:text-amber-400 transition-colors"
          >
            Japa Count
          </button>
          <button
            onClick={onOpenMap}
            className="text-amber-200 font-medium text-sm hover:text-amber-400 transition-colors"
          >
            Levels
          </button>
          <button
            onClick={onOpenSettings}
            className="text-amber-200 font-medium text-sm hover:text-amber-400 transition-colors"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
