import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainMenu } from '../components/menu/MainMenu';
import { MenuMiniGameDemo } from '../components/demo/MenuMiniGameDemo';
import { useProgressStore } from '../store/progressStore';
import { useAuthStore } from '../store/authStore';
import { isFirebaseConfigured } from '../lib/firebase';
import type { GameMode } from '../types';
import { DEITY_IDS, type PlayableDeityId } from '../data/deities';
import { consumeSeoDeityHint } from '../lib/seoAttribution';
import { trackProductUsage } from '../lib/productUsage';

export function MenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuHistoryArmedRef = useRef(false);

  // Browser "back" from /menu should open the landing page (/) instead of whatever SPA entry is under /menu in history.
  useEffect(() => {
    if (!menuHistoryArmedRef.current) {
      window.history.pushState({ japamMenuGuard: true }, '', window.location.href);
      menuHistoryArmedRef.current = true;
    }
    const onPopState = () => {
      navigate('/', { replace: true });
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      menuHistoryArmedRef.current = false;
    };
  }, [navigate]);
  const getCurrentLevelIndex = useProgressStore((s) => s.getCurrentLevelIndex);
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const handleSelect = async (mode: GameMode) => {
    if (isFirebaseConfigured && !user) {
      await signInWithGoogle();
      if (!useAuthStore.getState().user) return;
    }
    const level = getCurrentLevelIndex(mode);
    if (mode === 'general') trackProductUsage('action_menu_all_devatas');
    else trackProductUsage('action_menu_ista_select');
    navigate(`/game?mode=${encodeURIComponent(mode)}&level=${level}`);
  };

  useEffect(() => {
    const deity = consumeSeoDeityHint();
    if (!deity || !DEITY_IDS.includes(deity as PlayableDeityId)) return;
    void handleSelect(deity);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot SEO deep link on mount
  }, []);

  return (
    <MainMenu
      onSelect={handleSelect}
      onOpenSettings={() => navigate('/settings', { state: { from: '/menu' } })}
      introHeroSlot={<MenuMiniGameDemo key={location.key} />}
    />
  );
}
