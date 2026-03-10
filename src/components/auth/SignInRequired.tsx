import { useEffect } from 'react';
import { GoogleSignIn } from './GoogleSignIn';
import { isFirebaseConfigured } from '../../lib/firebase';
import { AppFooter } from '../layout/AppFooter';

interface SignInRequiredProps {
  onBack: () => void;
  message?: string;
}

export function SignInRequired({ onBack, message = 'Sign in with Google to play' }: SignInRequiredProps) {
  useEffect(() => {
    if (!isFirebaseConfigured) onBack();
  }, [onBack]);

  if (!isFirebaseConfigured) return null;

  return (
    <div className="relative min-h-screen bg-cover bg-center p-4 pb-[env(safe-area-inset-bottom)] flex flex-col items-center justify-center" style={{ backgroundImage: 'url(/images/signinpagebg.png)' }}>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full">
      <button onClick={onBack} className="absolute top-4 left-4 text-amber-400 text-sm z-20">
        ← Back
      </button>
      <p className="text-amber-200 text-center mb-6">{message}</p>
      <GoogleSignIn />
      <AppFooter />
      </div>
    </div>
  );
}
