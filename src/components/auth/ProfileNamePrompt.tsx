import { useEffect, useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';

export function ProfileNamePrompt() {
  const user = useAuthStore((s) => s.user);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const displayName = useProfileStore((s) => s.displayName);
  const hasSavedDisplayName = useProfileStore((s) => s.hasSavedDisplayName);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptedUid, setPromptedUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setOpen(false);
      setPromptedUid(null);
      return;
    }
    if (!profileLoaded) return;
    if (hasSavedDisplayName) {
      setOpen(false);
      return;
    }
    if (promptedUid === user.uid) return;
    setName((displayName || user.displayName || user.email?.split('@')[0] || '').trim());
    setError(null);
    setOpen(true);
    setPromptedUid(user.uid);
  }, [user?.uid, user?.displayName, user?.email, profileLoaded, hasSavedDisplayName, displayName, promptedUid]);

  if (!open || !user?.uid) return null;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ok = await setDisplayName(trimmed);
      if (ok) setOpen(false);
      else setError('Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm px-4 flex items-center justify-center">
      <form
        onSubmit={onSave}
        className="w-full max-w-sm rounded-2xl border border-amber-400/40 bg-[#160c07]/95 shadow-[0_16px_50px_rgba(0,0,0,0.55)] p-4"
      >
        <h2 className="text-amber-300 text-lg font-semibold">Save your name</h2>
        <p className="text-amber-100/80 text-xs mt-1">
          This name is used in leaderboards and your shared Japam cards.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Enter your name"
          className="mt-3 w-full rounded-lg border border-amber-400/40 bg-black/30 text-amber-100 px-3 py-2 text-sm outline-none focus:border-amber-300"
        />
        {error ? <p className="mt-2 text-red-300 text-xs">{error}</p> : null}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-xs rounded border border-white/25 text-amber-100/80"
          >
            Later
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded bg-amber-500 text-black font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
