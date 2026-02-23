import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPanel } from '../components/admin/AdminPanel';
import { useAuthStore } from '../store/authStore';

export function AdminPage() {
  const navigate = useNavigate();
  const authInit = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = authInit();
    return unsubscribe;
  }, [authInit]);

  return (
    <AdminPanel
      onBack={() => navigate('/', { replace: true })}
    />
  );
}
