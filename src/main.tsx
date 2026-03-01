import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './components/AuthProvider'
import { BlockedOverlay } from './components/BlockedOverlay'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { WhatsAppFab } from './components/ui/WhatsAppFab'
import App from './App.tsx'
import { MenuPage } from './pages/MenuPage'

const GamePage = lazy(() => import('./pages/GamePage').then(m => ({ default: m.GamePage })))
const LevelsPage = lazy(() => import('./pages/LevelsPage').then(m => ({ default: m.LevelsPage })))
const JapaPage = lazy(() => import('./pages/JapaPage').then(m => ({ default: m.JapaPage })))
const SignInPage = lazy(() => import('./pages/SignInPage').then(m => ({ default: m.SignInPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminPricingPage = lazy(() => import('./pages/admin/AdminPricingPage').then(m => ({ default: m.AdminPricingPage })))
const AdminTemplesPage = lazy(() => import('./pages/admin/AdminTemplesPage').then(m => ({ default: m.AdminTemplesPage })))
const AdminMarathonsPage = lazy(() => import('./pages/admin/AdminMarathonsPage').then(m => ({ default: m.AdminMarathonsPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminLevelsPage = lazy(() => import('./pages/admin/AdminLevelsPage').then(m => ({ default: m.AdminLevelsPage })))
const PriestPage = lazy(() => import('./pages/PriestPage').then(m => ({ default: m.PriestPage })))
const MarathonsPage = lazy(() => import('./pages/MarathonsPage').then(m => ({ default: m.MarathonsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

function PageFallback() {
  return <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]"><div className="text-amber-400 text-sm">Loading…</div></div>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
      <BlockedOverlay />
      <PWAUpdatePrompt />
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/levels" element={<LevelsPage />} />
        <Route path="/japa" element={<JapaPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/admin">
          <Route index element={<AdminPage />} />
          <Route element={<AdminLayout />}>
            <Route path="pricing" element={<AdminPricingPage />} />
            <Route path="temples" element={<AdminTemplesPage />} />
            <Route path="marathons" element={<AdminMarathonsPage />} />
            <Route path="levels" element={<AdminLevelsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="/priest" element={<PriestPage />} />
        <Route path="/marathons" element={<MarathonsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      </Suspense>
      <WhatsAppFab />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
