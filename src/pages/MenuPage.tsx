import { useNavigate } from 'react-router-dom';
import { MainMenu } from '../components/menu/MainMenu';
import { useProgressStore } from '../store/progressStore';
import { useAuthStore } from '../store/authStore';
import { isFirebaseConfigured } from '../lib/firebase';
import type { GameMode } from '../types';

export function MenuPage() {
  const navigate = useNavigate();
  const getCurrentLevelIndex = useProgressStore((s) => s.getCurrentLevelIndex);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const needsSignIn = isFirebaseConfigured && !user && !authLoading;

  const handleSelect = (mode: GameMode) => {
    if (needsSignIn) {
      navigate('/signin');
      return;
    }
    const level = getCurrentLevelIndex(mode);
    navigate(`/game?mode=${encodeURIComponent(mode)}&level=${level}`);
  };

  const handleOpenMap = () => {
    if (needsSignIn) {
      navigate('/signin');
      return;
    }
    navigate('/levels');
  };

  const handleOpenJapa = () => {
    if (needsSignIn) {
      navigate('/signin');
      return;
    }
    navigate('/japa');
  };

  return (
    <MainMenu
      onSelect={handleSelect}
      onOpenMap={handleOpenMap}
      onOpenJapaDashboard={handleOpenJapa}
      onOpenSettings={() => navigate('/settings')}
    />
  );
}
