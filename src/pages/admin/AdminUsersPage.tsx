import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<{ uid: string; email: string | null; unlockedAt: string | null; isBlocked?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUid, setActionUid] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    const token = getStoredAdminToken();
    if (!token) return;
    const url = API_BASE ? `${API_BASE}/api/admin/data` : '/api/admin/data';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      body: JSON.stringify({ token, type: 'users' }),
    })
      .then((r) => {
        if (r.status === 401) {
          clearStoredAdminToken();
          navigate('/admin', { replace: true });
          return null;
        }
        return r.json();
      })
      .then((data: { users?: { uid: string; email: string | null; unlockedAt: string | null; isBlocked?: boolean }[]; error?: string } | null) => {
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

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    setLoading(true);
    loadUsers();
  }, [navigate, loadUsers]);

  const blockUser = async (uid: string) => {
    const token = getStoredAdminToken();
    if (!token) return;
    setActionUid(uid);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/block-user` : '/api/admin/block-user';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ token, uid }),
      });
      await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStoredAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isBlocked: true } : u)));
      }
    } finally {
      setActionUid(null);
    }
  };

  const unblockUser = async (uid: string) => {
    const token = getStoredAdminToken();
    if (!token) return;
    setActionUid(uid);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/unblock-user` : '/api/admin/unblock-user';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ token, uid }),
      });
      await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStoredAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isBlocked: false } : u)));
      }
    } finally {
      setActionUid(null);
    }
  };

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
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-amber-500/20">
                  <td className="px-3 py-2">{u.email || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.uid.slice(0, 12)}…</td>
                  <td className="px-3 py-2">{u.unlockedAt ? new Date(u.unlockedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">
                    {u.isBlocked ? (
                      <span className="text-red-400 text-xs">Blocked</span>
                    ) : (
                      <span className="text-green-400/80 text-xs">Active</span>
                    )}
                    <span className="ml-2">
                      {u.isBlocked ? (
                        <button
                          type="button"
                          onClick={() => unblockUser(u.uid)}
                          disabled={actionUid === u.uid}
                          className="text-xs px-2 py-1 rounded bg-green-600/80 text-white disabled:opacity-50"
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => blockUser(u.uid)}
                          disabled={actionUid === u.uid}
                          className="text-xs px-2 py-1 rounded bg-red-600/80 text-white disabled:opacity-50"
                        >
                          Block
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
