import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainMenu } from '../components/menu/MainMenu';
import { useProgressStore } from '../store/progressStore';
import { useAuthStore } from '../store/authStore';
import { isFirebaseConfigured } from '../lib/firebase';
import type { GameMode } from '../types';

export function MenuPage() {
  const navigate = useNavigate();
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
      onOpenSettings={() => navigate('/settings')}
    />
  );
}
