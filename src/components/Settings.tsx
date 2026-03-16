import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppFooter } from './layout/AppFooter';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useUnlockStore } from '../store/unlockStore';
import { GoogleSignIn } from './auth/GoogleSignIn';
import { DonateThankYouBox } from './donation/DonateThankYouBox';
import { AppHeader } from './layout/AppHeader';
import { loadMyAppreciations, type MyAppreciations } from '../lib/firestore';
import { useReminderStore } from '../store/reminderStore';
import { JAPAM_CHECK_UPDATES_EVENT, JAPAM_CHECK_RESULT_EVENT } from './PWAUpdatePrompt';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const WHATSAPP_LINK = 'https://wa.me/919505009699';
const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PRIEST_TOKEN_KEY = 'japam_priest_token';
const PRIEST_TEMPLE_KEY = 'japam_priest_temple';

// Icons (stroke, 24x24)
const Icons = {
  profile: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  bell: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  music: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  priest: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  update: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  chat: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  apavarga: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  install: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

function SettingsCard({
  icon: Icon,
  label,
  badge,
  expanded,
  onToggle,
  children,
}: {
  icon: () => React.ReactElement;
  label: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-black/20 border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-amber-200 block truncate">{label}</span>
          {badge && <span className="text-amber-400/70 text-xs">{badge}</span>}
        </div>
        <svg
          className={`w-5 h-5 text-amber-400/60 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4 pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tier = useUnlockStore((s) => s.tier);
  const { backgroundMusicEnabled, backgroundMusicVolume, load, setBackgroundMusic, setBackgroundMusicVolume } = useSettingsStore();
  const { displayName, setDisplayName } = useProfileStore();
  const [localName, setLocalName] = useState(displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [appreciations, setAppreciations] = useState<MyAppreciations | null>(null);
  const [loadingAppreciations, setLoadingAppreciations] = useState(false);
  const [priestUsername, setPriestUsername] = useState('');
  const [priestPassword, setPriestPassword] = useState('');
  const [priestLinking, setPriestLinking] = useState(false);
  const [priestMessage, setPriestMessage] = useState<string | null>(null);
  const reminder = useReminderStore((s) => s.reminder);
  const reminderLoaded = useReminderStore((s) => s.loaded);
  const loadReminder = useReminderStore((s) => s.load);
  const setReminder = useReminderStore((s) => s.setReminder);
  const [savingReminder, setSavingReminder] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [testingNotif, setTestingNotif] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [checkUpdateMessage, setCheckUpdateMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const onCheckResult = (e: Event) => {
      setCheckingUpdate(false);
      const detail = (e as CustomEvent<{ ok: boolean; reason?: string }>).detail;
      if (detail.ok) {
        setCheckUpdateMessage("Update check complete.");
      } else {
        setCheckUpdateMessage("Couldn't check. Try refreshing.");
      }
      setTimeout(() => setCheckUpdateMessage(null), 4000);
    };
    window.addEventListener(JAPAM_CHECK_RESULT_EVENT, onCheckResult);
    return () => window.removeEventListener(JAPAM_CHECK_RESULT_EVENT, onCheckResult);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  }, [installPrompt]);

  const requestNotifPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm !== 'granted') return;
    }
    setTestingNotif(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg) {
          await reg.showNotification('Japam reminder \uD83D\uDE4F', {
            body: "Time to chant your favourite God's name.",
            icon: '/vite.svg',
            tag: 'japam-test',
          });
          return;
        }
      }
      new Notification('Japam reminder \uD83D\uDE4F', { body: "Time to chant your favourite God's name." });
    } finally {
      setTestingNotif(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (user?.uid) loadReminder(user.uid).catch(() => {});
    else loadReminder(undefined).catch(() => {});
  }, [user?.uid, loadReminder]);
  useEffect(() => { setLocalName(displayName ?? ''); }, [displayName]);
  useEffect(() => {
    if (!user?.uid) { setAppreciations(null); return; }
    let cancelled = false;
    setLoadingAppreciations(true);
    loadMyAppreciations(user.uid)
      .then((a) => { if (!cancelled) setAppreciations(a); })
      .finally(() => { if (!cancelled) setLoadingAppreciations(false); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSavingName(true);
    try { await setDisplayName(localName); } finally { setSavingName(false); }
  };

  const handlePriestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !priestUsername.trim() || !priestPassword) {
      setPriestMessage('Sign in first, then enter priest credentials');
      return;
    }
    setPriestLinking(true);
    setPriestMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/link` : '/api/priest/link';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, priestUsername: priestUsername.trim(), priestPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPriestMessage(data.error || 'Invalid credentials');
        return;
      }
      if (data.token && data.templeId) {
        localStorage.setItem(PRIEST_TOKEN_KEY, data.token);
        localStorage.setItem(PRIEST_TEMPLE_KEY, JSON.stringify({ templeId: data.templeId, templeName: data.templeName || '' }));
        setPriestMessage('Linked!');
        setPriestUsername('');
        setPriestPassword('');
      }
    } catch {
      setPriestMessage('Failed to link');
    } finally {
      setPriestLinking(false);
    }
  };

  const toggle = (key: string) => setExpanded((x) => (x === key ? null : key));

  return (
    <div className="relative min-h-screen p-4 pb-[env(safe-area-inset-bottom)] overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 max-w-md mx-auto">
        <AppHeader title="Settings" showBack onBack={onBack} />

        <DonateThankYouBox />

        <section className="mb-6">
          <GoogleSignIn />
        </section>

        <div className="grid grid-cols-2 gap-3">
          {user && (
            <SettingsCard
              icon={Icons.profile}
              label="Profile"
              badge={loadingAppreciations ? '…' : ((appreciations?.heart ?? 0) + (appreciations?.like ?? 0) + (appreciations?.clap ?? 0) > 0 ? `❤️${appreciations?.heart ?? 0} 👍${appreciations?.like ?? 0} 👏${appreciations?.clap ?? 0}` : 'Edit name')}
              expanded={expanded === 'profile'}
              onToggle={() => toggle('profile')}
            >
              <form onSubmit={handleNameSave} className="space-y-3">
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  maxLength={80}
                  placeholder={user.displayName || (user.email ? user.email.split('@')[0] : 'Your name')}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/30 text-white border border-white/10 text-sm focus:border-amber-500/50 focus:outline-none"
                />
                <button type="submit" disabled={savingName || !localName.trim()} className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50">
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </form>
            </SettingsCard>
          )}

          {user && (
            <SettingsCard
              icon={Icons.bell}
              label="Reminder"
              badge={reminder.enabled ? reminder.time || '07:00' : 'Off'}
              expanded={expanded === 'reminder'}
              onToggle={() => toggle('reminder')}
            >
              <div className="space-y-3">
                {!isInstalled && (
                  <div className="rounded-xl bg-black/30 p-3 space-y-2">
                    {installPrompt ? (
                      <button type="button" onClick={handleInstall} className="w-full py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">
                        Install app
                      </button>
                    ) : (
                      <p className="text-amber-200/70 text-xs">Share → Add to Home Screen</p>
                    )}
                  </div>
                )}
                {isInstalled && <p className="text-green-400/90 text-xs">✓ App installed</p>}
                {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
                  <div className="rounded-xl bg-black/30 p-3">
                    {notifPermission !== 'denied' && (
                      <button type="button" onClick={requestNotifPermission} className="w-full py-2 rounded-lg bg-white/10 text-amber-200 text-sm">
                        Allow notifications
                      </button>
                    )}
                    {notifPermission === 'denied' && <p className="text-amber-200/70 text-xs">Enable in device settings</p>}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-amber-200/80 text-sm">Enable</span>
                  <button
                    type="button"
                    disabled={!reminderLoaded || savingReminder}
                    onClick={async () => {
                      if (!reminderLoaded) return;
                      const next = !reminder.enabled;
                      if (next && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                        setNotifPermission(await Notification.requestPermission().catch(() => 'default' as NotificationPermission));
                      }
                      setSavingReminder(true);
                      try { await setReminder({ enabled: next, time: next ? (reminder.time || '07:00') : null }); } finally { setSavingReminder(false); }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${reminder.enabled ? 'bg-amber-500 text-white' : 'bg-white/10 text-amber-200'} disabled:opacity-50`}
                  >
                    {reminder.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className={`${reminder.enabled ? '' : 'opacity-50'}`}>
                  <label className="text-amber-200/70 text-xs block mb-1">Time</label>
                  <input
                    type="time"
                    disabled={!reminder.enabled || savingReminder}
                    value={reminder.time || '07:00'}
                    onChange={async (e) => {
                      const time = e.target.value;
                      if (!/^\d{2}:\d{2}$/.test(time)) return;
                      setSavingReminder(true);
                      try { await setReminder({ enabled: true, time }); } finally { setSavingReminder(false); }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10 text-sm"
                  />
                </div>
                {notifPermission === 'granted' && (
                  <button type="button" disabled={testingNotif} onClick={sendTestNotification} className="w-full py-2 rounded-lg bg-white/10 text-amber-200 text-sm">
                    {testingNotif ? 'Sending…' : 'Test notification'}
                  </button>
                )}
              </div>
            </SettingsCard>
          )}

          <SettingsCard
            icon={Icons.music}
            label="Music"
            badge={backgroundMusicEnabled ? `${Math.round((backgroundMusicVolume ?? 0.25) * 100)}%` : 'Off'}
            expanded={expanded === 'music'}
            onToggle={() => toggle('music')}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-amber-200/80 text-sm">Background</span>
                <button
                  onClick={() => setBackgroundMusic(!backgroundMusicEnabled)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${backgroundMusicEnabled ? 'bg-amber-500 text-white' : 'bg-white/10 text-amber-200'}`}
                >
                  {backgroundMusicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {backgroundMusicEnabled && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((backgroundMusicVolume ?? 0.25) * 100)}
                    onChange={(e) => setBackgroundMusicVolume(Number(e.target.value) / 100)}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-amber-200/70 text-xs w-10">{Math.round((backgroundMusicVolume ?? 0.25) * 100)}%</span>
                </div>
              )}
            </div>
          </SettingsCard>

          {(tier === 'pro' || tier === 'premium') ? (
            <a
              href="/apavarga"
              className="rounded-2xl bg-black/20 border border-white/10 p-4 flex items-center gap-4 hover:bg-white/5 transition-colors no-underline"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Icons.apavarga />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-amber-200 block">Apavarga</span>
                <span className="text-amber-400/70 text-xs">Log in →</span>
              </div>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/about-apavarga')}
              className="rounded-2xl bg-black/20 border border-white/10 p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left w-full"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Icons.apavarga />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-amber-200 block">Apavarga</span>
                <span className="text-amber-400/70 text-xs">Unlock with Pro</span>
              </div>
            </button>
          )}

          <SettingsCard
            icon={Icons.priest}
            label="Priest"
            badge={user ? 'Link account' : 'Sign in first'}
            expanded={expanded === 'priest'}
            onToggle={() => toggle('priest')}
          >
            <form onSubmit={handlePriestLink} className="space-y-3">
              <input
                type="text"
                value={priestUsername}
                onChange={(e) => setPriestUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 text-white border border-white/10 text-sm"
              />
              <input
                type="password"
                value={priestPassword}
                onChange={(e) => setPriestPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 text-white border border-white/10 text-sm"
              />
              <button type="submit" disabled={priestLinking || !user} className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50">
                {priestLinking ? 'Linking…' : 'Link'}
              </button>
              {priestMessage && <p className="text-amber-200 text-xs">{priestMessage}</p>}
              {user && <Link to="/priest" className="text-amber-400 text-sm block">Priest dashboard →</Link>}
            </form>
          </SettingsCard>

          <SettingsCard
            icon={Icons.update}
            label="Updates"
            badge={checkingUpdate ? '…' : (checkUpdateMessage ? '✓' : 'Check')}
            expanded={expanded === 'update'}
            onToggle={() => toggle('update')}
          >
            <div className="space-y-3">
              <button
                type="button"
                disabled={checkingUpdate}
                onClick={() => {
                  setCheckingUpdate(true);
                  setCheckUpdateMessage(null);
                  window.dispatchEvent(new CustomEvent(JAPAM_CHECK_UPDATES_EVENT));
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500/80 text-white text-sm font-medium disabled:opacity-70"
              >
                {checkingUpdate ? 'Checking…' : 'Check for updates'}
              </button>
              {checkUpdateMessage && <p className="text-amber-200/80 text-xs">{checkUpdateMessage}</p>}
            </div>
          </SettingsCard>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-12 h-12 rounded-xl bg-[#25D366]/90 text-white hover:bg-[#25D366] transition-colors"
            aria-label="Contact WhatsApp"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          <a
            href="https://wa.me/919505009699?text=Hi%2C%20I%20would%20like%20to%20suggest%20adding%20a%20new%20deity%2Fgod%2Fjapa%20to%20Japam%20app%3A%20"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-12 h-12 rounded-xl bg-white/10 text-amber-200 hover:bg-white/15 transition-colors"
            aria-label="Suggest deity"
          >
            <Icons.chat />
          </a>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
