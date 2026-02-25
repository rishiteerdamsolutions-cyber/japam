import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import { DonateModal } from '../donation/DonateModal';
import { useProfileStore } from '../../store/profileStore';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Optional right-side element (e.g. Priest link) */
  rightElement?: React.ReactNode;
}

export function AppHeader({ title, showBack, onBack, rightElement }: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuthStore();
  const tier = useUnlockStore((s) => s.tier);
  const profileName = useProfileStore((s) => s.displayName);
  const [showDonate, setShowDonate] = useState(false);

  const fallbackName = user?.displayName ?? user?.email ?? null;
  const displayName = profileName ?? fallbackName ?? 'Signed in';
  const isPro = tier === 'pro';
  const isPremium = tier === 'premium';
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || '?';

  return (
    <>
      <header className="flex items-center justify-between gap-2 w-full mb-4 min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-amber-400 text-sm font-medium hover:text-amber-300 flex-shrink-0"
            >
              ← Back
            </button>
          )}
          <h1 className="text-xl font-bold text-amber-400 truncate" style={{ fontFamily: 'serif' }}>
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {loading && <span className="text-amber-200/60 text-sm">…</span>}
          {!loading && !user && (
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap"
            >
              Sign in
            </button>
          )}
          {!loading && user && (
            <>
              <div className="flex items-center gap-1.5 min-w-0 max-w-[140px]">
                <div
                  className={`relative flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-amber-200 font-semibold text-xs
                    ${isPremium ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/20' : isPro ? 'border-green-500 ring-2 ring-green-500/50 bg-green-500/20' : 'border-amber-500/40 bg-black/30'}`}
                  title={isPremium ? 'Premium' : isPro ? 'Pro' : undefined}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                  {isPremium && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px] font-bold">★</span>
                  )}
                  {isPro && !isPremium && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-bold">✓</span>
                  )}
                </div>
                <span className="text-amber-200/90 text-xs truncate" title={displayName}>
                  {displayName}
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
            </>
          )}
          {rightElement}
        </div>
      </header>
      {showDonate && (
        <DonateModal
          onClose={() => setShowDonate(false)}
          onDonated={() => setShowDonate(false)}
        />
      )}
    </>
  );
}
