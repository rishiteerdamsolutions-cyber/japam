import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { OpeningVideoModal } from '../components/landing/OpeningVideoModal';
import { InstallPrompt } from '../components/ui/InstallPrompt';
import { ManualMalaJapaPad } from '../components/japamCounter/ManualMalaJapaPad';
import { GoogleSignIn } from '../components/auth/GoogleSignIn';
import { AuthSessionRestoreHint } from '../components/auth/AuthSessionRestoreHint';
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
import {
  clearGaneshotsavDraft,
  draftMatchesUid,
  readGaneshotsavDraft,
  writeGaneshotsavDraft,
  type GaneshotsavDraftStep,
} from '../lib/ganeshotsavDraft';
import { downloadBlobPngAsync, renderSatsangDevoteeCardBlob } from '../lib/satsangShareCard';
import { downloadMantraPdf } from '../utils/pdfExport';
import { preloadBackgroundRemovalModel, removeBackgroundFromImage } from '../utils/removeBackground';
import { formatIstDateTime } from '../lib/japamCounterIst';
import { auth, isFirebaseConfigured } from '../lib/firebase';

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

function stepAfterJoin(result: SatsangJoinResult, localCount: number): Step {
  if (result.completed108 || localCount >= AUTO_JAPAM_SESSION_TARGET) return 'pdf';
  return 'mala';
}

function applyDraftToState(
  draft: ReturnType<typeof readGaneshotsavDraft>,
  setters: {
    setCode: (v: string) => void;
    setSession: (v: SatsangJoinResult | null) => void;
    setCount: (v: number) => void;
    countRef: { current: number };
    setName: (v: string) => void;
    setGotram: (v: string) => void;
    setMobileNumber: (v: string) => void;
    setHandwritingDataUrl: (v: string | null) => void;
    setPdfDownloaded: (v: boolean) => void;
    setShareImageDownloaded: (v: boolean) => void;
    setCompleted108Saved: (v: boolean) => void;
    setStep: (v: Step) => void;
  },
) {
  if (!draft) return false;
  const count = Math.max(0, Math.min(AUTO_JAPAM_SESSION_TARGET, draft.count));
  setters.setCode(draft.code);
  setters.setSession(draft.session);
  setters.setCount(count);
  setters.countRef.current = count;
  setters.setName(draft.name);
  setters.setGotram(draft.gotram);
  setters.setMobileNumber(draft.mobileNumber);
  setters.setHandwritingDataUrl(draft.handwritingDataUrl);
  setters.setPdfDownloaded(draft.pdfDownloaded === true);
  setters.setShareImageDownloaded(draft.shareImageDownloaded === true);
  setters.setCompleted108Saved(draft.completed108Saved === true);
  if (!draft.session) {
    setters.setStep('gate');
    return true;
  }
  if (draft.step === 'share' || (draft.pdfDownloaded && !draft.shareImageDownloaded)) {
    setters.setStep('share');
    return true;
  }
  if (draft.completed108Saved || draft.session.completed108 || count >= AUTO_JAPAM_SESSION_TARGET) {
    setters.setStep('pdf');
    return true;
  }
  setters.setStep(draft.step === 'gate' ? 'gate' : stepAfterJoin(draft.session, count));
  return true;
}

export function GaneshotsavPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const signInPending = useAuthStore((s) => s.signInPending);
  const firebaseUser = auth?.currentUser ?? null;
  const authRestoring = authLoading || signInPending || (!user && !!firebaseUser);
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
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareDownloading, setShareDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [shareImageDownloaded, setShareImageDownloaded] = useState(false);
  const [completed108Saved, setCompleted108Saved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareBlobRef = useRef<Blob | null>(null);
  const pendingPhotoRef = useRef<string | null>(null);
  const resumedRef = useRef(false);
  const deity = getDeity(DEITY);

  const persistableStep = (current: Step): GaneshotsavDraftStep | null => {
    if (current === 'gate' || current === 'mala' || current === 'pdf' || current === 'share') return current;
    return null;
  };

  const persistDraft = useCallback(() => {
    const draftStep = persistableStep(step);
    if (!draftStep || !status?.open) return;
    writeGaneshotsavDraft({
      v: 1,
      uid: user?.uid ?? null,
      step: draftStep,
      code,
      session,
      count: countRef.current,
      name,
      gotram,
      mobileNumber,
      handwritingDataUrl,
      completed108Saved,
      pdfDownloaded,
      shareImageDownloaded,
      updatedAt: Date.now(),
    });
  }, [
    step,
    status?.open,
    user?.uid,
    code,
    session,
    name,
    gotram,
    mobileNumber,
    handwritingDataUrl,
    completed108Saved,
    pdfDownloaded,
    shareImageDownloaded,
  ]);

  useManualJapaTouchLock(step === 'mala');

  useEffect(() => {
    let cancelled = false;
    void loadSatsangStatus().then((s) => {
      if (cancelled) return;
      setStatus(s);
      if (!s.open) return;
      const draft = readGaneshotsavDraft();
      if (draft && draftMatchesUid(draft, user?.uid)) {
        applyDraftToState(draft, {
          setCode,
          setSession,
          setCount,
          countRef,
          setName,
          setGotram,
          setMobileNumber,
          setHandwritingDataUrl,
          setPdfDownloaded,
          setShareImageDownloaded,
          setCompleted108Saved,
          setStep,
        });
        return;
      }
      setStep(videoAlreadySeen() ? 'gate' : 'video');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once; draft restore must not re-run on sign-in
  }, []);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  useEffect(() => {
    const flush = () => persistDraft();
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [persistDraft]);

  useEffect(() => {
    if (authRestoring || !user?.uid || resumedRef.current) return;
    const draft = readGaneshotsavDraft();
    if (!draft?.code?.trim() || !draft.session) return;
    if (!draftMatchesUid(draft, user.uid)) return;
    resumedRef.current = true;
    setResuming(true);
    void joinSatsang(draft.code)
      .then((res) => {
        if (!res.ok) return;
        const localCount = Math.max(0, Math.min(AUTO_JAPAM_SESSION_TARGET, draft.count));
        setSession(res.result);
        setName((n) => n || res.result.displayName || user.displayName || '');
        if (res.result.completed108 || localCount >= AUTO_JAPAM_SESSION_TARGET) {
          setCount(AUTO_JAPAM_SESSION_TARGET);
          countRef.current = AUTO_JAPAM_SESSION_TARGET;
          setCompleted108Saved(true);
          setStep(draft.pdfDownloaded ? 'share' : 'pdf');
          return;
        }
        setCount(localCount);
        countRef.current = localCount;
        setStep('mala');
      })
      .finally(() => setResuming(false));
  }, [authRestoring, user?.uid, user?.displayName]);

  useEffect(() => {
    if (authRestoring || !user || step !== 'gate' || !session || joining || resuming) return;
    setStep(stepAfterJoin(session, countRef.current));
  }, [authRestoring, user, step, session, joining, resuming]);

  useEffect(() => {
    if (step !== 'share' || !session) return;
    if (shareBlobRef.current) return;
    setShareGenerating(true);
    setShareError(null);
    void renderSatsangDevoteeCardBlob({
      orgName: session.orgName,
      eventName: session.eventName,
      devoteeName: name.trim() || session.displayName,
      dateLabel: formatIstDateTime(),
    })
      .then((blob) => {
        if (!blob) {
          setShareError(t('ganeshotsav.shareDownloadFailed'));
          return;
        }
        shareBlobRef.current = blob;
        setShareUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => setShareError(t('ganeshotsav.shareDownloadFailed')))
      .finally(() => setShareGenerating(false));
  }, [step, session, name, t]);

  useEffect(() => {
    if (step === 'pdf') void preloadBackgroundRemovalModel();
  }, [step]);

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
      setCompleted108Saved(true);
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
    writeGaneshotsavDraft({
      v: 1,
      uid: user?.uid ?? null,
      step: 'mala',
      code,
      session,
      count: next,
      name,
      gotram,
      mobileNumber,
      handwritingDataUrl,
      completed108Saved,
      pdfDownloaded,
      shareImageDownloaded,
      updatedAt: Date.now(),
    });
  }, [
    user?.uid,
    code,
    session,
    name,
    gotram,
    mobileNumber,
    handwritingDataUrl,
    completed108Saved,
    pdfDownloaded,
    shareImageDownloaded,
  ]);

  const onFileInputClick = () => {
    persistDraft();
  };

  const openPhotoPicker = () => {
    if (processingImage) return;
    persistDraft();
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const processHandwritingPhoto = async (dataUrl: string) => {
    setUploadError(null);
    setUploadNotice(null);
    setProcessingImage(true);
    pendingPhotoRef.current = dataUrl;
    try {
      const cleaned = await removeBackgroundFromImage(dataUrl);
      pendingPhotoRef.current = null;
      setHandwritingDataUrl(cleaned);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('ganeshotsav.backgroundFailed'));
    } finally {
      setProcessingImage(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadNotice(null);
      setUploadError(t('ganeshotsav.imageTypeRequired'));
      return;
    }

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
      await processHandwritingPhoto(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('ganeshotsav.imageReadFailed'));
    }
  };

  const retryBackgroundRemoval = () => {
    if (!pendingPhotoRef.current && !handwritingDataUrl) return;
    const source = pendingPhotoRef.current ?? handwritingDataUrl;
    if (!source) return;
    void processHandwritingPhoto(source);
  };

  const ensureShareBlob = async (): Promise<Blob | null> => {
    if (shareBlobRef.current) return shareBlobRef.current;
    if (!session) return null;
    const blob = await renderSatsangDevoteeCardBlob({
      orgName: session.orgName,
      eventName: session.eventName,
      devoteeName: name.trim() || session.displayName,
      dateLabel: formatIstDateTime(),
    });
    if (blob) {
      shareBlobRef.current = blob;
      setShareUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    }
    return blob;
  };

  const onDownloadShareImage = async () => {
    setShareError(null);
    setShareNotice(null);
    setShareDownloading(true);
    try {
      const blob = await ensureShareBlob();
      if (!blob) {
        setShareError(t('ganeshotsav.shareDownloadFailed'));
        return;
      }
      const result = await downloadBlobPngAsync(blob, 'ganeshotsav-satsang.png');
      if (result === 'failed') {
        setShareError(t('ganeshotsav.shareDownloadFailed'));
        return;
      }
      setShareNotice(t('ganeshotsav.shareSaved'));
      setShareImageDownloaded(true);
      writeGaneshotsavDraft({
        v: 1,
        uid: user?.uid ?? null,
        step: 'share',
        code,
        session,
        count: countRef.current,
        name,
        gotram,
        mobileNumber,
        handwritingDataUrl,
        completed108Saved: true,
        pdfDownloaded: true,
        shareImageDownloaded: true,
        updatedAt: Date.now(),
      });
    } finally {
      setShareDownloading(false);
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
    if (processingImage) {
      setUploadError(t('ganeshotsav.processingPhoto'));
      return;
    }
    setSaving(true);
    setUploadError(null);
    try {
      let finalHandwriting = handwritingDataUrl;
      setUploadNotice(t('ganeshotsav.processingPhoto'));
      try {
        finalHandwriting = await removeBackgroundFromImage(handwritingDataUrl);
        setHandwritingDataUrl(finalHandwriting);
        pendingPhotoRef.current = null;
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : t('ganeshotsav.backgroundFailed'));
        return;
      } finally {
        setUploadNotice(null);
      }

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
      setCompleted108Saved(true);
      await downloadMantraPdf(
        deity.mantra,
        AUTO_JAPAM_SESSION_TARGET,
        deity.name,
        { name: name.trim(), gotram: gotram.trim(), mobileNumber: mobileNumber.trim() },
        finalHandwriting,
        {
          matchTierNote: `${session.orgName} · ${session.eventName}`,
          fileStem: `ganeshotsav-ganesh-${AUTO_JAPAM_SESSION_TARGET}`,
          festivalCredit: true,
        },
      );
      setPdfDownloaded(true);
      const blob = await renderSatsangDevoteeCardBlob({
        orgName: session.orgName,
        eventName: session.eventName,
        devoteeName: name.trim(),
        dateLabel: formatIstDateTime(),
      });
      if (blob) {
        shareBlobRef.current = blob;
        if (shareUrl) URL.revokeObjectURL(shareUrl);
        setShareUrl(URL.createObjectURL(blob));
      }
      writeGaneshotsavDraft({
        v: 1,
        uid: user?.uid ?? null,
        step: 'share',
        code,
        session,
        count: AUTO_JAPAM_SESSION_TARGET,
        name: name.trim(),
        gotram: gotram.trim(),
        mobileNumber: mobileNumber.trim(),
        handwritingDataUrl,
        completed108Saved: true,
        pdfDownloaded: true,
        shareImageDownloaded: false,
        updatedAt: Date.now(),
      });
      setStep('share');
    } finally {
      setSaving(false);
    }
  };

  if (status && status.open !== true) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-amber-200/80 text-sm max-w-sm">{t('ganeshotsav.closed')}</p>
        <button
          type="button"
          onClick={() => navigate('/menu', { replace: true })}
          className="mt-6 w-full max-w-sm py-3 rounded-2xl bg-emerald-600 text-white font-semibold"
        >
          {t('ganeshotsav.enterMain')}
        </button>
      </div>
    );
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
          {!authRestoring && !user ? (
            <>
              <p className="text-amber-300 text-xs text-center mb-3 max-w-xs">{t('ganeshotsav.signInSticky')}</p>
              {isFirebaseConfigured ? <GoogleSignIn /> : <p className="text-red-300 text-sm">Sign-in is not configured.</p>}
            </>
          ) : authRestoring ? (
            <div className="flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" aria-hidden />
              <AuthSessionRestoreHint className="max-w-xs text-center animate-none" />
              <p className="text-amber-200/75 text-xs">{t('ganeshotsav.restoringSignIn')}</p>
            </div>
          ) : resuming ? (
            <div className="flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" aria-hidden />
              <p className="text-amber-200/75 text-xs">{t('ganeshotsav.resumingSession')}</p>
            </div>
          ) : user ? (
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
          ) : null}
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
              onClick={onFileInputClick}
              onChange={(e) => void onFileChange(e)}
              disabled={processingImage}
              className="sr-only"
              aria-hidden
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={openPhotoPicker}
              disabled={processingImage}
              className="w-full py-3 rounded-xl bg-amber-500/90 text-white text-sm font-semibold disabled:opacity-50"
            >
              {processingImage ? t('ganeshotsav.processingPhoto') : t('ganeshotsav.choosePhoto')}
            </button>
            {handwritingDataUrl ? (
              <img
                src={handwritingDataUrl}
                alt=""
                className="mt-3 max-h-24 object-contain border border-emerald-500/30 rounded bg-white/5 mx-auto"
              />
            ) : null}
            {processingImage ? <p className="text-amber-400 text-xs mt-2">{t('ganeshotsav.processingPhoto')}</p> : null}
            {handwritingDataUrl && !processingImage ? (
              <p className="text-emerald-400 text-xs mt-2">{t('ganeshotsav.imageReady')}</p>
            ) : null}
            {uploadError ? <p className="text-red-400 text-xs mt-2">{uploadError}</p> : null}
            {uploadError && (pendingPhotoRef.current || handwritingDataUrl) ? (
              <button
                type="button"
                onClick={retryBackgroundRemoval}
                disabled={processingImage}
                className="mt-2 w-full py-2 rounded-lg border border-amber-500/40 text-amber-200 text-xs disabled:opacity-50"
              >
                {t('ganeshotsav.retryBackground')}
              </button>
            ) : null}
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
          {uploadNotice ? <p className="text-amber-200/80 text-xs mb-3">{uploadNotice}</p> : null}
          {uploadError ? <p className="text-red-400 text-xs mb-3">{uploadError}</p> : null}
          <button
            type="button"
            disabled={saving || processingImage || !handwritingDataUrl}
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
          <p className="text-emerald-300 text-sm font-semibold text-center max-w-sm mb-2">
            {t('ganeshotsav.pdfDownloadedSuccess')}
          </p>
          <h2 className="text-lg font-bold text-amber-400 mb-1">{t('ganeshotsav.shareTitle')}</h2>
          <p className="text-amber-200/80 text-sm text-center max-w-sm mb-4">{t('ganeshotsav.shareWhatsAppPrompt')}</p>
          {shareGenerating ? (
            <p className="text-amber-200/70 text-xs mb-4">{t('ganeshotsav.shareGenerating')}</p>
          ) : null}
          {shareUrl ? (
            <img
              src={shareUrl}
              alt=""
              className="w-full max-w-sm rounded-2xl border border-amber-500/30 mb-3 shadow-lg"
            />
          ) : null}
          <p className="text-amber-200/60 text-[11px] text-center max-w-sm mb-3">{t('ganeshotsav.shareLongPressHint')}</p>
          {shareError ? <p className="text-red-300 text-xs mb-2 max-w-sm text-center">{shareError}</p> : null}
          {shareNotice ? <p className="text-emerald-300 text-xs mb-2 max-w-sm text-center">{shareNotice}</p> : null}
          <button
            type="button"
            disabled={shareDownloading || shareGenerating}
            onClick={() => void onDownloadShareImage()}
            className="w-full max-w-sm py-3 rounded-2xl bg-amber-500 text-white font-semibold mb-3 disabled:opacity-50"
          >
            {shareDownloading ? t('ganeshotsav.generating') : t('ganeshotsav.downloadImage')}
          </button>
          <button
            type="button"
            onClick={() => {
              clearGaneshotsavDraft();
              navigate('/menu', { replace: true });
            }}
            className="w-full max-w-sm py-3 rounded-2xl bg-emerald-600 text-white font-semibold"
          >
            {t('ganeshotsav.enterMain')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
