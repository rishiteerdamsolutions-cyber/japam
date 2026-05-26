import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NaturalBackButton } from '../components/nav/NaturalBackButton';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { DEITIES, DEITY_IDS, getDeity, type DeityId } from '../data/deities';
import {
  SHODASHOPACHARA_LEFT,
  SHODASHOPACHARA_RIGHT,
  type ShodashopacharaStep,
} from '../data/shodashopachara';
import { PUSHPA_OFFERINGS, type PushpaOffering, type PushpaOfferingId } from '../data/pushpaOfferings';
import { primeAudio, playMatchSfxSelection, playPushpaUpacharaPlaceholder } from '../hooks/useSound';
import { useJapaStore } from '../store/japaStore';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import {
  loadPushpaAradhanaLeaderboard,
  mapPushpaLeaderboardToRankCardEntries,
  trackShareEvent,
  type PushpaAradhanaLeaderboardEntry,
} from '../lib/firestore';
import { normalizeLeaderboardForRankCard, renderRankCardBlob } from '../lib/rankCard';
import { AccessBadge } from '../components/ui/AccessBadge';

const PUSHPA_CUSTOM_DEITY_PHOTO_ENABLED = false;

const FLYING_SIZE = 44;
const STARTER_PUSHPA_DEITY: DeityId = 'ganesh';

type Flight = {
  key: number;
  offeringId: PushpaOfferingId;
  src: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

type UpacharaModal = { step: ShodashopacharaStep; stepIndex: number };

type ShareResult = { blob: Blob; url: string; shareText: string };

function parseDeity(raw: string | null): DeityId | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return (DEITY_IDS as readonly string[]).includes(s) ? (s as DeityId) : null;
}

function pushpaDeityAllowedForUser(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === STARTER_PUSHPA_DEITY) return true;
  return proOrPremiumActive;
}

function UpacharaSlot({
  step,
  stepIndex,
  onOpen,
}: {
  step: ShodashopacharaStep;
  stepIndex: number;
  onOpen: (step: ShodashopacharaStep, stepIndex: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onOpen(step, stepIndex)}
      className="flex flex-col items-center w-full shrink-0 gap-0.5 min-h-[44px] touch-manipulation active:opacity-90"
    >
      <div className="w-[clamp(2.25rem,11vmin,2.75rem)] h-[clamp(2.25rem,11vmin,2.75rem)] sm:w-10 sm:h-10 rounded-md border border-amber-500/35 bg-[#221018]/90 flex items-center justify-center p-[0.2rem] shadow-inner">
        <img src={step.image} alt="" className="w-full h-full object-contain rounded-sm pointer-events-none" />
      </div>
      <span className="text-[clamp(0.5rem,2.6vw,0.6875rem)] leading-[1.1] text-center text-amber-200/90 px-0.5 line-clamp-3 break-words w-full max-w-[min(100%,4.5rem)]">
        {t(step.i18nKey)}
      </span>
    </button>
  );
}

export function PushpaAradhanaPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const deityId = useMemo(() => parseDeity(searchParams.get('deity')), [searchParams]);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const pushpaBase = useJapaStore((s) => {
    if (!deityId) return s.counts.pushpaAbhishekaJapa ?? 0;
    return s.counts.pushpaAbhishekaJapaByDeity?.[deityId] ?? 0;
  });

  const proOrPremiumActive =
    (tier === 'pro' || tier === 'premium') &&
    hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);
  const unlockPending = Boolean(user?.uid && levelsUnlocked === null);

  const offeringBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const deityImgRef = useRef<HTMLImageElement | null>(null);

  const [flight, setFlight] = useState<Flight | null>(null);
  const flightKeyRef = useRef(0);
  const inFlightRef = useRef(false);
  const completionHandledRef = useRef(false);

  const [upacharaModal, setUpacharaModal] = useState<UpacharaModal | null>(null);
  const [leaderboard, setLeaderboard] = useState<PushpaAradhanaLeaderboardEntry[]>([]);
  const [proRedirectNotice, setProRedirectNotice] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  /** From saved counts: total flowers offered (Pushpa Aradhana), not from the leaderboard fetch. */
  const pushpaMyCount = pushpaBase;

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    void useJapaStore.getState().load(uid);
  }, [user?.uid]);

  const pushpaLbRequestId = useRef(0);
  const setDeity = useCallback(
    (id: DeityId) => {
      setSearchParams({ deity: id }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const req = ++pushpaLbRequestId.current;
    void loadPushpaAradhanaLeaderboard(deityId ?? undefined)
      .then((rows) => {
        if (pushpaLbRequestId.current !== req) return;
        setLeaderboard(rows);
      })
      .catch(() => {
        if (pushpaLbRequestId.current !== req) return;
        setLeaderboard([]);
      });
  }, [deityId]);

  useEffect(() => {
    if (!deityId) return;
    if (unlockPending) return;
    if (!pushpaDeityAllowedForUser(deityId, proOrPremiumActive)) {
      setSearchParams({}, { replace: true });
      setProRedirectNotice(true);
    }
  }, [deityId, proOrPremiumActive, unlockPending, setSearchParams]);

  const handleDeityCardClick = useCallback(
    (id: DeityId) => {
      if (unlockPending) return;
      if (!pushpaDeityAllowedForUser(id, proOrPremiumActive)) {
        navigate('/plans');
        return;
      }
      setDeity(id);
    },
    [navigate, proOrPremiumActive, unlockPending, setDeity],
  );

  const handleUpacharaOpen = useCallback((step: ShodashopacharaStep, stepIndex: number) => {
    primeAudio();
    playPushpaUpacharaPlaceholder(stepIndex);
    setUpacharaModal({ step, stepIndex });
  }, []);

  const handleOfferingClick = useCallback(
    (o: PushpaOffering) => {
      if (inFlightRef.current || !deityId) return;
      const btn = offeringBtnRefs.current[o.id];
      const img = deityImgRef.current;
      if (!btn || !img) return;

      primeAudio();

      const thumb = btn.querySelector<HTMLImageElement>('[data-pushpa-offering-thumb]');
      const br = thumb?.getBoundingClientRect() ?? btn.getBoundingClientRect();
      const ir = img.getBoundingClientRect();

      const fromX = br.left + br.width / 2 - FLYING_SIZE / 2;
      const fromY = br.top + br.height / 2 - FLYING_SIZE / 2;

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      let contentBottom = ir.bottom;
      if (nw > 0 && nh > 0) {
        const scale = Math.min(ir.width / nw, ir.height / nh);
        contentBottom = ir.top + nh * scale;
      }

      const toX = ir.left + ir.width / 2 - FLYING_SIZE / 2;
      const toY = Math.max(
        ir.top + 4,
        contentBottom - FLYING_SIZE + FLYING_SIZE * 0.32,
      );

      const run = () => {
        inFlightRef.current = true;
        completionHandledRef.current = false;
        flightKeyRef.current += 1;
        setFlight({
          key: flightKeyRef.current,
          offeringId: o.id,
          src: o.image,
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY },
        });
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    },
    [deityId],
  );

  const onFlightComplete = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    setFlight(null);
    inFlightRef.current = false;
    if (deityId) {
      playMatchSfxSelection({ deity: deityId, tier: 3 });
      if (user) {
        useJapaStore.getState().addPushpaAradhanaCount(deityId, 1);
        void loadPushpaAradhanaLeaderboard(deityId)
          .then(setLeaderboard)
          .catch(() => {});
      }
    }
  }, [deityId, user]);

  const closeShareResult = useCallback(() => {
    if (shareResult?.url) URL.revokeObjectURL(shareResult.url);
    setShareResult(null);
    setShareError(null);
    setShareNotice(null);
  }, [shareResult?.url]);

  const downloadShareImageAgain = useCallback(() => {
    if (!shareResult) return;
    const a = document.createElement('a');
    a.href = shareResult.url;
    a.download = 'japam-pushpa-aradhana.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [shareResult]);

  const handleDownloadRankCard = useCallback(async () => {
    if (!user?.uid) {
      setShareError(t('pushpa.rankCardSignIn'));
      return;
    }
    if (sharing) return;
    setShareError(null);
    setShareNotice(null);
    setSharing(true);
    try {
      const scope = deityId ?? undefined;
      const lbFresh = await loadPushpaAradhanaLeaderboard(scope);
      if (lbFresh.length > 0) {
        setLeaderboard(lbFresh);
      }
      const lbForCard = lbFresh.length > 0 ? lbFresh : leaderboard;
      const lbNormalized = normalizeLeaderboardForRankCard(mapPushpaLeaderboardToRankCardEntries(lbForCard));
      const solo = lbNormalized.length === 0;
      const c = useJapaStore.getState().counts;
      const pushpaForCard = deityId
        ? c.pushpaAbhishekaJapaByDeity?.[deityId] ?? 0
        : c.pushpaAbhishekaJapa ?? 0;
      const participated = pushpaForCard > 0;
      const deityLabel = deityId ? t(`deities.${deityId}`) : '';
      const headerName = deityId
        ? t('pushpa.rankCardHeaderWithDeity', { deity: deityLabel })
        : t('pushpa.rankCardHeaderPicker');
      const summaryLine = t('pushpa.rankCardSummary', { count: pushpaForCard });
      const blob = await renderRankCardBlob({
        title: 'PUSHPA ARADHANA',
        headerName,
        deityName: '',
        subtitleLine: '',
        leaderboard: lbNormalized,
        currentUserUid: user.uid,
        currentUserJapasOverride: pushpaForCard,
        currentUserDisplayName: user.displayName || user.email?.split('@')[0] || undefined,
        currentUserParticipated: participated,
        soloPersonalMarathon: solo,
        rankCardFooterSoloLine: solo ? t('pushpa.rankCardFooterSolo') : undefined,
        rankCardFooterCtaLine: solo ? undefined : t('pushpa.rankCardFooterCommunity'),
        japaSummaryLine: summaryLine,
        leaderboardScoreUnit: t('pushpa.rankCardScoreUnit'),
      });
      if (!blob) throw new Error('blob');
      const url = URL.createObjectURL(blob);
      setShareResult({
        blob,
        url,
        shareText: `${headerName} — ${summaryLine} www.japam.digital`,
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = 'japam-pushpa-aradhana.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShareNotice(t('pushpa.rankCardWhatsAppHint'));
      trackShareEvent('pushpa_rank_card').catch(() => {});
    } catch {
      setShareError(t('pushpa.rankCardFailed'));
    } finally {
      setSharing(false);
    }
  }, [deityId, leaderboard, sharing, t, user]);

  const leaderboardBlock = (
    <div className="w-full max-w-lg mt-3 sm:mt-4 rounded-xl border border-amber-500/25 bg-black/30 p-2.5 sm:p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5 sm:mb-2">
        <h2 className="text-amber-200 text-[0.65rem] sm:text-xs font-semibold uppercase tracking-wide">
          {t('pushpa.leaderboardTitle')}
        </h2>
        {user ? (
          <button
            type="button"
            onClick={() => void handleDownloadRankCard()}
            disabled={sharing}
            className="shrink-0 self-start sm:self-auto px-2.5 py-1.5 rounded-lg bg-amber-500/90 text-white text-[clamp(0.55rem,2.8vw,0.7rem)] font-semibold shadow-md disabled:opacity-50 touch-manipulation"
          >
            {sharing ? '…' : t('pushpa.downloadRankCard')}
          </button>
        ) : null}
      </div>
      {shareError ? <p className="text-amber-400/95 text-[clamp(0.55rem,2.8vw,0.7rem)] mb-2">{shareError}</p> : null}
      {leaderboard.length === 0 ? (
        <p className="text-amber-200/60 text-[clamp(0.6rem,3vw,0.75rem)]">{t('pushpa.leaderboardEmpty')}</p>
      ) : (
        <>
          <div
            className="flex items-center justify-between gap-2 text-[clamp(0.5rem,2.6vw,0.65rem)] text-amber-200/55 uppercase tracking-wide mb-1 px-0.5"
            aria-hidden
          >
            <span className="shrink-0 w-[2.5rem]">{t('pushpa.leaderboardColRank')}</span>
            <span className="flex-1 text-left">{t('pushpa.leaderboardColName')}</span>
            <span className="shrink-0 text-right min-w-[3.25rem]">{t('pushpa.leaderboardColFlowers')}</span>
          </div>
          <ul className="space-y-1.5 max-h-[min(36svh,11rem)] sm:max-h-44 overflow-y-auto overscroll-contain pr-1 touch-pan-y">
            {leaderboard.map((row) => (
              <li
                key={`${row.uid}-${row.rank}`}
                className="flex items-center justify-between gap-2 text-[clamp(0.6rem,3.1vw,0.75rem)] text-amber-100/90"
              >
                <span className="text-amber-400/90 shrink-0 w-[2.5rem]">
                  {t('pushpa.leaderboardRank', { rank: row.rank })}
                </span>
                <span className="truncate flex-1 text-left">{row.name}</span>
                <span className="shrink-0 tabular-nums text-right min-w-[3.25rem]">
                  {user?.uid === row.uid ? pushpaMyCount : row.pushpaCount}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  const shareResultModal =
    shareResult ? (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
        <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-5 max-w-sm w-full shadow-xl">
          <h2 className="text-xl font-bold text-amber-400 mb-2">{t('pushpa.rankCardTitle')}</h2>
          <p className="text-amber-200/80 text-sm mb-2">{t('pushpa.rankCardDownloaded')}</p>
          {shareNotice ? <p className="text-amber-200/70 text-xs mb-4">{shareNotice}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadShareImageAgain}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm touch-manipulation"
            >
              {t('pushpa.downloadRankCardAgain')}
            </button>
          </div>
          <button
            type="button"
            onClick={closeShareResult}
            className="mt-3 w-full py-2 rounded-xl bg-white/5 text-amber-200/80 text-sm touch-manipulation"
          >
            {t('pushpa.upacharaClose')}
          </button>
        </div>
      </div>
    ) : null;

  if (!deityId) {
    return (
      <>
      <div className="relative min-h-[100dvh] flex flex-col items-center px-3 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-28 overflow-y-auto overflow-x-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 w-full max-w-[min(100%,28rem)] flex flex-col items-center">
          <NaturalBackButton
            fallback="/specials"
            labelKey="pushpa.back"
            className="self-start text-amber-300/90 text-sm mb-4 hover:underline"
          />
          <h1 className="text-[clamp(1.05rem,4.5vw,1.35rem)] font-bold text-amber-300 text-center mb-1 px-1">
            {t('pushpa.title')}
          </h1>
          <p className="text-amber-200/80 text-[clamp(0.7rem,3.2vw,0.8rem)] text-center mb-2 max-w-sm px-1">
            {t('pushpa.chooseDeity')}
          </p>
          {proRedirectNotice ? (
            <p className="text-amber-400/95 text-[11px] text-center mb-2 max-w-sm">{t('pushpa.proRedirectOnly')}</p>
          ) : (
            <p className="text-amber-200/70 text-[10px] text-center mb-2 max-w-sm">{t('pushpa.proGateNotice')}</p>
          )}
          {authLoading ? (
            <p className="text-amber-200/50 text-[10px] text-center mb-3 max-w-sm">…</p>
          ) : !user ? (
            <p className="text-amber-200/60 text-[10px] text-center mb-3 max-w-sm">
              {t('pushpa.yourPushpaCountSignedOut')}
            </p>
          ) : (
            <p className="text-amber-200/80 text-[11px] text-center mb-3 tabular-nums">
              {t('pushpa.yourPushpaCount', { count: pushpaMyCount })}
            </p>
          )}
          {user && unlockPending ? (
            <p className="text-amber-200/75 text-[11px] text-center py-10 w-full">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2 sm:gap-3 w-full">
              {DEITIES.map((d, i) => {
                const locked = !pushpaDeityAllowedForUser(d.id, proOrPremiumActive);
                return (
                  <motion.button
                    key={d.id}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`relative flex flex-col items-center rounded-2xl overflow-hidden border hover:border-amber-400/50 ${
                      locked ? 'bg-black/30 border-white/15' : 'bg-black/40 border-white/20'
                    }`}
                    onClick={() => handleDeityCardClick(d.id)}
                  >
                    {locked ? (
                      <AccessBadge
                        variant="pro"
                        label={t('pushpa.proGateCard')}
                        className="absolute top-2 right-2 z-[2]"
                      />
                    ) : d.id === STARTER_PUSHPA_DEITY && !proOrPremiumActive ? (
                      <AccessBadge
                        variant="free"
                        label={t('common.free', { defaultValue: 'Free' })}
                        className="absolute top-2 right-2 z-[2]"
                      />
                    ) : null}
                    <div className="w-full aspect-square relative bg-black/30">
                      <img src={d.image} alt="" className={`w-full h-full object-cover ${locked ? 'opacity-55' : ''}`} />
                    </div>
                    <span className="py-2 px-2 text-xs font-semibold text-white truncate w-full text-center">
                      {t(`deities.${d.id}`)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
          {leaderboardBlock}
        </div>
      </div>
      {shareResultModal}
      </>
    );
  }

  const deity = getDeity(deityId);

  return (
    <>
    <div className="relative min-h-[100dvh] flex flex-col px-[clamp(0.35rem,2vw,0.75rem)] pt-1 sm:pt-2 pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(7.25rem+env(safe-area-inset-bottom))] overflow-hidden touch-pan-y">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full max-w-[min(100%,40rem)] mx-auto">
        <div className="flex items-center justify-between gap-2 shrink-0 mb-0.5 sm:mb-1 px-0.5">
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: true })}
            className="text-amber-300/90 text-[clamp(0.65rem,3.2vw,0.875rem)] hover:underline py-1 min-h-[44px] sm:min-h-0 flex items-center"
          >
            {t('pushpa.changeDeity')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="text-amber-300/90 text-[clamp(0.65rem,3.2vw,0.875rem)] hover:underline py-1 min-h-[44px] sm:min-h-0 flex items-center"
          >
            {t('pushpa.menu')}
          </button>
        </div>
        <p
          className="text-amber-200/80 text-[clamp(0.58rem,2.8vw,0.75rem)] text-center truncate px-1"
          title={t(`deities.${deityId}`)}
        >
          {t(`deities.${deityId}`)} · {t('pushpa.title')}
        </p>
        {authLoading ? (
          <p className="text-center text-amber-200/50 text-[clamp(0.55rem,2.6vw,0.65rem)] shrink-0 px-1">…</p>
        ) : user ? (
          <p className="text-center text-amber-200/65 text-[clamp(0.55rem,2.6vw,0.65rem)] tabular-nums shrink-0 px-1">
            {t('pushpa.yourPushpaCount', { count: pushpaMyCount })}
          </p>
        ) : (
          <p className="text-center text-amber-200/50 text-[clamp(0.55rem,2.6vw,0.65rem)] shrink-0 px-1">
            {t('pushpa.yourPushpaCountSignedOut')}
          </p>
        )}
        {user ? (
          <div className="flex flex-col items-center gap-1 shrink-0 px-1 mt-0.5">
            <button
              type="button"
              onClick={() => void handleDownloadRankCard()}
              disabled={sharing}
              className="px-3 py-1.5 rounded-lg bg-amber-500/90 text-white text-[clamp(0.6rem,2.8vw,0.75rem)] font-semibold shadow-md disabled:opacity-50 touch-manipulation min-h-[40px]"
            >
              {sharing ? '…' : t('pushpa.downloadRankCard')}
            </button>
            <p className="text-amber-200/70 text-[11px] text-center max-w-xs">
              For handwritten PDF download, use Japa Count page.
            </p>
            {shareError ? (
              <p className="text-amber-400/95 text-[clamp(0.55rem,2.6vw,0.65rem)] text-center max-w-xs">{shareError}</p>
            ) : null}
          </div>
        ) : null}

        {user && proOrPremiumActive && !PUSHPA_CUSTOM_DEITY_PHOTO_ENABLED ? (
          <div className="rounded-lg border border-amber-500/25 bg-black/25 px-3 py-2 mt-1 mb-0.5 max-w-md mx-auto text-center">
            <p className="text-amber-200/85 text-[11px] font-medium">{t('pushpa.customDeityComingSoonTitle')}</p>
          </div>
        ) : null}

        <div className="flex flex-1 min-h-0 gap-[clamp(0.2rem,1.2vw,0.45rem)] sm:gap-2 mt-0.5 sm:mt-1 items-stretch">
          <div className="flex flex-col gap-[clamp(0.15rem,1vw,0.35rem)] w-[clamp(2.85rem,14vw,4.25rem)] shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5 min-h-0 touch-pan-y">
            {SHODASHOPACHARA_LEFT.map((step, i) => (
              <UpacharaSlot key={step.id} step={step} stepIndex={i} onOpen={handleUpacharaOpen} />
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0 items-center min-h-0 relative justify-start">
            <div className="w-full max-w-[min(100%,20rem)] flex-1 min-h-[120px] flex items-start justify-center relative">
              <img
                ref={deityImgRef}
                src={deity.image}
                alt=""
                className="relative z-[1] w-full max-h-[min(42svh,280px)] sm:max-h-[min(44vh,300px)] object-contain object-top drop-shadow-lg"
              />
            </div>
            <div
              className="w-full shrink-0 min-h-[clamp(1.25rem,6svh,3.5rem)] sm:min-h-[clamp(2rem,8vh,4.5rem)]"
              aria-hidden
            />
          </div>

          <div className="flex flex-col gap-[clamp(0.15rem,1vw,0.35rem)] w-[clamp(2.85rem,14vw,4.25rem)] shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain pl-0.5 min-h-0 touch-pan-y">
            {SHODASHOPACHARA_RIGHT.map((step, i) => (
              <UpacharaSlot key={step.id} step={step} stepIndex={8 + i} onOpen={handleUpacharaOpen} />
            ))}
          </div>
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 border-t border-amber-500/20 bg-[#1a0a12]/95 backdrop-blur-sm px-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))] pt-1 sm:pt-1.5"
          style={{ paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-center text-amber-200/50 text-[clamp(0.55rem,2.4vw,0.65rem)] mb-0.5 sm:mb-1 uppercase tracking-wide">
            {t('pushpa.offeringBarLabel')}
          </p>
          <div className="flex justify-center gap-0.5 sm:gap-1.5 max-w-[min(100%,30rem)] mx-auto">
            {PUSHPA_OFFERINGS.map((o) => (
              <button
                key={o.id}
                type="button"
                ref={(el) => {
                  offeringBtnRefs.current[o.id] = el;
                }}
                disabled={!!flight}
                onClick={() => handleOfferingClick(o)}
                className="flex flex-col items-center flex-1 min-w-0 max-w-[min(100%,4.5rem)] gap-0.5 disabled:opacity-50 touch-manipulation min-h-[44px]"
                title={t(o.i18nKey)}
                aria-label={t(o.i18nKey)}
              >
                <span
                  data-pushpa-offering-icon
                  className={
                    flight?.offeringId === o.id
                      ? 'w-[clamp(2.5rem,12vmin,3rem)] h-[clamp(2.5rem,12vmin,3rem)] sm:w-12 sm:h-12 rounded-lg border-transparent bg-transparent p-0.5 flex items-center justify-center'
                      : 'w-[clamp(2.5rem,12vmin,3rem)] h-[clamp(2.5rem,12vmin,3rem)] sm:w-12 sm:h-12 rounded-lg border border-amber-500/35 bg-amber-950/10 hover:bg-amber-900/25 hover:border-amber-400/60 active:scale-95 transition-[transform,colors,border-color,background-color] p-0.5 flex items-center justify-center'
                  }
                >
                  <img
                    data-pushpa-offering-thumb
                    src={o.image}
                    alt=""
                    className={
                      flight?.offeringId === o.id
                        ? 'max-w-full max-h-full object-contain opacity-0'
                        : 'max-w-full max-h-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                    }
                  />
                </span>
                <span className="text-[clamp(0.5rem,2.5vw,0.65rem)] text-amber-200/80 text-center leading-tight line-clamp-2 px-0.5">
                  {t(o.i18nKey)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {flight && (
          <motion.img
            key={flight.key}
            src={flight.src}
            alt=""
            className="fixed left-0 top-0 pointer-events-none object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
            style={{
              width: FLYING_SIZE,
              height: FLYING_SIZE,
              zIndex: 60,
            }}
            initial={{ x: flight.from.x, y: flight.from.y, opacity: 1, scale: 1 }}
            animate={{
              x: [flight.from.x, flight.to.x, flight.to.x],
              y: [flight.from.y, flight.to.y, flight.to.y],
              opacity: [1, 1, 0],
              scale: [1, 1.08, 0.45],
            }}
            transition={{
              duration: 1.05,
              times: [0, 0.68, 1],
              ease: ['easeOut', 'easeInOut'],
            }}
            exit={{ opacity: 0 }}
            onAnimationComplete={onFlightComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {upacharaModal ? (
          <motion.div
            key="upachara-modal"
            role="dialog"
            aria-modal
            aria-labelledby="pushpa-upachara-title"
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUpacharaModal(null)}
          >
            <motion.div
              role="presentation"
              className="relative w-full max-w-md max-h-[min(92dvh,100%)] my-auto rounded-2xl border border-amber-500/35 bg-[#1a1010] p-3 sm:p-4 shadow-2xl overflow-y-auto overscroll-contain"
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="pushpa-upachara-title"
                className="text-amber-200 text-center text-[clamp(0.8rem,3.8vw,0.95rem)] font-semibold mb-2"
              >
                {t(upacharaModal.step.i18nKey)}
              </h2>
              <div className="flex justify-center rounded-xl bg-black/40 p-2 sm:p-4 border border-amber-500/20">
                <img
                  src={upacharaModal.step.image}
                  alt=""
                  className="max-h-[min(58svh,360px)] w-full object-contain"
                />
              </div>
              <p className="text-amber-200/50 text-[clamp(0.55rem,2.8vw,0.65rem)] text-center mt-2">
                {t('pushpa.upacharaAudioLater')}
              </p>
              <button
                type="button"
                className="mt-3 sm:mt-4 w-full min-h-[44px] rounded-lg bg-amber-600/90 text-white text-[clamp(0.8rem,3.2vw,0.875rem)] py-2 font-medium hover:bg-amber-500 touch-manipulation"
                onClick={() => setUpacharaModal(null)}
              >
                {t('pushpa.upacharaClose')}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    {shareResultModal}
    </>
  );
}
