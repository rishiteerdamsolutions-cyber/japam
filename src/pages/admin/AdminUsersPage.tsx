import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<{ uid: string; email: string | null; unlockedAt: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    const url = API_BASE ? `${API_BASE}/api/admin/unlocked-users` : '/api/admin/unlocked-users';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        if (r.status === 401) {
          clearStoredAdminToken();
          navigate('/admin', { replace: true });
          return null;
        }
        return r.json();
      })
      .then((data: { users?: { uid: string; email: string | null; unlockedAt: string | null }[]; total?: number; error?: string } | null) => {
        if (data == null) return;
        if (data.error) {
          setError(String(data.error));
          setUsers([]);
        } else {
          setUsers(data.users ?? []);
          setError(null);
        }
      })
      .catch(() => {
        setError('Failed to load');
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <p className="text-amber-200/70">Loading…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-4">Users who paid (unlock)</h1>
      <p className="text-amber-200/80 text-sm mb-4">Total: {users.length}</p>
      {users.length === 0 ? (
        <p className="text-amber-200/70">No paid users yet. New payments will appear here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-amber-200 border border-amber-500/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-amber-500/20">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-amber-500/20">
                  <td className="px-3 py-2">{u.email || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.uid.slice(0, 12)}…</td>
                  <td className="px-3 py-2">{u.unlockedAt ? new Date(u.unlockedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
