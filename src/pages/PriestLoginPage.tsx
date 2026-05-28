import { useNavigate } from 'react-router-dom';
import { PriestLoginForm } from '../components/priest/PriestLoginForm';

export function PriestLoginPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative z-10 flex flex-col items-center w-full">
        <h1 className="text-2xl font-bold text-amber-400 mb-2">Priest Login</h1>
        <p className="text-amber-200/70 text-sm mb-6">Sign in to manage your temple&apos;s marathons</p>
        <PriestLoginForm onSuccess={() => navigate('/priest', { replace: true })} />
      </div>
    </div>
  );
}

export { PRIEST_TOKEN_KEY, PRIEST_TEMPLE_KEY } from '../components/priest/PriestLoginForm';