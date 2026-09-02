import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { OpeningVideoModal } from '../components/landing/OpeningVideoModal';
import { InstallPrompt } from '../components/ui/InstallPrompt';
import { ManualMalaJapaPad } from '../components/japamCounter/ManualMalaJapaPad';
import { GoogleSignIn } from '../components/auth/GoogleSignIn';
import { useAuthStore } from '../store/authStore';
import { useManualJapaTouchLock } from '../hooks/useManualJapaTouchLock';
import { ensureMantraPreloaded, playMantraOnce, primeAudio, stopAllMantras } from '../hooks/useSound';
import { pulseMalaBeadTouchHaptic } from '../lib/malaHaptics';
import { getDeity } from '../data/deities';
import { FREE_STARTER_DEITY } from '../lib/freeStarterDeity';
import { AUTO_JAPAM_SESSION_TARGET } from '../lib/japamCounterSpecial';
import {
  completeSatsang,
  joinSatsang,
  loadSatsangStatus,
  type SatsangJoinResult,
  type SatsangStatus,
} from '../lib/satsangApi';
import { downloadBlobPng, renderSatsangDevoteeCardBlob } from '../lib/satsangShareCard';
import { downloadMantraPdf } from '../utils/pdfExport';
import { removeBackgroundFromImage } from '../utils/removeBackground';
import { formatIstDateTime } from '../lib/japamCounterIst';
import { isFirebaseConfigured } from '../lib/firebase';

const VIDEO_SEEN_KEY = 'japam_ganeshotsav_video';
const HANDWRITING_SAMPLE_SRC = '/SAMPLE%20NAMA%20IMAGE.png';
const DEITY = FREE_STARTER_DEITY;

type Step = 'boot' | 'video' | 'gate' | 'mala' | 'pdf' | 'share';

function videoAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(VIDEO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markVideoSeen() {
  try {
    sessionStorage.setItem(VIDEO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function GaneshotsavPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const [status, setStatus] = useState<SatsangStatus | null>(null);
  const [step, setStep] = useState<Step>('boot');
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [session, setSession] = useState<SatsangJoinResult | null>(null);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [name, setName] = useState('');
  const [gotram, setGotram] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deity = getDeity(DEITY);

  useManualJapaTouchLock(step === 'mala');

  useEffect(() => {
    let cancelled = false;
    void loadSatsangStatus().then((s) => {
      if (cancelled) return;
      setStatus(s);
      if (!s.open) return;
      setStep(videoAlreadySeen() ? 'gate' : 'video');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || step === 'boot' || step === 'video') return;
    primeAudio();
    ensureMantraPreloaded(DEITY);
  }, [user?.uid, step]);

  useEffect(() => {
    return () => {
      stopAllMantras();
      if (shareUrl) URL.revokeObjectURL(shareUrl);
    };
  }, [shareUrl]);

  const onVideoClose = () => {
    markVideoSeen();
    setStep('gate');
  };

  const onJoin = async () => {
    setJoinError(null);
    setJoining(true);
    const res = await joinSatsang(code);
    setJoining(false);
    if (!res.ok) {
      setJoinError(res.error);
      return;
    }
    setSession(res.result);
    setName((n) => n || res.result.displayName || user?.displayName || '');
    if (res.result.completed108) {
      setCount(AUTO_JAPAM_SESSION_TARGET);
      countRef.current = AUTO_JAPAM_SESSION_TARGET;
      setStep('pdf');
      return;
    }
    setCount(0);
    countRef.current = 0;
    setStep('mala');
  };

  const onBead = useCallback(() => {
    if (countRef.current >= AUTO_JAPAM_SESSION_TARGET) return;
    const next = Math.min(countRef.current + 1, AUTO_JAPAM_SESSION_TARGET);
    countRef.current = next;
    setCount(next);
    pulseMalaBeadTouchHaptic();
    void playMantraOnce(DEITY);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setHandwritingDataUrl(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    setProcessingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') resolve(result);
          else reject(new Error('Could not read file'));
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const cleaned = await removeBackgroundFromImage(dataUrl);
      setHandwritingDataUrl(cleaned);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onPdfAndShare = async () => {
    if (!session) return;
    if (!name.trim()) {
      setUploadError(t('ganeshotsav.nameRequired'));
      return;
    }
    if (!gotram.trim()) {
      setUploadError(t('ganeshotsav.gotramRequired'));
      return;
    }
    if (!mobileNumber.trim()) {
      setUploadError(t('ganeshotsav.mobileRequired'));
      return;
    }
    if (!handwritingDataUrl) {
      setUploadError(t('ganeshotsav.handwritingRequired'));
      return;
    }
    setSaving(true);
    setUploadError(null);
    try {
      const saved = await completeSatsang({
        eventId: session.eventId,
        isTrial: session.isTrial,
        name: name.trim(),
        gotram: gotram.trim(),
        mobileNumber: mobileNumber.trim(),
      });
      if (!saved.ok) {
        setUploadError(saved.error);
        return;
      }
      await downloadMantraPdf(
        deity.mantra,
        AUTO_JAPAM_SESSION_TARGET,
        deity.name,
        { name: name.trim(), gotram: gotram.trim(), mobileNumber: mobileNumber.trim() },
        handwritingDataUrl,
        {
          matchTierNote: `${session.orgName} · ${session.eventName}`,
          fileStem: `ganeshotsav-ganesh-${AUTO_JAPAM_SESSION_TARGET}`,
          festivalCredit: true,
        },
      );
      const blob = await renderSatsangDevoteeCardBlob({
        orgName: session.orgName,
        eventName: session.eventName,
        devoteeName: name.trim(),
        dateLabel: formatIstDateTime(),
      });
      if (blob) {
        if (shareUrl) URL.revokeObjectURL(shareUrl);
        setShareUrl(URL.createObjectURL(blob));
      }
      setStep('share');
    } finally {
      setSaving(false);
    }
  };

  if (status && status.open !== true) {
    return <Navigate to="/" replace />;
  }

  if (step === 'boot' || !status) {
    return (
      <div className="relative min-h-[100dvh] flex items-center justify-center">
        <p className="text-amber-200 text-sm">Loading…</p>
      </div>
    );
  }

  const joinedLabel =
    session == null
      ? null
      : session.place
        ? t('ganeshotsav.orgEventPlace', {
            org: session.orgName,
            event: session.eventName,
            place: session.place,
          })
        : t('ganeshotsav.orgEvent', { org: session.orgName, event: session.eventName });

  const banner = (
    <div className="text-center px-3 mb-3">
      <h1 className="text-xl sm:text-2xl font-bold text-amber-400" style={{ fontFamily: 'serif' }}>
        {t('ganeshotsav.yagnaTitle')}
      </h1>
      {joinedLabel ? (
        <p className="text-amber-100/85 text-sm mt-1">{joinedLabel}</p>
      ) : (
        <p className="text-amber-200/70 text-xs mt-1">{t('ganeshotsav.codeHint')}</p>
      )}
    </div>
  );

  return (
    <div className="relative min-h-[100dvh] flex flex-col overflow-hidden">
      <InstallPrompt />
      {step === 'video' ? <OpeningVideoModal onClose={onVideoClose} /> : null}

      {step === 'gate' ? (
        <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {banner}
          <p className="text-amber-200/80 text-sm text-center max-w-sm mb-4">{t('ganeshotsav.yagnaBlurb')}</p>
          {!user ? (
            <>
              <p className="text-amber-300 text-xs text-center mb-3 max-w-xs">{t('ganeshotsav.signInSticky')}</p>
              {isFirebaseConfigured ? <GoogleSignIn /> : <p className="text-red-300 text-sm">Sign-in is not configured.</p>}
            </>
          ) : (
            <>
              <p className="text-amber-200/80 text-xs mb-3">
                {t('ganeshotsav.signedInAs', { name: user.displayName || user.email || 'devotee' })}
              </p>
              <label className="w-full max-w-sm text-amber-200 text-xs mb-1">{t('ganeshotsav.codeLabel')}</label>
              <p className="w-full max-w-sm text-amber-200/60 text-[11px] mb-2">{t('ganeshotsav.codeHint')}</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('ganeshotsav.codePlaceholder')}
                autoCapitalize="characters"
                className="w-full max-w-sm px-3 py-3 rounded-xl bg-black/40 text-white border border-amber-500/40 tracking-[0.2em] text-center text-lg"
              />
              {joinError ? <p className="text-red-300 text-xs mt-2 max-w-sm text-center">{joinError}</p> : null}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                disabled={joining || authLoading || !code.trim()}
                onClick={() => void onJoin()}
                className="mt-4 w-full max-w-sm py-3.5 rounded-2xl font-semibold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50"
              >
                {joining ? t('ganeshotsav.joining') : t('ganeshotsav.join')}
              </motion.button>
            </>
          )}
        </div>
      ) : null}

      {step === 'mala' && session ? (
        <div className="relative z-10 flex min-h-[100dvh] flex-col overflow-hidden">
          <div className="relative z-20 shrink-0 px-3 pt-3">
            {banner}
            <p className="text-center text-amber-100/80 text-xs italic">{deity.mantra}</p>
            <p
              className="text-[clamp(2.75rem,16vw,4rem)] font-bold text-white tabular-nums leading-none text-center drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)]"
              aria-live="polite"
            >
              {count}
              <span className="text-[0.42em] font-semibold text-amber-200/55"> / {AUTO_JAPAM_SESSION_TARGET}</span>
            </p>
            <p className="text-amber-200/70 text-[11px] text-center mt-1 px-4">
              {count >= AUTO_JAPAM_SESSION_TARGET ? t('ganeshotsav.sessionComplete') : t('ganeshotsav.malaHint')}
            </p>
          </div>
          <div className="relative z-20 flex-1 flex items-end justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <ManualMalaJapaPad
              className={count >= AUTO_JAPAM_SESSION_TARGET ? 'opacity-45' : ''}
              onBead={onBead}
              sessionCount={count}
              sessionCountRef={countRef}
              disabled={count >= AUTO_JAPAM_SESSION_TARGET}
              sessionTarget={AUTO_JAPAM_SESSION_TARGET}
            />
          </div>
          {count >= AUTO_JAPAM_SESSION_TARGET ? (
            <div className="relative z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setStep('pdf')}
                className="w-full max-w-md mx-auto block py-3.5 rounded-2xl font-semibold text-white bg-emerald-600"
              >
                {t('ganeshotsav.pdfTitle')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'pdf' && session ? (
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-md mx-auto w-full">
          {banner}
          <h2 className="text-lg font-bold text-amber-400 mb-1">{t('ganeshotsav.pdfTitle')}</h2>
          <p className="text-amber-200/80 text-xs mb-4">{t('ganeshotsav.pdfBlurb')}</p>
          <div className="mb-4 p-3 rounded-lg bg-black/30 border border-amber-500/20">
            <img
              src={HANDWRITING_SAMPLE_SRC}
              alt=""
              className="max-h-14 object-contain border border-amber-500/20 rounded bg-white/5 mx-auto mb-2"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void onFileChange(e)}
              disabled={processingImage}
              className="block w-full text-amber-200/80 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-amber-500/80 file:text-white file:text-xs disabled:opacity-60"
            />
            {processingImage ? <p className="text-amber-400 text-xs mt-2">Removing background…</p> : null}
            {handwritingDataUrl && !processingImage ? <p className="text-emerald-400 text-xs mt-2">Image ready</p> : null}
          </div>
          <label className="block text-amber-200/80 text-xs mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
          />
          <label className="block text-amber-200/80 text-xs mb-1">Gotram</label>
          <input
            value={gotram}
            onChange={(e) => setGotram(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
          />
          <label className="block text-amber-200/80 text-xs mb-1">Mobile number</label>
          <input
            type="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
          />
          {uploadError ? <p className="text-red-400 text-xs mb-3">{uploadError}</p> : null}
          <button
            type="button"
            disabled={saving || processingImage}
            onClick={() => void onPdfAndShare()}
            className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            {saving ? t('ganeshotsav.generating') : t('ganeshotsav.downloadPdf')}
          </button>
        </div>
      ) : null}

      {step === 'share' ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {banner}
          <h2 className="text-lg font-bold text-amber-400 mb-1">{t('ganeshotsav.shareTitle')}</h2>
          <p className="text-amber-200/80 text-sm text-center max-w-sm mb-4">{t('ganeshotsav.shareReady')}</p>
          {shareUrl ? (
            <button
              type="button"
              onClick={() => {
                void fetch(shareUrl)
                  .then((r) => r.blob())
                  .then((b) => downloadBlobPng(b, 'ganeshotsav-satsang.png'));
              }}
              className="w-full max-w-sm py-3 rounded-2xl bg-amber-500 text-white font-semibold mb-3"
            >
              {t('ganeshotsav.downloadImage')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="w-full max-w-sm py-3 rounded-2xl bg-emerald-600 text-white font-semibold"
          >
            {t('ganeshotsav.enterMain')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
