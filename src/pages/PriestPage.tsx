import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { JapamBrand } from '../components/ui/JapamBrand';
import { DEITIES } from '../data/deities';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PRIEST_TOKEN_KEY = 'japam_priest_token';
const PRIEST_TEMPLE_KEY = 'japam_priest_temple';

export const MARATHON_HARD_DELETE_PHRASE = 'DELETE MARATHON FOREVER';
export const YAGNA_HARD_DELETE_PHRASE = 'DELETE YAGNA FOREVER';

type Lifecycle = 'active' | 'paused' | 'archived';

interface MarathonParticipant {
  uid: string;
  name: string;
  japasCount: number;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
}

interface Marathon {
  id: string;
  deityId: string;
  targetJapas: number;
  startDate: string;
  joinedCount: number;
  japasToday: number;
  totalJapas: number;
  lifecycleStatus?: Lifecycle;
  participantTotal?: number;
  participants?: MarathonParticipant[];
  topParticipants?: MarathonParticipant[];
}

interface YagnaParticipant {
  uid: string;
  name: string;
  userJapas: number;
  joinedAt?: string | null;
}

interface MahaYagna {
  id: string;
  name: string;
  deityId: string;
  deityName: string;
  mantra: string;
  goalJapas: number;
  currentJapas: number;
  participantCount: number;
  participantTotal?: number;
  participants?: YagnaParticipant[];
  startDate: string;
  endDate: string;
  status: string;
  lifecycleStatus?: Lifecycle;
}

type SafeAction =
  | { kind: 'marathon'; action: 'pause' | 'resume' | 'archive' | 'reactivate'; item: Marathon }
  | { kind: 'yagna'; action: 'pause' | 'resume' | 'archive' | 'reactivate'; item: MahaYagna };

type HardDeleteState =
  | { kind: 'marathon'; item: Marathon; step: 1 | 2 }
  | { kind: 'yagna'; item: MahaYagna; step: 1 | 2 };

interface ApavargaSettings {
  welcomeAutoReply: string;
  appointmentAutoReply: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  appointmentDays: string;
}

function lifecycleOfMarathon(m: Marathon): Lifecycle {
  return m.lifecycleStatus && ['paused', 'archived'].includes(m.lifecycleStatus) ? m.lifecycleStatus : 'active';
}

function lifecycleOfYagna(y: MahaYagna): Lifecycle {
  return y.lifecycleStatus && ['paused', 'archived'].includes(y.lifecycleStatus) ? y.lifecycleStatus : 'active';
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PriestPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(PRIEST_TOKEN_KEY));
  const [temple, setTemple] = useState<{ templeId: string; templeName: string } | null>(() => {
    try {
      const s = localStorage.getItem(PRIEST_TEMPLE_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDeity, setCreateDeity] = useState('');
  const [createTarget, setCreateTarget] = useState('');
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [mahaYagnas, setMahaYagnas] = useState<MahaYagna[]>([]);
  const [mahaLoading, setMahaLoading] = useState(true);
  const [mahaLoadError, setMahaLoadError] = useState<string | null>(null);
  const [showMahaCreate, setShowMahaCreate] = useState(false);
  const [mahaName, setMahaName] = useState('');
  const [mahaDeity, setMahaDeity] = useState('');
  const [mahaMantra, setMahaMantra] = useState('');
  const [mahaGoal, setMahaGoal] = useState('');
  const [mahaStart, setMahaStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [mahaEnd, setMahaEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [mahaCreating, setMahaCreating] = useState(false);
  const [mahaCreateError, setMahaCreateError] = useState<string | null>(null);

  const [editingMarathon, setEditingMarathon] = useState<Marathon | null>(null);
  const [editDeity, setEditDeity] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editingMahaYagna, setEditingMahaYagna] = useState<MahaYagna | null>(null);
  const [mahaEditName, setMahaEditName] = useState('');
  const [mahaEditDeity, setMahaEditDeity] = useState('');
  const [mahaEditMantra, setMahaEditMantra] = useState('');
  const [mahaEditGoal, setMahaEditGoal] = useState('');
  const [mahaEditStart, setMahaEditStart] = useState('');
  const [mahaEditEnd, setMahaEditEnd] = useState('');
  const [mahaEditStatus, setMahaEditStatus] = useState<'active' | 'completed'>('active');
  const [mahaEditSaving, setMahaEditSaving] = useState(false);
  const [mahaEditError, setMahaEditError] = useState<string | null>(null);

  const [marathonFilterStatus, setMarathonFilterStatus] = useState<'all' | Lifecycle>('all');
  const [marathonFilterDeity, setMarathonFilterDeity] = useState('');
  const [marathonDateFrom, setMarathonDateFrom] = useState('');
  const [marathonDateTo, setMarathonDateTo] = useState('');
  const [marathonSort, setMarathonSort] = useState<'newest' | 'participants' | 'goal'>('newest');

  const [yagnaFilterStatus, setYagnaFilterStatus] = useState<'all' | Lifecycle>('all');
  const [yagnaFilterDeity, setYagnaFilterDeity] = useState('');
  const [yagnaDateFrom, setYagnaDateFrom] = useState('');
  const [yagnaDateTo, setYagnaDateTo] = useState('');
  const [yagnaSort, setYagnaSort] = useState<'newest' | 'participants' | 'goal'>('newest');

  const [expandedMarathonId, setExpandedMarathonId] = useState<string | null>(null);
  const [expandedYagnaId, setExpandedYagnaId] = useState<string | null>(null);
  const [participantSearchM, setParticipantSearchM] = useState('');
  const [participantSearchY, setParticipantSearchY] = useState('');
  const [participantViewM, setParticipantViewM] = useState<'all' | 'recent' | 'followup'>('all');
  const [participantViewY, setParticipantViewY] = useState<'all' | 'recent' | 'followup'>('all');

  const [safeAction, setSafeAction] = useState<SafeAction | null>(null);
  const [safeActionBusy, setSafeActionBusy] = useState(false);
  const [hardDelete, setHardDelete] = useState<HardDeleteState | null>(null);
  const [hardDeletePhrase, setHardDeletePhrase] = useState('');
  const [hardDeleteConfirmId, setHardDeleteConfirmId] = useState('');
  const [hardDeleteBusy, setHardDeleteBusy] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const [apavarga, setApavarga] = useState<ApavargaSettings | null>(null);
  const [apavargaLoading, setApavargaLoading] = useState(false);
  const [apavargaSaving, setApavargaSaving] = useState(false);
  const [apavargaError, setApavargaError] = useState<string | null>(null);

  const refreshMarathons = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/marathons` : '/api/priest/marathons';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem(PRIEST_TOKEN_KEY);
        localStorage.removeItem(PRIEST_TEMPLE_KEY);
        setToken(null);
        setTemple(null);
        return;
      }
      if (!res.ok) {
        setLoadError(data.error || 'Could not load marathons');
        return;
      }
      setMarathons(data.marathons || []);
    } catch {
      setLoadError('Network error loading marathons');
    }
  }, [token]);

  const refreshYagnas = useCallback(async () => {
    if (!token) return;
    setMahaLoadError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas` : '/api/priest/maha-yagnas';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return;
      if (!res.ok) {
        setMahaLoadError(data.error || 'Could not load yagnas');
        return;
      }
      setMahaYagnas(data.yagnas || []);
    } catch {
      setMahaLoadError('Network error loading yagnas');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshMarathons();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshMarathons]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setMahaLoading(true);
      await refreshYagnas();
      if (!cancelled) setMahaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshYagnas]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setApavargaLoading(true);
      setApavargaError(null);
      try {
        const url = API_BASE ? `${API_BASE}/api/apavarga/priest/settings` : '/api/apavarga/priest/settings';
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) setApavargaError(data.error || 'Could not load Apavarga settings');
          else
            setApavarga({
              welcomeAutoReply: data.welcomeAutoReply || '',
              appointmentAutoReply: data.appointmentAutoReply || '',
              appointmentStartTime: data.appointmentStartTime || '09:00',
              appointmentEndTime: data.appointmentEndTime || '17:00',
              appointmentDays: data.appointmentDays || '1,2,3,4,5',
            });
        }
      } catch {
        if (!cancelled) setApavargaError('Network error');
      } finally {
        if (!cancelled) setApavargaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const deityName = (id: string) => DEITIES.find((d) => d.id === id)?.name ?? id;

  const filteredMarathons = useMemo(() => {
    let list = [...marathons];
    if (marathonFilterStatus !== 'all') {
      list = list.filter((m) => lifecycleOfMarathon(m) === marathonFilterStatus);
    }
    if (marathonFilterDeity) list = list.filter((m) => m.deityId === marathonFilterDeity);
    if (marathonDateFrom) list = list.filter((m) => (m.startDate || '') >= marathonDateFrom);
    if (marathonDateTo) list = list.filter((m) => (m.startDate || '') <= marathonDateTo);

    if (marathonSort === 'newest') list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    else if (marathonSort === 'participants') list.sort((a, b) => (b.joinedCount ?? 0) - (a.joinedCount ?? 0));
    else
      list.sort((a, b) => {
        const ga = Math.max(0, (a.targetJapas ?? 0) - (a.totalJapas ?? 0));
        const gb = Math.max(0, (b.targetJapas ?? 0) - (b.totalJapas ?? 0));
        return ga - gb;
      });
    return list;
  }, [marathons, marathonFilterStatus, marathonFilterDeity, marathonDateFrom, marathonDateTo, marathonSort]);

  const filteredYagnas = useMemo(() => {
    let list = [...mahaYagnas];
    if (yagnaFilterStatus !== 'all') {
      list = list.filter((y) => lifecycleOfYagna(y) === yagnaFilterStatus);
    }
    if (yagnaFilterDeity) list = list.filter((y) => y.deityId === yagnaFilterDeity);
    if (yagnaDateFrom) list = list.filter((y) => (y.startDate || '') >= yagnaDateFrom);
    if (yagnaDateTo) list = list.filter((y) => (y.startDate || '') <= yagnaDateTo);

    if (yagnaSort === 'newest') list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    else if (yagnaSort === 'participants') list.sort((a, b) => (b.participantCount ?? 0) - (a.participantCount ?? 0));
    else
      list.sort((a, b) => {
        const ga = Math.max(0, (a.goalJapas ?? 0) - (a.currentJapas ?? 0));
        const gb = Math.max(0, (b.goalJapas ?? 0) - (b.currentJapas ?? 0));
        return ga - gb;
      });
    return list;
  }, [mahaYagnas, yagnaFilterStatus, yagnaFilterDeity, yagnaDateFrom, yagnaDateTo, yagnaSort]);

  const marathonDeepLink = (tid: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/marathons?templeId=${encodeURIComponent(tid)}`;
  const yagnaDeepLink = (id: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/maha-yagnas?yagnaId=${encodeURIComponent(id)}`;

  const buildMarathonCampaign = (m: Marathon) => {
    const link = marathonDeepLink(temple?.templeId || '');
    const dn = deityName(m.deityId);
    const line1 = `🙏 Join our *${dn}* marathon at *${temple?.templeName || 'our temple'}* on Japam!`;
    const line2 = `Target: *${m.targetJapas.toLocaleString()}* japas • Started ${m.startDate}`;
    const line3 = `Open in app: ${link}`;
    return `${line1}\n${line2}\n${line3}`;
  };

  const buildYagnaCampaign = (y: MahaYagna) => {
    const link = yagnaDeepLink(y.id);
    const line1 = `🔱 *${y.name}* — Maha Japa Yagna (${y.deityName})`;
    const line2 = `Goal *${y.goalJapas.toLocaleString()}* japas • ${y.startDate} – ${y.endDate}`;
    const line3 = `Join: ${link}`;
    return `${line1}\n${line2}\n${line3}`;
  };

  const openWhatsApp = (text: string) => {
    const u = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  const handleMahaCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !mahaName.trim() || !mahaDeity || !mahaMantra.trim() || !mahaGoal || !mahaStart || !mahaEnd) return;
    const goal = Math.round(Number(mahaGoal));
    if (!Number.isFinite(goal) || goal < 1) {
      setMahaCreateError('Goal japas must be a positive number');
      return;
    }
    setMahaCreating(true);
    setMahaCreateError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas` : '/api/priest/maha-yagnas';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: mahaName.trim(),
          deityId: mahaDeity,
          mantra: mahaMantra.trim(),
          goalJapas: goal,
          startDate: mahaStart,
          endDate: mahaEnd,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMahaCreateError(data.error || 'Failed');
        return;
      }
      setShowMahaCreate(false);
      setMahaName('');
      setMahaDeity('');
      setMahaMantra('');
      setMahaGoal('');
      setMahaStart(new Date().toISOString().slice(0, 10));
      const endD = new Date();
      endD.setMonth(endD.getMonth() + 3);
      setMahaEnd(endD.toISOString().slice(0, 10));
      await refreshYagnas();
      showToast('Maha Japa Yagna created');
    } catch {
      setMahaCreateError('Failed');
    } finally {
      setMahaCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(PRIEST_TOKEN_KEY);
    localStorage.removeItem(PRIEST_TEMPLE_KEY);
    setToken(null);
    setTemple(null);
    navigate('/settings', { replace: true });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !createDeity || !createTarget || !createDate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/marathons` : '/api/priest/marathons';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deityId: createDeity,
          targetJapas: Number(createTarget),
          startDate: createDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || 'Failed');
        return;
      }
      setShowCreate(false);
      setCreateDeity('');
      setCreateTarget('');
      setCreateDate(new Date().toISOString().slice(0, 10));
      await refreshMarathons();
      showToast('Marathon created');
    } catch {
      setCreateError('Failed');
    } finally {
      setCreating(false);
    }
  };

  const openMarathonEdit = (m: Marathon) => {
    setEditingMarathon(m);
    setEditDeity(m.deityId);
    setEditTarget(String(m.targetJapas));
    setEditDate(m.startDate);
    setEditError(null);
  };

  const handleMarathonEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMarathon) return;
    const target = Math.round(Number(editTarget));
    if (!Number.isFinite(target) || target < 1) {
      setEditError('Target japas must be a positive number');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/marathon-edit` : '/api/priest/marathon-edit';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          marathonId: editingMarathon.id,
          deityId: editDeity,
          targetJapas: target,
          startDate: editDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || 'Failed');
        return;
      }
      setEditingMarathon(null);
      await refreshMarathons();
      showToast('Marathon updated');
    } catch {
      setEditError('Failed');
    } finally {
      setEditSaving(false);
    }
  };

  const openMahaEdit = (y: MahaYagna) => {
    setEditingMahaYagna(y);
    setMahaEditName(y.name);
    setMahaEditDeity(y.deityId);
    setMahaEditMantra(y.mantra);
    setMahaEditGoal(String(y.goalJapas));
    setMahaEditStart(y.startDate);
    setMahaEditEnd(y.endDate);
    setMahaEditStatus((y.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed');
    setMahaEditError(null);
  };

  const handleMahaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMahaYagna) return;
    const goal = Math.round(Number(mahaEditGoal));
    if (!Number.isFinite(goal) || goal < 1) {
      setMahaEditError('Goal japas must be a positive number');
      return;
    }
    setMahaEditSaving(true);
    setMahaEditError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas-edit` : '/api/priest/maha-yagnas-edit';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          yagnaId: editingMahaYagna.id,
          name: mahaEditName.trim(),
          deityId: mahaEditDeity,
          mantra: mahaEditMantra.trim(),
          goalJapas: goal,
          startDate: mahaEditStart,
          endDate: mahaEditEnd,
          status: mahaEditStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMahaEditError(data.error || 'Failed');
        return;
      }
      setEditingMahaYagna(null);
      await refreshYagnas();
      showToast('Yagna updated');
    } catch {
      setMahaEditError('Failed');
    } finally {
      setMahaEditSaving(false);
    }
  };

  const postLifecycleMarathon = async (m: Marathon, lifecycleStatus: Lifecycle) => {
    const url = API_BASE ? `${API_BASE}/api/priest/marathon-edit` : '/api/priest/marathon-edit';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ marathonId: m.id, lifecycleStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed');
  };

  const postLifecycleYagna = async (y: MahaYagna, lifecycleStatus: Lifecycle) => {
    const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas-edit` : '/api/priest/maha-yagnas-edit';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ yagnaId: y.id, lifecycleStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed');
  };

  const runSafeAction = async () => {
    if (!token || !safeAction) return;
    setSafeActionBusy(true);
    try {
      if (safeAction.kind === 'marathon') {
        const m = safeAction.item;
        if (safeAction.action === 'pause') await postLifecycleMarathon(m, 'paused');
        else if (safeAction.action === 'resume' || safeAction.action === 'reactivate') await postLifecycleMarathon(m, 'active');
        else if (safeAction.action === 'archive') await postLifecycleMarathon(m, 'archived');
        await refreshMarathons();
      } else {
        const y = safeAction.item;
        if (safeAction.action === 'pause') await postLifecycleYagna(y, 'paused');
        else if (safeAction.action === 'resume' || safeAction.action === 'reactivate') await postLifecycleYagna(y, 'active');
        else if (safeAction.action === 'archive') await postLifecycleYagna(y, 'archived');
        await refreshYagnas();
      }
      setSafeAction(null);
      showToast('Updated');
    } catch (e) {
      showToast((e as Error).message || 'Failed');
    } finally {
      setSafeActionBusy(false);
    }
  };

  const submitHardDelete = async () => {
    if (!token || !hardDelete) return;
    const phraseOk =
      hardDelete.kind === 'marathon'
        ? hardDeletePhrase.trim() === MARATHON_HARD_DELETE_PHRASE
        : hardDeletePhrase.trim() === YAGNA_HARD_DELETE_PHRASE;
    const idOk =
      hardDelete.kind === 'marathon'
        ? hardDeleteConfirmId.trim() === hardDelete.item.id
        : hardDeleteConfirmId.trim() === hardDelete.item.id;
    if (!phraseOk || !idOk) {
      showToast('Phrase and ID must match exactly');
      return;
    }
    setHardDeleteBusy(true);
    try {
      if (hardDelete.kind === 'marathon') {
        const url = API_BASE ? `${API_BASE}/api/priest/marathon-edit` : '/api/priest/marathon-edit';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: 'deletePermanent',
            marathonId: hardDelete.item.id,
            hardDeletePhrase: hardDeletePhrase.trim(),
            hardDeleteConfirmId: hardDeleteConfirmId.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed');
        await refreshMarathons();
      } else {
        const url = API_BASE ? `${API_BASE}/api/priest/maha-yagnas-edit` : '/api/priest/maha-yagnas-edit';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: 'deletePermanent',
            yagnaId: hardDelete.item.id,
            hardDeletePhrase: hardDeletePhrase.trim(),
            hardDeleteConfirmId: hardDeleteConfirmId.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed');
        await refreshYagnas();
      }
      setHardDelete(null);
      setHardDeletePhrase('');
      setHardDeleteConfirmId('');
      showToast('Permanently deleted');
    } catch (e) {
      showToast((e as Error).message || 'Failed');
    } finally {
      setHardDeleteBusy(false);
    }
  };

  const saveApavarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !apavarga) return;
    setApavargaSaving(true);
    setApavargaError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/apavarga/priest/settings` : '/api/apavarga/priest/settings';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apavarga),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setApavargaError(data.error || 'Save failed');
      else showToast('Apavarga settings saved');
    } catch {
      setApavargaError('Network error');
    } finally {
      setApavargaSaving(false);
    }
  };

  function filterMarathonParticipants(m: Marathon): MarathonParticipant[] {
    const raw = m.participants || [];
    let list = [...raw];
    const q = participantSearchM.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.uid.toLowerCase().includes(q));
    if (participantViewM === 'recent') {
      list.sort((a, b) => (b.joinedAt || '').localeCompare(a.joinedAt || ''));
    } else if (participantViewM === 'followup') {
      const week = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      list = list.filter((p) => {
        const low = (p.japasCount ?? 0) < 10;
        const ja = p.joinedAt ? new Date(p.joinedAt).getTime() : 0;
        const old = ja && now - ja > week;
        return low && old;
      });
    } else {
      list.sort((a, b) => (b.japasCount ?? 0) - (a.japasCount ?? 0));
    }
    return list;
  }

  function filterYagnaParticipants(y: MahaYagna): YagnaParticipant[] {
    const raw = y.participants || [];
    let list = [...raw];
    const q = participantSearchY.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.uid.toLowerCase().includes(q));
    if (participantViewY === 'recent') {
      list.sort((a, b) => (b.joinedAt || '').localeCompare(a.joinedAt || ''));
    } else if (participantViewY === 'followup') {
      const week = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      list = list.filter((p) => {
        const low = (p.userJapas ?? 0) < 10;
        const ja = p.joinedAt ? new Date(p.joinedAt).getTime() : 0;
        const old = ja && now - ja > week;
        return low && old;
      });
    } else {
      list.sort((a, b) => (b.userJapas ?? 0) - (a.userJapas ?? 0));
    }
    return list;
  }

  const marathonLeaderboardCsv = (m: Marathon) => {
    const rows = (m.participants || []).map((p, i) => `${i + 1},"${(p.name || '').replace(/"/g, '""')}",${p.japasCount}`);
    return `rank,name,japas\n${rows.join('\n')}`;
  };

  const yagnaLeaderboardCsv = (y: MahaYagna) => {
    const rows = (y.participants || []).map((p, i) => `${i + 1},"${(p.name || '').replace(/"/g, '""')}",${p.userJapas}`);
    return `rank,name,japas\n${rows.join('\n')}`;
  };

  const marathonTopSummary = (m: Marathon) => {
    const top = (m.participants || []).slice(0, 5);
    const lines = top.map((p, i) => `${i + 1}. ${p.name} — ${p.japasCount} japas`);
    return `Top on ${deityName(m.deityId)} marathon (${m.startDate}):\n${lines.join('\n')}`;
  };

  const yagnaTopSummary = (y: MahaYagna) => {
    const top = (y.participants || []).slice(0, 5);
    const lines = top.map((p, i) => `${i + 1}. ${p.name} — ${p.userJapas} japas`);
    return `Top on ${y.name}:\n${lines.join('\n')}`;
  };

  if (!token) {
    return (
      <div className="relative min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-2xl font-bold text-amber-400 mb-4">Priest Dashboard</h1>
          <p className="text-amber-200/80 text-center mb-6 max-w-sm">
            Sign in with Google first, then link your priest account in Settings.
          </p>
          <Link to="/settings" className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold">
            Go to Settings
          </Link>
          <Link to="/" className="text-amber-200/70 text-sm mt-4 underline">
            ← Back to <JapamBrand className="inline text-sm">Japam</JapamBrand>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 max-w-3xl mx-auto">
        {toast && (
          <div
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-black/80 text-amber-100 text-sm shadow-lg max-w-[90vw] text-center"
            role="status"
          >
            {toast}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Priest Dashboard</h1>
            <p className="text-amber-200/70 text-sm">{temple?.templeName || 'Temple'}</p>
          </div>
          <button type="button" onClick={handleLogout} className="text-amber-200/80 text-sm shrink-0">
            Log out
          </button>
        </div>

        <h2 className="text-lg font-semibold text-amber-200 mb-2">Marathons</h2>
        <div className="mb-4 p-3 rounded-xl bg-black/25 border border-amber-500/20 space-y-2 text-sm">
          <p className="text-amber-200/60 text-xs">Filter & sort</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={marathonFilterStatus}
              onChange={(e) => setMarathonFilterStatus(e.target.value as typeof marathonFilterStatus)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs min-w-[100px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={marathonFilterDeity}
              onChange={(e) => setMarathonFilterDeity(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs min-w-[120px]"
            >
              <option value="">All deities</option>
              {DEITIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={marathonDateFrom}
              onChange={(e) => setMarathonDateFrom(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs"
              aria-label="Start date from"
            />
            <input
              type="date"
              value={marathonDateTo}
              onChange={(e) => setMarathonDateTo(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs"
              aria-label="Start date to"
            />
            <select
              value={marathonSort}
              onChange={(e) => setMarathonSort(e.target.value as typeof marathonSort)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs"
            >
              <option value="newest">Newest first</option>
              <option value="participants">Most participants</option>
              <option value="goal">Closest to goal</option>
            </select>
          </div>
        </div>

        {editingMarathon && (
          <form onSubmit={handleMarathonEdit} className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-4">
            <h3 className="text-amber-400 font-medium">Edit marathon</h3>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
              <select
                value={editDeity}
                onChange={(e) => setEditDeity(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              >
                {DEITIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Target japas</label>
              <input
                type="number"
                min={1}
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            {editError && <p className="text-red-400 text-sm">{editError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={editSaving}
                className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingMarathon(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-amber-200/70 text-sm mb-4">Loading marathons…</p>
        ) : loadError ? (
          <p className="text-red-400 text-sm mb-4">{loadError}</p>
        ) : filteredMarathons.length === 0 ? (
          <p className="text-amber-200/60 text-sm mb-4">No marathons match filters.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {filteredMarathons.map((m) => {
              const lc = lifecycleOfMarathon(m);
              const expanded = expandedMarathonId === m.id;
              const plist = filterMarathonParticipants(m);
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-amber-200">
                        {deityName(m.deityId)} • Target: {m.targetJapas.toLocaleString()}{' '}
                        <span
                          className={`text-xs ml-1 px-1.5 py-0.5 rounded ${
                            lc === 'active'
                              ? 'bg-green-600/40 text-green-100'
                              : lc === 'paused'
                                ? 'bg-amber-600/40 text-amber-100'
                                : 'bg-zinc-600/50 text-zinc-200'
                          }`}
                        >
                          {lc}
                        </span>
                      </p>
                      <p className="text-amber-200/70 text-xs">Started: {m.startDate}</p>
                      <p className="text-amber-200/80 text-sm mt-2">
                        Joined: {m.joinedCount} • Today: {m.japasToday} • Total: {m.totalJapas}
                      </p>
                      {m.participantTotal != null && m.participantTotal > (m.participants?.length ?? 0) && (
                        <p className="text-amber-200/50 text-xs mt-1">
                          Showing {m.participants?.length ?? 0} of {m.participantTotal} participants in dashboard.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void copyToClipboard(buildMarathonCampaign(m)).then((ok) => showToast(ok ? 'Campaign copied' : 'Copy failed'))}
                          className="text-xs px-2 py-1 rounded bg-emerald-700/80 text-white"
                        >
                          Copy campaign
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(buildMarathonCampaign(m))}
                          className="text-xs px-2 py-1 rounded bg-green-600/90 text-white"
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void copyToClipboard(marathonDeepLink(temple?.templeId || '')).then((ok) =>
                              showToast(ok ? 'Deep link copied' : 'Copy failed'),
                            )
                          }
                          className="text-xs px-2 py-1 rounded bg-white/15 text-amber-100"
                        >
                          Copy link
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lc === 'active' ? (
                          <button
                            type="button"
                            onClick={() => setSafeAction({ kind: 'marathon', action: 'pause', item: m })}
                            className="text-xs px-2 py-1 rounded bg-amber-700/60 text-white"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setSafeAction({
                                kind: 'marathon',
                                action: lc === 'archived' ? 'reactivate' : 'resume',
                                item: m,
                              })
                            }
                            className="text-xs px-2 py-1 rounded bg-sky-700/70 text-white"
                          >
                            {lc === 'archived' ? 'Unarchive' : 'Resume'}
                          </button>
                        )}
                        {lc !== 'archived' ? (
                          <button
                            type="button"
                            onClick={() => setSafeAction({ kind: 'marathon', action: 'archive', item: m })}
                            className="text-xs px-2 py-1 rounded bg-zinc-600/80 text-white"
                          >
                            Archive
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openMarathonEdit(m)}
                          className="text-xs px-2 py-1 rounded bg-amber-500/80 text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHardDeletePhrase('');
                            setHardDeleteConfirmId('');
                            setHardDelete({ kind: 'marathon', item: m, step: 1 });
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-900/70 text-red-100"
                        >
                          Delete…
                        </button>
                      </div>
                    </div>
                  </div>

                  {m.topParticipants && m.topParticipants.length > 0 && (
                    <div className="pl-3 border-l-2 border-amber-500/20">
                      <p className="text-amber-200/70 text-xs font-medium mb-1">Top 5 (last active)</p>
                      {m.topParticipants.map((p, idx) => (
                        <p key={`${p.uid}-${idx}`} className="text-amber-200/60 text-xs">
                          {idx + 1}. {p.name} — {p.japasCount} japas{' '}
                          {p.lastActiveAt ? `• last active ${new Date(p.lastActiveAt).toLocaleString()}` : ''}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedMarathonId(expanded ? null : m.id);
                        setParticipantSearchM('');
                        setParticipantViewM('all');
                      }}
                      className="text-xs text-amber-300 underline"
                    >
                      {expanded ? 'Hide participants' : 'Participants & leaderboard tools'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(marathonTopSummary(m)).then((ok) => showToast(ok ? 'Top summary copied' : 'Copy failed'))
                      }
                      className="text-xs text-amber-300 underline"
                    >
                      Copy top 5 summary
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTextFile(`marathon-${m.id}-ranks.csv`, marathonLeaderboardCsv(m))}
                      className="text-xs text-amber-300 underline"
                    >
                      Download CSV
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-2 p-3 rounded-lg bg-black/25 border border-amber-500/15 space-y-2">
                      <input
                        type="search"
                        placeholder="Search participants…"
                        value={participantSearchM}
                        onChange={(e) => setParticipantSearchM(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 text-sm text-white border border-amber-500/25"
                      />
                      <div className="flex flex-wrap gap-2 text-xs">
                        {(['all', 'recent', 'followup'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setParticipantViewM(v)}
                            className={`px-2 py-1 rounded ${participantViewM === v ? 'bg-amber-600 text-white' : 'bg-white/10 text-amber-200'}`}
                          >
                            {v === 'all' ? 'All' : v === 'recent' ? 'Recent joins' : 'Needs follow-up'}
                          </button>
                        ))}
                      </div>
                      <ul className="max-h-48 overflow-y-auto text-xs text-amber-200/80 space-y-1">
                        {plist.length === 0 ? (
                          <li className="text-amber-200/50">No rows match.</li>
                        ) : (
                          plist.map((p, i) => (
                            <li key={`${p.uid}-${i}`}>
                              {i + 1}. {p.name} — {p.japasCount} japas
                              {p.joinedAt ? ` • joined ${p.joinedAt.slice(0, 10)}` : ''}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!showCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold w-full sm:w-auto"
          >
            Create marathon
          </button>
        ) : (
          <form onSubmit={handleCreate} className="mt-4 p-4 rounded-xl bg-black/30 border border-amber-500/20 space-y-4">
            <h3 className="text-amber-400 font-medium">New marathon</h3>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
              <select
                value={createDeity}
                onChange={(e) => setCreateDeity(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              >
                <option value="">Select deity</option>
                {DEITIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Target japas</label>
              <input
                type="number"
                min={1}
                value={createTarget}
                onChange={(e) => setCreateTarget(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
              <input
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            {createError && <p className="text-red-400 text-sm">{createError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <h2 className="text-lg font-semibold text-amber-200 mb-2 mt-12">Maha Japa Yagnas</h2>
        <div className="mb-4 p-3 rounded-xl bg-black/25 border border-amber-500/20 space-y-2 text-sm">
          <p className="text-amber-200/60 text-xs">Filter & sort</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={yagnaFilterStatus}
              onChange={(e) => setYagnaFilterStatus(e.target.value as typeof yagnaFilterStatus)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs min-w-[100px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={yagnaFilterDeity}
              onChange={(e) => setYagnaFilterDeity(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs min-w-[120px]"
            >
              <option value="">All deities</option>
              {DEITIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={yagnaDateFrom}
              onChange={(e) => setYagnaDateFrom(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs"
              aria-label="Yagna start from"
            />
            <input
              type="date"
              value={yagnaDateTo}
              onChange={(e) => setYagnaDateTo(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs"
              aria-label="Yagna start to"
            />
            <select
              value={yagnaSort}
              onChange={(e) => setYagnaSort(e.target.value as typeof yagnaSort)}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-100 border border-amber-500/30 text-xs"
            >
              <option value="newest">Newest first</option>
              <option value="participants">Most participants</option>
              <option value="goal">Closest to goal</option>
            </select>
          </div>
        </div>

        {editingMahaYagna && (
          <form onSubmit={handleMahaEdit} className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-4">
            <h3 className="text-amber-400 font-medium">Edit Maha Japa Yagna</h3>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Name</label>
              <input
                type="text"
                value={mahaEditName}
                onChange={(e) => setMahaEditName(e.target.value)}
                placeholder="e.g. Shiva Maha Japa Yagna"
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
              <select
                value={mahaEditDeity}
                onChange={(e) => {
                  setMahaEditDeity(e.target.value);
                  const d = DEITIES.find((x) => x.id === e.target.value);
                  if (d) setMahaEditMantra(d.mantra);
                }}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              >
                {DEITIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Mantra</label>
              <input
                type="text"
                value={mahaEditMantra}
                onChange={(e) => setMahaEditMantra(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Goal japas</label>
              <input
                type="number"
                min={1}
                value={mahaEditGoal}
                onChange={(e) => setMahaEditGoal(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
              <input
                type="date"
                value={mahaEditStart}
                onChange={(e) => setMahaEditStart(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">End date</label>
              <input
                type="date"
                value={mahaEditEnd}
                onChange={(e) => setMahaEditEnd(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Completion status</label>
              <select
                value={mahaEditStatus}
                onChange={(e) => setMahaEditStatus(e.target.value as 'active' | 'completed')}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {mahaEditError && <p className="text-red-400 text-sm">{mahaEditError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={mahaEditSaving}
                className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {mahaEditSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingMahaYagna(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {mahaLoading ? (
          <p className="text-amber-200/70 text-sm mb-4">Loading yagnas…</p>
        ) : mahaLoadError ? (
          <p className="text-red-400 text-sm mb-4">{mahaLoadError}</p>
        ) : filteredYagnas.length === 0 ? (
          <p className="text-amber-200/60 text-sm mb-4">No yagnas match filters.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {filteredYagnas.map((y) => {
              const lc = lifecycleOfYagna(y);
              const expanded = expandedYagnaId === y.id;
              const plist = filterYagnaParticipants(y);
              return (
                <div key={y.id} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-amber-200">
                        {y.name}{' '}
                        <span
                          className={`text-xs ml-1 px-1.5 py-0.5 rounded ${
                            lc === 'active'
                              ? 'bg-green-600/40 text-green-100'
                              : lc === 'paused'
                                ? 'bg-amber-600/40 text-amber-100'
                                : 'bg-zinc-600/50 text-zinc-200'
                          }`}
                        >
                          {lc}
                        </span>
                        <span className="text-amber-200/50 text-xs ml-1">({y.status})</span>
                      </p>
                      <p className="text-amber-200/70 text-xs">
                        {y.deityName} • {y.mantra}
                      </p>
                      <p className="text-amber-200/80 text-sm mt-2">
                        Goal: {y.goalJapas.toLocaleString()} • Current: {y.currentJapas.toLocaleString()} •{' '}
                        {y.participantCount} participants
                      </p>
                      <p className="text-amber-200/60 text-xs">
                        {y.startDate} – {y.endDate}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void copyToClipboard(buildYagnaCampaign(y)).then((ok) => showToast(ok ? 'Campaign copied' : 'Copy failed'))}
                          className="text-xs px-2 py-1 rounded bg-emerald-700/80 text-white"
                        >
                          Copy campaign
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(buildYagnaCampaign(y))}
                          className="text-xs px-2 py-1 rounded bg-green-600/90 text-white"
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void copyToClipboard(yagnaDeepLink(y.id)).then((ok) => showToast(ok ? 'Link copied' : 'Copy failed'))
                          }
                          className="text-xs px-2 py-1 rounded bg-white/15 text-amber-100"
                        >
                          Copy link
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lc === 'active' ? (
                          <button
                            type="button"
                            onClick={() => setSafeAction({ kind: 'yagna', action: 'pause', item: y })}
                            className="text-xs px-2 py-1 rounded bg-amber-700/60 text-white"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setSafeAction({
                                kind: 'yagna',
                                action: lc === 'archived' ? 'reactivate' : 'resume',
                                item: y,
                              })
                            }
                            className="text-xs px-2 py-1 rounded bg-sky-700/70 text-white"
                          >
                            {lc === 'archived' ? 'Unarchive' : 'Resume'}
                          </button>
                        )}
                        {lc !== 'archived' ? (
                          <button
                            type="button"
                            onClick={() => setSafeAction({ kind: 'yagna', action: 'archive', item: y })}
                            className="text-xs px-2 py-1 rounded bg-zinc-600/80 text-white"
                          >
                            Archive
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openMahaEdit(y)}
                          className="text-xs px-2 py-1 rounded bg-amber-500/80 text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHardDeletePhrase('');
                            setHardDeleteConfirmId('');
                            setHardDelete({ kind: 'yagna', item: y, step: 1 });
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-900/70 text-red-100"
                        >
                          Delete…
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedYagnaId(expanded ? null : y.id);
                        setParticipantSearchY('');
                        setParticipantViewY('all');
                      }}
                      className="text-xs text-amber-300 underline"
                    >
                      {expanded ? 'Hide participants' : 'Participants & leaderboard tools'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(yagnaTopSummary(y)).then((ok) => showToast(ok ? 'Top summary copied' : 'Copy failed'))
                      }
                      className="text-xs text-amber-300 underline"
                    >
                      Copy top 5 summary
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTextFile(`yagna-${y.id}-ranks.csv`, yagnaLeaderboardCsv(y))}
                      className="text-xs text-amber-300 underline"
                    >
                      Download CSV
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-2 p-3 rounded-lg bg-black/25 border border-amber-500/15 space-y-2">
                      <input
                        type="search"
                        placeholder="Search participants…"
                        value={participantSearchY}
                        onChange={(e) => setParticipantSearchY(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 text-sm text-white border border-amber-500/25"
                      />
                      <div className="flex flex-wrap gap-2 text-xs">
                        {(['all', 'recent', 'followup'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setParticipantViewY(v)}
                            className={`px-2 py-1 rounded ${participantViewY === v ? 'bg-amber-600 text-white' : 'bg-white/10 text-amber-200'}`}
                          >
                            {v === 'all' ? 'All' : v === 'recent' ? 'Recent joins' : 'Needs follow-up'}
                          </button>
                        ))}
                      </div>
                      <ul className="max-h-48 overflow-y-auto text-xs text-amber-200/80 space-y-1">
                        {plist.length === 0 ? (
                          <li className="text-amber-200/50">No rows match.</li>
                        ) : (
                          plist.map((p, i) => (
                            <li key={`${p.uid}-${i}`}>
                              {i + 1}. {p.name} — {p.userJapas} japas
                              {p.joinedAt ? ` • joined ${p.joinedAt.slice(0, 10)}` : ''}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!showMahaCreate ? (
          <button
            type="button"
            onClick={() => setShowMahaCreate(true)}
            className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold w-full sm:w-auto"
          >
            Create Maha Japa Yagna
          </button>
        ) : (
          <form onSubmit={handleMahaCreate} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 space-y-4">
            <h3 className="text-amber-400 font-medium">New Maha Japa Yagna (Temple)</h3>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Name</label>
              <input
                type="text"
                value={mahaName}
                onChange={(e) => setMahaName(e.target.value)}
                placeholder="e.g. Shiva Maha Japa Yagna"
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
              <select
                value={mahaDeity}
                onChange={(e) => {
                  setMahaDeity(e.target.value);
                  const d = DEITIES.find((x) => x.id === e.target.value);
                  if (d) setMahaMantra(d.mantra);
                }}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              >
                <option value="">Select deity</option>
                {DEITIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Mantra</label>
              <input
                type="text"
                value={mahaMantra}
                onChange={(e) => setMahaMantra(e.target.value)}
                placeholder="e.g. Om Namah Shivaya"
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Goal japas</label>
              <input
                type="number"
                min={1}
                value={mahaGoal}
                onChange={(e) => setMahaGoal(e.target.value)}
                placeholder="e.g. 100000000"
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
              <input
                type="date"
                value={mahaStart}
                onChange={(e) => setMahaStart(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">End date</label>
              <input
                type="date"
                value={mahaEnd}
                onChange={(e) => setMahaEnd(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                required
              />
            </div>
            {mahaCreateError && <p className="text-red-400 text-sm">{mahaCreateError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={mahaCreating}
                className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {mahaCreating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowMahaCreate(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <h2 className="text-lg font-semibold text-amber-200 mb-2 mt-12">Apavarga settings</h2>
        <p className="text-amber-200/60 text-xs mb-3">
          Auto-replies and appointment window for Apavarga chat (saved per temple).
        </p>
        {apavargaLoading ? (
          <p className="text-amber-200/70 text-sm">Loading Apavarga settings…</p>
        ) : apavargaError && !apavarga ? (
          <p className="text-red-400 text-sm">{apavargaError}</p>
        ) : apavarga ? (
          <form onSubmit={saveApavarga} className="p-4 rounded-xl bg-black/30 border border-amber-500/20 space-y-4 mb-8">
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Welcome auto-reply</label>
              <textarea
                value={apavarga.welcomeAutoReply}
                onChange={(e) => setApavarga({ ...apavarga, welcomeAutoReply: e.target.value })}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30 text-sm"
                placeholder="Message sent when a seeker starts a chat…"
              />
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Appointment auto-reply</label>
              <textarea
                value={apavarga.appointmentAutoReply}
                onChange={(e) => setApavarga({ ...apavarga, appointmentAutoReply: e.target.value })}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30 text-sm"
                placeholder="Message when someone requests an appointment…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-amber-200/80 text-sm block mb-1">Window start (time)</label>
                <input
                  type="time"
                  value={apavarga.appointmentStartTime}
                  onChange={(e) => setApavarga({ ...apavarga, appointmentStartTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30 text-sm"
                />
              </div>
              <div>
                <label className="text-amber-200/80 text-sm block mb-1">Window end (time)</label>
                <input
                  type="time"
                  value={apavarga.appointmentEndTime}
                  onChange={(e) => setApavarga({ ...apavarga, appointmentEndTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-amber-200/80 text-sm block mb-1">Active days</label>
              <input
                type="text"
                value={apavarga.appointmentDays}
                onChange={(e) => setApavarga({ ...apavarga, appointmentDays: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-amber-500/30 text-sm"
                placeholder="e.g. 1,2,3,4,5 (Mon–Fri)"
              />
              <p className="text-amber-200/40 text-xs mt-1">Use numbers 0–6 or labels as you already store in Apavarga.</p>
            </div>
            {apavargaError && <p className="text-red-400 text-sm">{apavargaError}</p>}
            <button
              type="submit"
              disabled={apavargaSaving}
              className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
            >
              {apavargaSaving ? 'Saving…' : 'Save Apavarga settings'}
            </button>
          </form>
        ) : null}

        {safeAction && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70" role="dialog">
            <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-amber-500/30 p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-amber-200 mb-2">
                {safeAction.action === 'pause' && 'Pause for new joins?'}
                {safeAction.action === 'resume' && 'Resume marathon / yagna?'}
                {safeAction.action === 'reactivate' && 'Restore from archive?'}
                {safeAction.action === 'archive' && 'Archive (soft hide)?'}
              </h3>
              <p className="text-amber-100/80 text-sm mb-4">
                {safeAction.action === 'pause' &&
                  'Existing participants keep contributing; new users cannot join. Discover listing hides this item.'}
                {safeAction.action === 'archive' &&
                  'Stays in your dashboard as archived; hidden from public discover and new joins. Data is kept.'}
                {safeAction.action === 'resume' && 'Returns to active: visible and open to new joins.'}
                {safeAction.action === 'reactivate' && 'Moves back to active from archived.'}
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSafeAction(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={safeActionBusy}
                  onClick={() => void runSafeAction()}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {safeActionBusy ? 'Working…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {hardDelete && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/80" role="dialog">
            <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-red-500/40 p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              {hardDelete.step === 1 ? (
                <>
                  <h3 className="text-lg font-semibold text-red-300 mb-2">Permanent deletion</h3>
                  <p className="text-amber-100/80 text-sm mb-3">
                    This cannot be undone. All participant rows and the{' '}
                    {hardDelete.kind === 'marathon' ? 'marathon' : 'yagna'} document will be removed from the database.
                  </p>
                  <p className="text-amber-200/60 text-xs mb-4">
                    ID: <code className="text-amber-200">{hardDelete.item.id}</code>
                  </p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setHardDelete(null)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setHardDelete({ ...hardDelete, step: 2 })}
                      className="px-4 py-2 rounded-xl bg-red-700 text-white font-medium"
                    >
                      I understand — continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-red-300 mb-2">Second confirmation</h3>
                  <p className="text-amber-100/70 text-xs mb-2">
                    Type exactly:{' '}
                    <strong className="text-amber-200">
                      {hardDelete.kind === 'marathon' ? MARATHON_HARD_DELETE_PHRASE : YAGNA_HARD_DELETE_PHRASE}
                    </strong>
                  </p>
                  <input
                    value={hardDeletePhrase}
                    onChange={(e) => setHardDeletePhrase(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded-lg bg-black/50 text-white border border-red-500/30 text-sm"
                    placeholder="Confirmation phrase"
                    autoComplete="off"
                  />
                  <p className="text-amber-100/70 text-xs mb-2">
                    Re-enter the ID: <code className="text-amber-200">{hardDelete.item.id}</code>
                  </p>
                  <input
                    value={hardDeleteConfirmId}
                    onChange={(e) => setHardDeleteConfirmId(e.target.value)}
                    className="w-full mb-4 px-3 py-2 rounded-lg bg-black/50 text-white border border-red-500/30 text-sm"
                    placeholder="Paste ID"
                    autoComplete="off"
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setHardDelete(hardDelete ? { ...hardDelete, step: 1 } : null)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-amber-200"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={hardDeleteBusy}
                      onClick={() => void submitHardDelete()}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
                    >
                      {hardDeleteBusy ? 'Deleting…' : 'Delete forever'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Link to="/" className="inline-block text-amber-200/70 text-sm mt-8 mb-4 underline">
          ← Back to <JapamBrand className="inline text-sm">Japam</JapamBrand>
        </Link>
      </div>
    </div>
  );
}
