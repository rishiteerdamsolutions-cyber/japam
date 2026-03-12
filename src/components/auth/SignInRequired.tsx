import { useEffect } from 'react';
import { GoogleSignIn } from './GoogleSignIn';
import { JapamLogo } from '../ui/JapamLogo';
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
    <div className="relative min-h-screen p-4 pb-[env(safe-area-inset-bottom)] flex flex-col items-center overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full max-w-sm">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-amber-400/90 text-sm font-medium hover:text-amber-400 z-20"
          aria-label="Back"
        >
          ← Back
        </button>
        <JapamLogo size={80} className="mb-6 drop-shadow-lg shrink-0" />
        <div className="w-full rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10 p-6 space-y-4">
          <h2 className="text-amber-400 font-semibold text-center text-sm">Sign in</h2>
          <p className="text-amber-200/90 text-sm text-center leading-relaxed">{message}</p>
          <div className="flex justify-center pt-2">
            <GoogleSignIn />
          </div>
        </div>
        <div className="mt-auto pt-8 w-full">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
