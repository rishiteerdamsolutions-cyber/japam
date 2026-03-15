import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListRow } from '../components/ListRow';
import { NeoButton } from '../components/NeoButton';
import { PriestAvatarCoin } from '../components/PriestAvatarCoin';
import { fetchGroups, createGroup, manageGroup } from '../lib/apavargaApi';
import { usePriestStore } from '../store/priestStore';

interface Group {
  id: string;
  name: string;
  chatId?: string;
  templeId?: string;
  participants?: string[];
  adminOnlyMessaging?: boolean;
  lastMessageText?: string;
  lastMessageAt?: string;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function GroupsPage() {
  const navigate = useNavigate();
  const isPriest = !!usePriestStore((s) => s.token);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [adminOnly, setAdminOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGroups()
      .then((g) => { if (!cancelled) setGroups(g); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !isPriest || creating) return;
    setCreating(true);
    try {
      await createGroup(newName.trim(), adminOnly);
      setNewName('');
      setShowCreate(false);
      const g = await fetchGroups();
      setGroups(g);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAdminOnly = async (groupId: string, adminOnlyMessaging: boolean) => {
    try {
      await manageGroup(groupId, 'setAdminOnly', undefined, adminOnlyMessaging);
      const g = await fetchGroups();
      setGroups(g);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-24 flex items-center justify-center">
        <p className="text-white/60 font-mono text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="font-heading font-semibold text-xl text-white">Groups</h1>
        <p className="text-white/60 text-xs font-mono mt-1">{isPriest ? 'Create and manage groups' : 'Groups you\'ve joined'}</p>
      </header>

      <div className="p-4 space-y-4">
        {isPriest && (
          <NeoButton variant="primaryGold" fullWidth onClick={() => setShowCreate(true)}>
            Create group
          </NeoButton>
        )}

        {showCreate && isPriest && (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 placeholder:text-white/40 font-mono text-sm"
            />
            <label className="flex items-center gap-2 text-white/80 text-sm font-mono">
              <input type="checkbox" checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
              Admin-only messaging
            </label>
            <div className="flex gap-2">
              <NeoButton variant="primaryGold" onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? 'Creating…' : 'Create'}
              </NeoButton>
              <NeoButton variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>Cancel</NeoButton>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {groups.map((g) => (
            <div key={g.id}>
              <ListRow
                avatar={<PriestAvatarCoin size={48} />}
                title={g.name}
                subtitle={g.lastMessageText || `${g.participants?.length ?? 0} members • ${g.adminOnlyMessaging ? 'Admin only' : 'All can post'}`}
                trailing={formatTime(g.lastMessageAt)}
                onClick={() => g.chatId && navigate(`/chats/${g.chatId}`)}
                onKeyDown={(e) => e.key === 'Enter' && g.chatId && navigate(`/chats/${g.chatId}`)}
              />
              {isPriest && (
                <div className="flex gap-2 mt-2 ml-14">
                  <NeoButton
                    variant="ghost"
                    className="text-xs"
                    onClick={() => handleToggleAdminOnly(g.id, !g.adminOnlyMessaging)}
                  >
                    {g.adminOnlyMessaging ? 'Allow all to post' : 'Admin-only'}
                  </NeoButton>
                </div>
              )}
            </div>
          ))}
        </div>
        {groups.length === 0 && <p className="text-white/50 text-xs font-mono">No groups yet.</p>}
      </div>
    </div>
  );
}
