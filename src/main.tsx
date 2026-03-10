import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './i18n'
import { initSentry } from './lib/sentry'
import { ErrorBoundary } from './components/ErrorBoundary'

initSentry()
import { AuthProvider } from './components/AuthProvider'
import { PaymentReturnHandler } from './components/PaymentReturnHandler'
import { BlockedOverlay } from './components/BlockedOverlay'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineBanner } from './components/OfflineBanner'
import { SpeedInsights } from '@vercel/speed-insights/react'
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
const AdminMahaYagnasPage = lazy(() => import('./pages/admin/AdminMahaYagnasPage').then(m => ({ default: m.AdminMahaYagnasPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminLevelsPage = lazy(() => import('./pages/admin/AdminLevelsPage').then(m => ({ default: m.AdminLevelsPage })))
const PriestPage = lazy(() => import('./pages/PriestPage').then(m => ({ default: m.PriestPage })))
const MarathonsPage = lazy(() => import('./pages/MarathonsPage').then(m => ({ default: m.MarathonsPage })))
const MahaYagnasPage = lazy(() => import('./pages/MahaYagnasPage').then(m => ({ default: m.MahaYagnasPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ApavargaPage = lazy(() => import('./pages/ApavargaPage').then(m => ({ default: m.ApavargaPage })))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })))
const RefundCancellationPage = lazy(() => import('./pages/RefundCancellationPage').then(m => ({ default: m.RefundCancellationPage })))
const ShippingDeliveryPage = lazy(() => import('./pages/ShippingDeliveryPage').then(m => ({ default: m.ShippingDeliveryPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })))
function PageFallback() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-3 bg-cover bg-center" style={{ backgroundImage: 'url(/images/pagefallbackbg.png)' }}>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" aria-hidden />
      <p className="text-amber-400 text-sm">Loading…</p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
      <PaymentReturnHandler />
      <BlockedOverlay />
      <PWAUpdatePrompt />
      <OfflineBanner />
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
            <Route path="maha-yagnas" element={<AdminMahaYagnasPage />} />
            <Route path="levels" element={<AdminLevelsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="/priest" element={<PriestPage />} />
        <Route path="/marathons" element={<MarathonsPage />} />
        <Route path="/maha-yagnas" element={<MahaYagnasPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/apavarga" element={<ApavargaPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-cancellation" element={<RefundCancellationPage />} />
        <Route path="/shipping-delivery" element={<ShippingDeliveryPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
      </Suspense>
      <WhatsAppFab />
      <SpeedInsights />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
