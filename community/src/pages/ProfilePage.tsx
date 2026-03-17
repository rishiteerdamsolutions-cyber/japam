import { useAuthStore } from '../store/authStore';
import { usePriestStore } from '../store/priestStore';
import { NeoButton } from '../components/NeoButton';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchPriestSettings, updatePriestSettings, fetchBlockedUsers, unblockUser, fetchSeekers } from '../lib/apavargaApi';
import { useEffect, useState } from 'react';

export function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const { token: priestToken, templeName, clearPriest } = usePriestStore();
  const isPriest = !!priestToken;
  const [welcomeAutoReply, setWelcomeAutoReply] = useState('');
  const [appointmentAutoReply, setAppointmentAutoReply] = useState('');
  const [appointmentStartTime, setAppointmentStartTime] = useState('09:00');
  const [appointmentEndTime, setAppointmentEndTime] = useState('17:00');
  const [appointmentDays, setAppointmentDays] = useState('1,2,3,4,5');
  const [loading, setLoading] = useState(false);
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [seekers, setSeekers] = useState<{ uid: string; displayName: string | null }[]>([]);

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (isPriest) {
      fetchPriestSettings().then((s) => {
        setWelcomeAutoReply(s.welcomeAutoReply || '');
        setAppointmentAutoReply(s.appointmentAutoReply || '');
        setAppointmentStartTime(s.appointmentStartTime || '09:00');
        setAppointmentEndTime(s.appointmentEndTime || '17:00');
        setAppointmentDays(s.appointmentDays || '1,2,3,4,5');
      }).catch(() => {});
    }
  }, [isPriest]);

  useEffect(() => {
    if (isPriest) return;
    let cancelled = false;
    Promise.all([fetchBlockedUsers(), fetchSeekers()])
      .then(([b, s]) => {
        if (!cancelled) {
          setBlockedUids(b);
          setSeekers(s);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isPriest]);

  const getDisplayName = (uid: string) => seekers.find((s) => s.uid === uid)?.displayName || uid.slice(0, 8);

  const handleUnblock = async (blockedUid: string) => {
    try {
      await unblockUser(blockedUid);
      setBlockedUids((prev) => prev.filter((u) => u !== blockedUid));
    } catch {
      // ignore
    }
  };

  const handlePriestSignOut = () => {
    clearPriest();
    window.location.reload();
  };

  const handleSaveSettings = async () => {
    if (!isPriest) return;
    setLoading(true);
    try {
      await updatePriestSettings({
        welcomeAutoReply,
        appointmentAutoReply,
        appointmentStartTime,
        appointmentEndTime,
        appointmentDays,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleAppointmentDay = (d: number) => {
    const parts = appointmentDays.split(',').map((x) => x.trim()).filter(Boolean);
    const set = new Set(parts.map(Number));
    if (set.has(d)) {
      set.delete(d);
    } else {
      set.add(d);
    }
    setAppointmentDays(Array.from(set).sort((a, b) => a - b).join(','));
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="font-heading font-semibold text-xl text-white">Profile</h1>
        <p className="text-white/60 text-xs font-mono mt-0.5">
          {isPriest ? 'Set appointment availability and auto-replies' : 'Manage blocked users'}
        </p>
      </header>

      <div className="p-4 space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#151515] border border-white/10">
          <PriestAvatarCoin src={isPriest ? undefined : user?.photoURL ?? undefined} size={64} />
          <div className="flex-1 min-w-0">
            <p className="font-heading font-medium text-white truncate">
              {isPriest ? templeName || 'Priest' : (user?.displayName ?? user?.email ?? 'Member')}
            </p>
            <p className="text-white/50 text-xs font-mono truncate">
              {isPriest ? 'Verified priest' : user?.email}
            </p>
          </div>
        </div>

        {isPriest && (
          <>
            <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
              <h2 className="font-heading font-medium text-white">Auto-reply templates</h2>
              <input
                value={welcomeAutoReply}
                onChange={(e) => setWelcomeAutoReply(e.target.value)}
                placeholder="Welcome message (first-time seekers)"
                className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm"
              />
              <input
                value={appointmentAutoReply}
                onChange={(e) => setAppointmentAutoReply(e.target.value)}
                placeholder="Appointment request acknowledgment"
                className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm"
              />
            </div>

            <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
              <h2 className="font-heading font-medium text-white">Appointment availability</h2>
              <p className="text-white/60 text-xs font-mono">Set when seekers can book darshan with you</p>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, d) => {
                  const active = appointmentDays.split(',').map((x) => Number(x.trim())).includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleAppointmentDay(d)}
                      className={`px-3 py-2 rounded-xl font-mono text-sm border transition-colors ${
                        active ? 'bg-[var(--primary)] text-black border-[var(--primary)]' : 'bg-black/40 text-white/70 border-white/20'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="text-white/60 text-[10px] font-mono block mb-1">From</label>
                  <input
                    type="time"
                    value={appointmentStartTime}
                    onChange={(e) => setAppointmentStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 font-mono text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/60 text-[10px] font-mono block mb-1">To</label>
                  <input
                    type="time"
                    value={appointmentEndTime}
                    onChange={(e) => setAppointmentEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 font-mono text-sm"
                  />
                </div>
              </div>
              <NeoButton variant="primaryGold" onClick={handleSaveSettings} disabled={loading}>
                {loading ? 'Saving…' : 'Save all settings'}
              </NeoButton>
            </div>
          </>
        )}

        {!isPriest && blockedUids.length > 0 && (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-3">
            <h2 className="font-heading font-medium text-white">Blocked users</h2>
            <p className="text-white/60 text-xs font-mono">You have blocked these users. They cannot message you.</p>
            <div className="space-y-2">
              {blockedUids.map((uid) => (
                <div
                  key={uid}
                  className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-black/40 border border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-heading font-bold shrink-0">
                      ॐ
                    </div>
                    <span className="font-mono text-sm text-white truncate">{getDisplayName(uid)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(uid)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white/10 text-white hover:bg-white/20 shrink-0"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <NeoButton
          variant="secondaryWhite"
          fullWidth
          onClick={() => (isPriest ? handlePriestSignOut() : signOut())}
        >
          Sign out
        </NeoButton>
      </div>
    </div>
  );
}
