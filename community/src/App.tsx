import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePriestStore } from './store/priestStore';
import { loadUnlock, canAccessCommunity, type UnlockData } from './lib/unlock';
import { joinApavarga } from './lib/apavarga';
import { WelcomePage } from './pages/WelcomePage';
import { ProOnlyPage } from './pages/ProOnlyPage';
import { AppLayout } from './components/AppLayout';
import { ChatsPage } from './pages/ChatsPage';
import { ChatScreen } from './pages/ChatScreen';
import { StatusPage } from './pages/StatusPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupsPage } from './pages/GroupsPage';

function App() {
  const { user, loading: authLoading, init } = useAuthStore();
  const { token: priestToken, init: initPriest } = usePriestStore();
  const [unlock, setUnlock] = useState<UnlockData | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    return init();
  }, [init]);
  useEffect(() => {
    initPriest();
  }, [initPriest]);

  useEffect(() => {
    if (!user) {
      setUnlock(null);
      return;
    }
    let cancelled = false;
    setUnlockLoading(true);
    loadUnlock()
      .then((data) => {
        if (!cancelled) setUnlock(data);
      })
      .finally(() => {
        if (!cancelled) setUnlockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading && !priestToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#FFD700] text-sm font-mono">Loading…</div>
      </div>
    );
  }

  if (priestToken) {
    return (
      <Routes>
        <Route element={<AppLayout isPriest />}>
          <Route path="/" element={<Navigate to="/chats" replace />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/chats/:id" element={<ChatScreen />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/groups" element={<GroupsPage />} />
        </Route>
      </Routes>
    );
  }

  if (!user) {
    return <WelcomePage />;
  }

  if (unlockLoading || unlock === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#FFD700] text-sm font-mono">Checking membership…</div>
      </div>
    );
  }

  if (!canAccessCommunity(unlock)) {
    return <ProOnlyPage unlock={unlock} />;
  }

  joinApavarga().catch(() => {});

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chats/:id" element={<ChatScreen />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/groups" element={<GroupsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
