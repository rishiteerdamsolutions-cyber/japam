import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';
import { AddTempleForm } from '../../components/admin/AddTempleForm';
import { TemplesList } from '../../components/admin/TemplesList';

function useAdminToken() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => getStoredAdminToken());

  useEffect(() => {
    const t = getStoredAdminToken();
    if (!t) navigate('/admin', { replace: true });
    else setToken(t);
  }, [navigate]);

  const onUnauthorized = () => {
    clearStoredAdminToken();
    navigate('/admin', { replace: true });
  };

  return { token, onUnauthorized };
}

export function AdminTemplesPage() {
  const { token, onUnauthorized } = useAdminToken();
  const [refresh, setRefresh] = useState(0);

  if (!token) return null;

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-4">Add Temple / Priest</h1>
      <AddTempleForm
        adminToken={token}
        onSuccess={() => setRefresh((k) => k + 1)}
        onLogout={onUnauthorized}
      />
      <TemplesList
        adminToken={token}
        refreshTrigger={refresh}
        onUnauthorized={onUnauthorized}
      />
    </>
  );
}
