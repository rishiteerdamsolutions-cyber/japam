import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { useAuthStore } from './store/authStore';
import { usePriestStore } from './store/priestStore';
import { loadUnlock, canAccessCommunity, type UnlockData } from './lib/unlock';
import { joinApavarga } from './lib/apavarga';
import { auth } from './lib/firebase';
import { WelcomePage } from './pages/WelcomePage';
import { ProOnlyPage } from './pages/ProOnlyPage';
import { AppLayout } from './components/AppLayout';
import { ChatsPage } from './pages/ChatsPage';
import { ChatScreen } from './pages/ChatScreen';
import { StatusPage } from './pages/StatusPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupsPage } from './pages/GroupsPage';
import { RealsPage } from './pages/RealsPage';

function getCustomTokenFromHash(): string | null {
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith('ct=')) return null;
  try {
    return decodeURIComponent(hash.slice(3));
  } catch {
    return null;
  }
}

function App() {
  const { user, loading: authLoading, init } = useAuthStore();
  const { token: priestToken, init: initPriest } = usePriestStore();
  const [unlock, setUnlock] = useState<UnlockData | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [ssoChecking, setSsoChecking] = useState(() => Boolean(getCustomTokenFromHash()));
  const [ssoFailed, setSsoFailed] = useState(false);

  useEffect(() => {
    return init();
  }, [init]);
  useEffect(() => {
    initPriest();
  }, [initPriest]);

  useEffect(() => {
    const customToken = getCustomTokenFromHash();
    if (!customToken || !auth) {
      setSsoChecking(false);
      return;
    }
    signInWithCustomToken(auth, customToken)
      .then(() => {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      })
      .catch(() => {
        setSsoFailed(true);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      })
      .finally(() => {
        setSsoChecking(false);
      });
  }, []);

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

  if ((authLoading || ssoChecking) && !priestToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[var(--primary)] text-sm font-mono">{ssoChecking ? 'Opening…' : 'Loading…'}</div>
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
          <Route path="/reals" element={<RealsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/groups" element={<GroupsPage />} />
        </Route>
      </Routes>
    );
  }

  if (!user) {
    return <WelcomePage ssoFailed={ssoFailed} />;
  }

  if (unlockLoading || unlock === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[var(--primary)] text-sm font-mono">Checking membership…</div>
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
        <Route path="/reals" element={<RealsPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/groups" element={<GroupsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
