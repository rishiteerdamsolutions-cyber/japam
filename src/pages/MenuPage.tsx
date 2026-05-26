import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainMenu } from '../components/menu/MainMenu';
import { DeityInviteGate } from '../components/menu/DeityInviteGate';
import { MenuMiniGameDemo } from '../components/demo/MenuMiniGameDemo';
import { useProgressStore } from '../store/progressStore';
import { useAuthStore } from '../store/authStore';
import { isFirebaseConfigured } from '../lib/firebase';
import type { GameMode } from '../types';
import { DEITY_IDS, type PlayableDeityId } from '../data/deities';
import { applySeoSearchParams, clearSeoDeityHint, consumeSeoDeityHint } from '../lib/seoAttribution';
import { withReturnTo } from '../lib/navigationReturn';
import {
  clearPendingInviteDeity,
  peekPendingInviteDeity,
  storePendingInviteDeity,
} from '../lib/deityInvite';
import { trackProductUsage } from '../lib/productUsage';

export function MenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuHistoryArmedRef = useRef(false);
  const inviteHandledRef = useRef(false);

  const [pendingInviteDeity, setPendingInviteDeity] = useState<PlayableDeityId | null>(() =>
    peekPendingInviteDeity(),
  );

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

  const launchDeityGame = useCallback(
    (mode: PlayableDeityId) => {
      const level = getCurrentLevelIndex(mode);
      trackProductUsage('action_menu_ista_select');
      navigate(`/game?mode=${encodeURIComponent(mode)}&level=${level}`, {
        state: withReturnTo('/menu'),
      });
    },
    [getCurrentLevelIndex, navigate],
  );

  const handleSelect = useCallback(
    (mode: GameMode) => {
      const level = getCurrentLevelIndex(mode);
      if (mode === 'general') trackProductUsage('action_menu_all_devatas');
      else trackProductUsage('action_menu_ista_select');
      navigate(`/game?mode=${encodeURIComponent(mode)}&level=${level}`, {
        state: withReturnTo('/menu'),
      });
      if (isFirebaseConfigured && !user) {
        void signInWithGoogle();
      }
    },
    [getCurrentLevelIndex, navigate, signInWithGoogle, user],
  );

  useEffect(() => {
    applySeoSearchParams(location.search);

    const deityFromUrl = new URLSearchParams(location.search).get('deity');
    if (deityFromUrl && DEITY_IDS.includes(deityFromUrl as PlayableDeityId)) {
      const id = deityFromUrl as PlayableDeityId;
      storePendingInviteDeity(id);
      setPendingInviteDeity(id);
      if (location.search) navigate('/menu', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (authLoading) return;

    if (user && pendingInviteDeity) {
      const deity = pendingInviteDeity;
      clearPendingInviteDeity();
      setPendingInviteDeity(null);
      inviteHandledRef.current = true;
      launchDeityGame(deity);
      return;
    }

    const seoLaunch = Boolean((location.state as { seoDeityLaunch?: boolean } | null)?.seoDeityLaunch);
    if (seoLaunch) {
      const deity = consumeSeoDeityHint();
      if (deity && DEITY_IDS.includes(deity as PlayableDeityId)) {
        const playable = deity as PlayableDeityId;
        if (!user) {
          storePendingInviteDeity(playable);
          setPendingInviteDeity(playable);
          return;
        }
        if (!inviteHandledRef.current) {
          inviteHandledRef.current = true;
          launchDeityGame(playable);
        }
      }
      return;
    }

    if (!pendingInviteDeity) {
      clearSeoDeityHint();
    }
  }, [authLoading, launchDeityGame, location.state, pendingInviteDeity, user]);

  const tryInviteAsGuest = useCallback(() => {
    if (!pendingInviteDeity) return;
    const deity = pendingInviteDeity;
    clearPendingInviteDeity();
    setPendingInviteDeity(null);
    inviteHandledRef.current = true;
    navigate(`/game?mode=${encodeURIComponent(deity)}&level=0&guest=1`, {
      state: withReturnTo('/menu'),
    });
  }, [navigate, pendingInviteDeity]);

  const dismissInviteGate = useCallback(() => {
    clearPendingInviteDeity();
    setPendingInviteDeity(null);
  }, []);

  const showInviteGate = Boolean(pendingInviteDeity && !user && !authLoading);

  return (
    <>
      <MainMenu
        onSelect={handleSelect}
        onOpenSettings={() => navigate('/settings', { state: withReturnTo('/menu') })}
        introHeroSlot={<MenuMiniGameDemo key={location.key} fillContainer />}
        forceIstaRevealed={Boolean(pendingInviteDeity)}
      />
      {showInviteGate && pendingInviteDeity ? (
        <DeityInviteGate
          deityId={pendingInviteDeity}
          onTryAsGuest={tryInviteAsGuest}
          onBrowseMenu={dismissInviteGate}
        />
      ) : null}
    </>
  );
}
