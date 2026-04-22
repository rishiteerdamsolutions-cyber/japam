import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInRequired } from '../components/auth/SignInRequired';
import { useAuthStore } from '../store/authStore';

export function SignInPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (!loading && user) {
      navigate('/menu', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <SignInRequired
      onBack={() => navigate(-1)}
      message="Sign in with Google to play and save your progress"
    />
  );
}
