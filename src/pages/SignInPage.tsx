import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignInRequired } from '../components/auth/SignInRequired';
import { useAuthStore } from '../store/authStore';

function safeReturnPath(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return '/menu';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/menu';
  if (trimmed.includes('://')) return '/menu';
  const pathOnly = trimmed.split('?')[0] ?? '';
  if (pathOnly === '/signin' || pathOnly.startsWith('/signin/')) return '/menu';
  return trimmed;
}

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const returnParam = searchParams.get('return');

  const afterSignInPath = useMemo(() => safeReturnPath(returnParam), [returnParam]);

  useEffect(() => {
    if (!loading && user) {
      navigate(afterSignInPath, { replace: true });
    }
  }, [user, loading, navigate, afterSignInPath]);

  return (
    <SignInRequired
      onBack={() => navigate(-1)}
      message="Sign in with Google to play and save your progress"
    />
  );
}
