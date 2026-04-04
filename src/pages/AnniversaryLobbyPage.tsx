import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { useAuthStore } from '../store/authStore';
import { createAnniversarySession } from '../lib/occasionsApi';
import type { GameMode } from '../types';

export function AnniversaryLobbyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [hostRole, setHostRole] = useState<'husband' | 'wife'>('husband');
  const [gameMode] = useState<GameMode>('general');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<{
    sessionId: string;
    joinToken: string;
  } | null>(null);

  const joinUrl =
    typeof window !== 'undefined' && session
      ? `${window.location.origin}/occasion/anniversary/join?sid=${encodeURIComponent(session.sessionId)}&t=${encodeURIComponent(session.joinToken)}`
      : '';

  const start = async () => {
    setErr(null);
    if (!user) {
      navigate('/signin');
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await createAnniversarySession(token, { hostRole, gameMode, levelIndex: 0 });
      setSession({ sessionId: res.sessionId, joinToken: res.joinToken });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      /* ignore */
    }
  };

  const enterGame = () => {
    if (!session) return;
    navigate(
      `/game?anniversary=${encodeURIComponent(session.sessionId)}&role=${hostRole}&host=1&mode=${encodeURIComponent(gameMode)}&level=0&target=108`,
    );
  };

  return (
    <div className="relative min-h-screen p-4 pb-24 max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
        <AppHeader title={t('occasions.anniversaryTitle')} showBack onBack={() => navigate('/')} />
        <p className="text-amber-200/85 text-sm mb-4">{t('occasions.anniversaryLobbyIntro', { count: 108 })}</p>

        {!session ? (
          <>
            <p className="text-amber-200/70 text-xs mb-2">{t('occasions.youAre')}</p>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setHostRole('husband')}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium ${
                  hostRole === 'husband'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                    : 'bg-black/20 border-amber-500/30 text-amber-200/70'
                }`}
              >
                {t('occasions.roleHusband')}
              </button>
              <button
                type="button"
                onClick={() => setHostRole('wife')}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium ${
                  hostRole === 'wife'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                    : 'bg-black/20 border-amber-500/30 text-amber-200/70'
                }`}
              >
                {t('occasions.roleWife')}
              </button>
            </div>
            {err && <p className="text-red-300 text-sm mb-2">{err}</p>}
            <button
              type="button"
              disabled={loading}
              onClick={start}
              className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('occasions.createShareLink')}
            </button>
          </>
        ) : (
          <>
            <p className="text-amber-200/80 text-sm mb-2">{t('occasions.shareWithPartner')}</p>
            <div className="rounded-xl bg-black/30 border border-amber-500/25 p-3 mb-3 break-all text-amber-100/90 text-xs">
              {joinUrl}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="w-full mb-3 py-2.5 rounded-xl border border-amber-500/50 text-amber-300 text-sm"
            >
              {t('occasions.copyLink')}
            </button>
            <button
              type="button"
              onClick={enterGame}
              className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold"
            >
              {t('occasions.openGameAsHost')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
