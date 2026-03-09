import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';
import { AdminMahaYagnasList } from '../../components/admin/AdminMahaYagnasList';

export function AdminMahaYagnasPage() {
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
      <h1 className="text-2xl font-bold text-amber-400 mb-4">Maha Japa Yagnas</h1>
      <AdminMahaYagnasList adminToken={token} onUnauthorized={onUnauthorized} />
    </>
  );
}
