import { useAuthStore } from '../store/authStore';

export function CommunityHomePage() {
  const { user, signOut } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col p-6 bg-[#1a1a2e]">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-amber-200">Japam Community</h1>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-amber-400/80 text-sm underline hover:text-amber-400"
        >
          Sign out
        </button>
      </header>
      <div className="flex-1 text-gray-400 text-sm space-y-2">
        <p>Welcome, {user?.displayName ?? user?.email ?? 'member'}.</p>
        <p>Chat, status, and priest appointments will be available here.</p>
      </div>
    </div>
  );
}
