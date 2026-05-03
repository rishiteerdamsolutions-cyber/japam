import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppFooter } from '../components/layout/AppFooter';
import INDIA_REGIONS from '../data/indiaRegions.json';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { FIRST_LOCKED_LEVEL_INDEX_GENERAL } from '../lib/levelGates';
import { auth } from '../lib/firebase';
import { DonateThankYouBox } from '../components/donation/DonateThankYouBox';
import { MenuMatchChantHeader } from '../components/layout/MenuMatchChantHeader';
import { BottomNav } from '../components/nav/BottomNav';
import { paddedLeaderboard, renderRankCardBlob } from '../lib/rankCard';
import { trackShareEvent } from '../lib/firestore';
import { AccessBadge } from '../components/ui/AccessBadge';
import {
  DEFAULT_FREE_MARATHON_ID,
  displayMarathonTitle,
  isDefaultFreeMarathonId,
} from '../lib/defaultCommunityEvents';

const STATES = [...INDIA_REGIONS.states, ...INDIA_REGIONS.union_territories];

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Temple {
  id: string;
  name: string;
  area: string;
  state?: string;
  district?: string;
  cityTownVillage?: string;
}

interface Marathon {
  id: string;
  templeId: string;
  deityId: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  communityName?: string | null;
  leaderboard?: { rank: number; uid: string; name: string; japasCount: number }[];
}

interface MyMarathon {
  marathonId: string;
  deityId: string;
  templeId: string;
  templeName: string;
  targetJapas: number;
  startDate: string;
  japasCount: number;
  leaderboard?: { rank: number; uid: string; name: string; japasCount: number }[];
}

export function MarathonsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTempleId = searchParams.get('templeId');
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const isPro = levelsUnlocked === true;

  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [cityName, setCityName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [marathonsByTemple, setMarathonsByTemple] = useState<Record<string, Marathon[]>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedMarathonIds, setJoinedMarathonIds] = useState<Set<string>>(new Set());
  const [myMarathons, setMyMarathons] = useState<MyMarathon[]>([]);
  const [sharing, setSharing] = useState(false);
  const [openMyLeaderboard, setOpenMyLeaderboard] = useState<Set<string>>(new Set());
  const [shareResult, setShareResult] = useState<{ blob: Blob; url: string; shareText: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const state = STATES.find((s) => s.name === stateName) || null;

  useEffect(() => {
    if (!user?.uid) {
      setJoinedMarathonIds(new Set());
      setMyMarathons([]);
      return;
    }
    const load = async () => {
      const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
      if (!idToken) return;
      const url = API_BASE ? `${API_BASE}/api/marathons/my-participations` : '/api/marathons/my-participations';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
      const data = (await res.json().catch(() => ({}))) as { marathonIds?: string[]; marathons?: MyMarathon[] };
      if (res.ok && Array.isArray(data.marathonIds)) {
        setJoinedMarathonIds(new Set(data.marathonIds));
        setMyMarathons(Array.isArray(data.marathons) ? data.marathons : []);
      }
    };
    load();
  }, [user?.uid]);
  const districts = state?.districts ?? [];

  useEffect(() => {
    if (!urlTempleId) return;
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    params.set('templeId', urlTempleId);
    const url = API_BASE ? `${API_BASE}/api/marathons/discover?${params}` : `/api/marathons/discover?${params}`;
    (async () => {
      const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
      const headers: HeadersInit = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      return fetch(url, { headers });
    })()
      .then((r) => r.json())
      .then((data) => {
        setTemples(data.temples || []);
        setMarathonsByTemple(data.marathonsByTemple || {});
        const t = (data.temples || [])[0];
        if (t) {
          setStateName(t.state || '');
          setDistrictName(t.district || '');
          setCityName(t.cityTownVillage || '');
          setAreaName(t.area || '');
        }
      })
      .catch(() => {
        setTemples([]);
        setMarathonsByTemple({});
      })
      .finally(() => setLoading(false));
  }, [urlTempleId]);

  /** Raw leaderboard for rank card; only inject the viewer when they joined (API may omit their row briefly). */
  const leaderboardForRankCard = (
    marathon: Marathon,
    participated: boolean,
  ): { rank: number; uid: string; name: string; japasCount: number }[] => {
    const lb = marathon.leaderboard ? marathon.leaderboard.map((e) => ({ ...e })) : [];
    if (!user?.uid || !participated) return lb;
    if (!lb.some((p) => p.uid === user.uid)) {
      const myM = myMarathons.find((x) => x.marathonId === marathon.id);
      const nextRank = isDefaultFreeMarathonId(marathon.id)
        ? 1
        : lb.length > 0
          ? Math.max(...lb.map((e) => e.rank)) + 1
          : 1;
      lb.push({
        rank: nextRank,
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'You',
        japasCount: myM?.japasCount ?? 0,
      });
    }
    return lb;
  };

  const handleSearch = () => {
    if (!stateName.trim()) return;
    setJoinError(null);
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    params.set('state', stateName.trim());
    if (districtName.trim()) params.set('district', districtName.trim());
    if (cityName.trim()) params.set('cityTownVillage', cityName.trim());
    if (areaName.trim()) params.set('area', areaName.trim());
    const url = API_BASE ? `${API_BASE}/api/marathons/discover?${params}` : `/api/marathons/discover?${params}`;
    (async () => {
      const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
      const headers: HeadersInit = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      return fetch(url, { headers });
    })()
      .then((r) => r.json())
      .then((data) => {
        setTemples(data.temples || []);
        setMarathonsByTemple(data.marathonsByTemple || {});
      })
      .catch(() => {
        setTemples([]);
        setMarathonsByTemple({});
      })
      .finally(() => setLoading(false));
  };

  const handleJoin = async (marathonId: string) => {
    if (!user?.uid) {
      navigate('/');
      return;
    }
    if (!isPro && !isDefaultFreeMarathonId(marathonId)) {
      setJoinError('Pro member required to join temple marathons. Unlock full access first.');
      return;
    }
    setJoinError(null);
    setJoining(marathonId);
    try {
      const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
      if (!idToken) {
        setJoinError('Please sign in again to join.');
        return;
      }
      const url = API_BASE ? `${API_BASE}/api/marathons/join` : '/api/marathons/join';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ marathonId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyJoined?: boolean };
      if (res.ok) {
        setJoinedMarathonIds((prev) => new Set(prev).add(marathonId));
        if (!data.alreadyJoined) {
          setMarathonsByTemple((prev) => {
            const next = { ...prev };
            for (const tid of Object.keys(next)) {
              next[tid] = next[tid].map((m) =>
                m.id === marathonId ? { ...m, joinedCount: (m.joinedCount || 0) + 1 } : m
              );
            }
            return next;
          });
        }
        const refetchUrl = API_BASE ? `${API_BASE}/api/marathons/my-participations` : '/api/marathons/my-participations';
        const refetchRes = await fetch(refetchUrl, { headers: { Authorization: `Bearer ${idToken}` } });
        const refetchData = (await refetchRes.json().catch(() => ({}))) as { marathons?: MyMarathon[] };
        if (refetchRes.ok && Array.isArray(refetchData.marathons)) setMyMarathons(refetchData.marathons);
      } else if (res.status === 403) {
        setJoinError(data?.error ?? 'Only users who have full access can join marathons.');
      } else if (res.status === 401) {
        setJoinError('Please sign in to join a marathon.');
      } else {
        setJoinError(data?.error ?? 'Failed to join.');
      }
    } finally {
      setJoining(null);
    }
  };

  const deityName = (id: string) => DEITIES.find((d) => d.id === id)?.name ?? id;

  const handleShare = async (marathon: Marathon, temple: Temple) => {
    if (!user?.uid) return;
    if (sharing) return;

    const participated = joinedMarathonIds.has(marathon.id);
    const lb = leaderboardForRankCard(marathon, participated);
    if (lb.length === 0) {
      setShareError(t('marathonsPage.leaderboardUnavailable'));
      return;
    }

    setShareError(null);
    setShareNotice(null);
    setSharing(true);
    try {
      const currentEntry = lb.find((p) => p.uid === user.uid);
      const myM = myMarathons.find((m) => m.marathonId === marathon.id);
      const japasOverride = myM && (myM.japasCount ?? 0) > (currentEntry?.japasCount ?? 0) ? myM.japasCount : undefined;
      const isDefaultFreeMarathon = isDefaultFreeMarathonId(marathon.id);
      const jp = japasOverride ?? currentEntry?.japasCount ?? myM?.japasCount ?? 0;
      const marathonTitle = displayMarathonTitle(marathon.id, marathon.communityName ?? temple.name);
      const rankText = isDefaultFreeMarathon
        ? `My ${marathonTitle}: ${jp} / ${marathon.targetJapas} japas. `
        : !participated
          ? 'My rank 0 in this Japa Marathon! '
          : currentEntry
            ? `My rank ${currentEntry.rank} in this Japa Marathon! `
            : '';
      const shareText = `${rankText}Join at www.japam.digital`;

      const dn = deityName(marathon.deityId);
      const blob = await renderRankCardBlob({
        title: 'JAPA MARATHON',
        headerName: marathonTitle,
        deityName: '',
        subtitleLine: isDefaultFreeMarathon
          ? t('rankCardMarathon.subtitleSolo', { deity: dn })
          : t('rankCardMarathon.subtitle', { deity: dn }),
        leaderboard: lb,
        currentUserUid: user.uid,
        currentUserJapasOverride: japasOverride,
        currentUserDisplayName: user.displayName || user.email?.split('@')[0] || undefined,
        currentUserParticipated: participated,
        soloPersonalMarathon: isDefaultFreeMarathon,
        rankCardFooterCtaLine: isDefaultFreeMarathon ? undefined : t('rankCardMarathon.footerCta'),
        japaSummaryLine: `Your japas: ${jp.toLocaleString('en-IN')} / ${marathon.targetJapas.toLocaleString('en-IN')} goal`,
      });
      if (!blob) throw new Error('Failed to generate image');

      const url = URL.createObjectURL(blob);
      setShareResult({ blob, url, shareText });
      setShareNotice(null);
      trackShareEvent('marathon_rank_card').catch(() => {});
    } catch {
      setShareError(t('marathonsPage.shareFailed'));
    } finally {
      setSharing(false);
    }
  };

  const downloadShareImage = () => {
    if (!shareResult) return;
    const a = document.createElement('a');
    a.href = shareResult.url;
    a.download = 'japam-marathon.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareNotice(t('marathonsPage.downloadNoticeShort'));
  };

  const closeShareResult = () => {
    if (shareResult?.url) URL.revokeObjectURL(shareResult.url);
    setShareResult(null);
    setShareError(null);
    setShareNotice(null);
  };

  return (
    <div className="relative min-h-screen p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
      {shareResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-5 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-1">{t('marathonsPage.rankCardTitle')}</h2>
            <p className="text-amber-200/75 text-sm mb-3">{t('marathonsPage.rankCardReady')}</p>
            {shareNotice ? <p className="text-amber-200/65 text-xs mb-4">{shareNotice}</p> : null}
            <button
              type="button"
              onClick={downloadShareImage}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm"
            >
              {t('marathonsPage.downloadImage')}
            </button>
            <button
              type="button"
              onClick={closeShareResult}
              className="mt-2 w-full py-2 rounded-xl bg-white/5 text-amber-200/80 text-sm"
            >
              {t('marathonsPage.close')}
            </button>
          </div>
        </div>
      )}
      <MenuMatchChantHeader />
      <h2 className="text-base sm:text-xl font-bold text-amber-400 mb-1.5" style={{ fontFamily: 'serif' }}>
        {t('marathonsPage.title')}
      </h2>
      <p className="text-amber-200/70 text-xs sm:text-sm mb-3 leading-snug max-w-xl">
        {t('marathonsPage.description')}
      </p>
      {!isPro && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs sm:text-sm leading-snug">
          {t('marathonsPage.proGateShort')}{' '}
          <button
            type="button"
            onClick={() => navigate(`/game?mode=general&level=${FIRST_LOCKED_LEVEL_INDEX_GENERAL}`)}
            className="text-amber-400 font-medium hover:underline"
          >
            {t('mahaYagnas.unlockPro')}
          </button>
        </div>
      )}

      {joinError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
          {joinError}
          <button type="button" onClick={() => setJoinError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {shareError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
          {shareError}
          <button type="button" onClick={() => setShareError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
      {shareNotice && !shareResult && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-100 text-sm">
          {shareNotice}
          <button type="button" onClick={() => setShareNotice(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <DonateThankYouBox className="mt-4" />

      {user && myMarathons.length > 0 && (
        <div className="mb-5 p-3 rounded-xl bg-black/30 border border-amber-500/25">
          <h2 className="text-amber-400 font-semibold text-sm sm:text-base mb-1">{t('marathonsPage.yourMarathons')}</h2>
          <p className="text-amber-200/60 text-xs mb-2.5 leading-snug">{t('marathonsPage.yourMarathonsDesc')}</p>
          <div className="space-y-2.5">
            {[...myMarathons].sort((a, b) => (a.marathonId === DEFAULT_FREE_MARATHON_ID ? -1 : b.marathonId === DEFAULT_FREE_MARATHON_ID ? 1 : 0)).map((my) => (
              <div key={my.marathonId} className="py-2 border-t border-amber-500/10 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {!isPro ? (
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        {isDefaultFreeMarathonId(my.marathonId) ? (
                          <AccessBadge variant="free" label={t('common.free')} size="sm" />
                        ) : (
                          <AccessBadge variant="pro" label={t('menu.pro')} size="sm" />
                        )}
                      </div>
                    ) : null}
                    <p className="text-amber-200 font-medium text-sm truncate">{displayMarathonTitle(my.marathonId, my.templeName)} · {deityName(my.deityId)}</p>
                    <p className="text-amber-200/60 text-[11px] sm:text-xs mt-0.5">
                      {t('marathonsPage.myProgressLine', { target: my.targetJapas, n: my.japasCount })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/game?mode=${encodeURIComponent(my.deityId)}&marathon=${encodeURIComponent(my.marathonId)}&target=${my.targetJapas}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium min-h-[40px]"
                    >
                      {t('marathonsPage.japa')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const marathon: Marathon = {
                          id: my.marathonId,
                          templeId: my.templeId,
                          deityId: my.deityId,
                          targetJapas: my.targetJapas,
                          startDate: my.startDate,
                          joinedCount: 0,
                          communityName: my.templeName || null,
                          leaderboard: my.leaderboard,
                        };
                        const temple: Temple = {
                          id: my.templeId,
                          name: my.templeName || 'Temple',
                          area: '',
                        };
                        handleShare(marathon, temple);
                      }}
                      disabled={sharing || !my.leaderboard?.length}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/90 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                    >
                      {sharing ? t('mahaYagnas.preparing') : t('mahaYagnas.downloadRankCard')}
                    </button>
                    {!!my.leaderboard && my.leaderboard.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMyLeaderboard((prev) => {
                            const next = new Set(prev);
                            if (next.has(my.marathonId)) next.delete(my.marathonId);
                            else next.add(my.marathonId);
                            return next;
                          });
                        }}
                        className="text-[11px] text-amber-300/90 underline underline-offset-2"
                      >
                        {openMyLeaderboard.has(my.marathonId) ? t('mahaYagnas.hideLeaderboard') : t('mahaYagnas.showLeaderboard')}
                      </button>
                    )}
                  </div>
                </div>

                {openMyLeaderboard.has(my.marathonId) && my.leaderboard && my.leaderboard.length > 0 && (
                  <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-amber-200/70 text-xs font-medium mb-1">
                        {isDefaultFreeMarathonId(my.marathonId) ? t('marathonsPage.leaderboardSolo') : t('marathonsPage.leaderboardTop')}
                      </p>
                    </div>
                    {(isDefaultFreeMarathonId(my.marathonId)
                      ? my.leaderboard
                      : paddedLeaderboard(my.leaderboard)
                    ).map((p) => (
                      <p key={p.rank} className="text-amber-200/60 text-xs">
                        {p.rank}. {p.uid ? `${p.name} — ${p.japasCount} japas` : 'Vacant'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-5">
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">{t('marathonsPage.state')}</label>
          <select
            value={stateName}
            onChange={(e) => { setStateName(e.target.value); setDistrictName(''); }}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          >
            <option value="">Select State</option>
            {STATES.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        {state && (
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">{t('marathonsPage.district')}</label>
            <select
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            >
              <option value="">Any</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">{t('marathonsPage.city')}</label>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="e.g. Hyderabad"
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          />
        </div>
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">{t('marathonsPage.area')}</label>
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="e.g. Secunderabad"
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!stateName.trim() || loading}
          className="px-6 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50"
        >
          {loading ? t('marathonsPage.searching') : t('marathonsPage.search')}
        </button>
      </div>

      {loading && <p className="text-amber-200/70 text-sm">{t('marathonsPage.loading')}</p>}

      {searched && !loading && (
        <div className="space-y-6 relative">
          {temples.length === 0 ? (
            <p className="text-amber-200/60 text-sm">{t('marathonsPage.noTemples')}</p>
          ) : (
            temples.map((temple) => {
              const marathons = marathonsByTemple[temple.id] || [];
              return (
                <div key={temple.id} className="p-3 sm:p-4 rounded-xl bg-black/30 border border-amber-500/20">
                  <p className="font-medium text-amber-200">{temple.name}</p>
                  <p className="text-amber-200/60 text-xs">{temple.area}</p>
                  {marathons.length === 0 ? (
                    <p className="text-amber-200/50 text-sm mt-2">{t('marathonsPage.noMarathons')}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {marathons.map((m) => {
                        const canDownload =
                          !!user?.uid && joinedMarathonIds.has(m.id) && !!m.leaderboard && m.leaderboard.length > 0;
                        return (
                          <div key={m.id} className="py-2 border-t border-amber-500/10">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {!isPro ? (
                                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                    {isDefaultFreeMarathonId(m.id) ? (
                                      <AccessBadge variant="free" label={t('common.free')} size="sm" />
                                    ) : (
                                      <AccessBadge variant="pro" label={t('menu.pro')} size="sm" />
                                    )}
                                  </div>
                                ) : null}
                                <p className="text-amber-200 font-medium text-sm">
                                  {t('marathonsPage.targetJapasLine', { deity: deityName(m.deityId), target: m.targetJapas })}
                                </p>
                                <p className="text-amber-200/60 text-[11px] sm:text-xs mt-0.5">
                                  {t('marathonsPage.startedJoined', { date: m.startDate, n: m.joinedCount })}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <button
                                  onClick={() => handleJoin(m.id)}
                                  disabled={
                                    !!joining ||
                                    joinedMarathonIds.has(m.id) ||
                                    (!isPro && !isDefaultFreeMarathonId(m.id))
                                  }
                                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                                >
                                  {joining === m.id
                                    ? t('marathonsPage.joining')
                                    : joinedMarathonIds.has(m.id)
                                      ? t('marathonsPage.joined')
                                      : !isPro && !isDefaultFreeMarathonId(m.id)
                                        ? (
                                            <span className="inline-flex items-center gap-1.5">
                                              <AccessBadge variant="pro" label={t('menu.pro')} size="sm" />
                                              <span>{t('marathonsPage.proRequiredSuffix')}</span>
                                            </span>
                                          )
                                        : t('marathonsPage.join')}
                                </button>
                                {canDownload && (
                                  <button
                                    type="button"
                                    onClick={() => handleShare(m, temple)}
                                    disabled={sharing}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500/90 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                                  >
                                    {sharing ? t('mahaYagnas.preparing') : t('mahaYagnas.downloadRankCard')}
                                  </button>
                                )}
                              </div>
                            </div>
                            {m.leaderboard && m.leaderboard.length > 0 && (
                              <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                                <p className="text-amber-200/70 text-xs font-medium mb-1">{t('marathonsPage.leaderboardTop')}</p>
                                {paddedLeaderboard(m.leaderboard).map((p) => (
                                  <p key={p.rank} className="text-amber-200/60 text-xs">
                                    {p.rank}. {p.uid ? `${p.name} — ${p.japasCount} japas` : 'Vacant'}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
      <AppFooter />
      <BottomNav />
      </div>
    </div>
  );
}
