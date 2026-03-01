import { useAuthStore } from '../store/authStore';
import { usePriestStore } from '../store/priestStore';
import { NeoButton } from '../components/NeoButton';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchPriestSettings, updatePriestSettings } from '../lib/apavargaApi';
import { useEffect, useState } from 'react';

export function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const { token: priestToken, templeName, clearPriest } = usePriestStore();
  const isPriest = !!priestToken;
  const [welcomeAutoReply, setWelcomeAutoReply] = useState('');
  const [appointmentAutoReply, setAppointmentAutoReply] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPriest) {
      fetchPriestSettings().then((s) => {
        setWelcomeAutoReply(s.welcomeAutoReply || '');
        setAppointmentAutoReply(s.appointmentAutoReply || '');
      }).catch(() => {});
    }
  }, [isPriest]);

  const handlePriestSignOut = () => {
    clearPriest();
    window.location.reload();
  };

  const handleSaveSettings = async () => {
    if (!isPriest) return;
    setLoading(true);
    try {
      await updatePriestSettings(welcomeAutoReply, appointmentAutoReply);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="font-heading font-semibold text-xl text-white">Profile</h1>
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
            <NeoButton variant="primaryGold" onClick={handleSaveSettings} disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </NeoButton>
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
