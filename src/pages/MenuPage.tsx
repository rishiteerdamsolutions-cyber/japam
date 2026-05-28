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
  buildInviteIntroGameSearch,
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
  const clearAuthError = useAuthStore((s) => s.clearError);

  const launchDeityGame = useCallback(
    (mode: PlayableDeityId, opts?: { inviteFresh?: boolean }) => {
      const level = opts?.inviteFresh ? 0 : getCurrentLevelIndex(mode);
      trackProductUsage('action_menu_ista_select');
      const params = new URLSearchParams({
        mode,
        level: String(level),
      });
      if (opts?.inviteFresh) params.set('inviteFresh', '1');
      navigate(`/game?${params.toString()}`, {
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
      launchDeityGame(deity, { inviteFresh: true });
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
    navigate(`/game${buildInviteIntroGameSearch(deity)}`, {
      state: withReturnTo('/menu'),
    });
  }, [navigate, pendingInviteDeity]);

  const handleInviteSignIn = useCallback(() => {
    clearAuthError();
    void signInWithGoogle();
  }, [clearAuthError, signInWithGoogle]);

  const dismissInviteGate = useCallback(() => {
    clearPendingInviteDeity();
    setPendingInviteDeity(null);
  }, []);

  // Show invite gate immediately for shared deity links (don't flash menu first).
  const showInviteGate = Boolean(pendingInviteDeity && !user);
  const redirectingSignedInInvite =
    Boolean(pendingInviteDeity && user && !authLoading) && !inviteHandledRef.current;

  if (redirectingSignedInInvite) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <p className="relative z-10 text-amber-400 text-sm">Opening your japa…</p>
      </div>
    );
  }

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
          onSignIn={handleInviteSignIn}
          onTryAsGuest={tryInviteAsGuest}
          onBrowseMenu={dismissInviteGate}
        />
      ) : null}
    </>
  );
}
