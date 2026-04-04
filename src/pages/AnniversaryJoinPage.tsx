import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { useAuthStore } from '../store/authStore';
import { joinAnniversarySession } from '../lib/occasionsApi';
import { setOccasionEntryGate } from '../lib/occasionEntryGate';

export function AnniversaryJoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const sid = params.get('sid') || '';
  const tok = params.get('t') || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sid || !tok) {
        setErr(t('occasions.joinInvalidLink'));
        setBusy(false);
        return;
      }
      if (!user) {
        setBusy(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await joinAnniversarySession(token, sid, tok);
        if (cancelled) return;
        const myRole = res.guestRole === 'husband' ? 'husband' : 'wife';
        setOccasionEntryGate('anniversary');
        navigate(
          `/game?anniversary=${encodeURIComponent(sid)}&role=${myRole}&host=0&mode=${encodeURIComponent(res.gameMode)}&level=${res.levelIndex}&target=108`,
          { replace: true },
        );
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Join failed');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sid, tok, navigate, t]);

  if (!user) {
    return (
      <div className="relative min-h-screen p-4 max-w-lg mx-auto overflow-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10">
          <AppHeader title={t('occasions.anniversaryJoin')} showBack onBack={() => navigate('/')} />
          <p className="text-amber-200/90 text-sm mb-4">{t('occasions.joinSignInFirst')}</p>
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold"
          >
            {t('menu.signIn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4 max-w-lg mx-auto overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 text-center">
        {busy && <p className="text-amber-400">{t('occasions.joining')}</p>}
        {err && <p className="text-red-300 text-sm mt-2">{err}</p>}
      </div>
    </div>
  );
}
