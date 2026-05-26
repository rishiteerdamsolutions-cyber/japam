import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MainMenu } from '../components/menu/MainMenu';
import { MenuMiniGameDemo } from '../components/demo/MenuMiniGameDemo';
import { useProgressStore } from '../store/progressStore';
import { useAuthStore } from '../store/authStore';
import { isFirebaseConfigured } from '../lib/firebase';
import type { GameMode } from '../types';

/**
 * Clones menu UX/UI with an animated mini-board in place of the Iṣṭa intro GIF.
 * Open: `/test/menu-demo`
 */
export function MenuDemoTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [demoMountKey, setDemoMountKey] = useState(0);
  const getCurrentLevelIndex = useProgressStore((s) => s.getCurrentLevelIndex);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const handleSelect = async (mode: GameMode) => {
    if (isFirebaseConfigured && !user && !authLoading) {
      await signInWithGoogle();
      if (!useAuthStore.getState().user) return;
    }
    const level = getCurrentLevelIndex(mode);
    navigate(`/game?mode=${encodeURIComponent(mode)}&level=${level}`);
  };

  return (
    <MainMenu
      onSelect={handleSelect}
      onOpenSettings={() => navigate('/settings', { state: { from: '/test/menu-demo' } })}
      introHeroSlot={<MenuMiniGameDemo key={`${location.key}-${demoMountKey}`} />}
      demoNotice={
        <p className="w-full text-center text-amber-100/90 text-[11px] sm:text-xs px-2 py-1.5 rounded-lg bg-amber-900/25 border border-amber-500/30">
          Menu UI demo (mini-game preview).{' '}
          <button
            type="button"
            className="text-amber-200 underline underline-offset-2 font-medium mx-1"
            onClick={() => setDemoMountKey((k) => k + 1)}
          >
            Restart demo
          </button>
          ·{' '}
          <Link to="/menu" className="text-amber-300 underline underline-offset-2 font-medium">
            Open live menu
          </Link>
        </p>
      }
    />
  );
}
