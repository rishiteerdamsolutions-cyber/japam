import { useNavigate } from 'react-router-dom';
import { SignInRequired } from '../components/auth/SignInRequired';

export function SignInPage() {
  const navigate = useNavigate();
  return (
    <SignInRequired
      onBack={() => navigate(-1)}
      message="Sign in with Google to play and save your progress"
    />
  );
}
