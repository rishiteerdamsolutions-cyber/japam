import type { UnlockData } from '../lib/unlock';
import { NeoButton } from '../components/NeoButton';

interface ProOnlyPageProps {
  unlock: UnlockData;
}

export function ProOnlyPage({ unlock }: ProOnlyPageProps) {
  const isBlocked = unlock.blocked;
  const apiError = unlock.apiError;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="font-heading font-semibold text-xl text-white">
          {apiError ? 'Unable to verify membership' : isBlocked ? 'Account restricted' : 'Pro members only'}
        </h1>
        <p className="text-white/70 text-sm font-mono">
          {apiError
            ? 'The server could not verify your pro status. Ensure the game is running (port 5173) with FIREBASE_SERVICE_ACCOUNT_JSON in .env, then try again.'
            : isBlocked
            ? 'Your account has been restricted. Please contact support.'
            : 'This community is for Japam pro and premium members. Unlock the full game in the Japam app to join.'}
        </p>
        {!isBlocked && (
          <NeoButton variant="ghost" onClick={() => window.location.reload()}>
            Back to welcome
          </NeoButton>
        )}
      </div>
    </div>
  );
}
