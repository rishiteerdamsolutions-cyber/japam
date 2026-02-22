import { useEffect } from 'react';
import { GoogleSignIn } from './GoogleSignIn';
import { isFirebaseConfigured } from '../../lib/firebase';

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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)] flex flex-col items-center justify-center">
      <button onClick={onBack} className="absolute top-4 left-4 text-amber-400 text-sm">
        ← Back
      </button>
      <p className="text-amber-200 text-center mb-6">{message}</p>
      <GoogleSignIn />
    </div>
  );
}
