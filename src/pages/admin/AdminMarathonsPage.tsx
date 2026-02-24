import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';
import { AdminMarathonsList } from '../../components/admin/AdminMarathonsList';

export function AdminMarathonsPage() {
  const navigate = useNavigate();
  const token = getStoredAdminToken();

  useEffect(() => {
    if (!token) navigate('/admin', { replace: true });
  }, [token, navigate]);

  const onUnauthorized = () => {
    clearStoredAdminToken();
    navigate('/admin', { replace: true });
  };

  if (!token) return null;

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-4">Active Marathons</h1>
      <AdminMarathonsList adminToken={token} onUnauthorized={onUnauthorized} />
    </>
  );
}
