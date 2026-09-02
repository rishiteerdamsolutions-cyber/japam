import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './i18n'
import { initSentry } from './lib/sentry'
import { ErrorBoundary } from './components/ErrorBoundary'

initSentry()
import { AuthProvider } from './components/AuthProvider'
import { AuthSessionOverlay } from './components/AuthSessionOverlay'
import { PaymentReturnHandler } from './components/PaymentReturnHandler'
import { RefCapture } from './components/RefCapture'
import { BlockedOverlay } from './components/BlockedOverlay'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineBanner } from './components/OfflineBanner'
import { RouterChrome } from './components/RouterChrome'
import { GlobalJapamBackdrop } from './components/layout/GlobalJapamBackdrop'
import { DeitySharePickerProvider } from './components/share/DeitySharePickerContext'
import { SeoLandingParams } from './components/SeoLandingParams'
import { GoogleAnalytics } from './components/GoogleAnalytics'
import { ProductUsageTracker } from './components/ProductUsageTracker'
import { LearnLayout } from './layouts/LearnLayout'
import { RequireAuth } from './components/auth/RequireAuth'
import App from './App.tsx'
import { MenuPage } from './pages/MenuPage'
import { MenuDemoTestPage } from './pages/MenuDemoTestPage'
import { MalaSwipeHapticTestPage } from './pages/MalaSwipeHapticTestPage'
import { JapamCounterBackdropTestPage } from './pages/JapamCounterBackdropTestPage'
import { LAUNCH_FEATURE_OCCASION_GAMES } from './config/launchFeatures'

const GamePage = lazy(() => import('./pages/GamePage').then(m => ({ default: m.GamePage })))
const LevelsPage = lazy(() => import('./pages/LevelsPage').then(m => ({ default: m.LevelsPage })))
const JapaPage = lazy(() => import('./pages/JapaPage').then(m => ({ default: m.JapaPage })))
const SignInPage = lazy(() => import('./pages/SignInPage').then(m => ({ default: m.SignInPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminPricingPage = lazy(() => import('./pages/admin/AdminPricingPage').then(m => ({ default: m.AdminPricingPage })))
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage').then(m => ({ default: m.AdminCouponsPage })))
const AdminTemplesPage = lazy(() => import('./pages/admin/AdminTemplesPage').then(m => ({ default: m.AdminTemplesPage })))
const AdminMarathonsPage = lazy(() => import('./pages/admin/AdminMarathonsPage').then(m => ({ default: m.AdminMarathonsPage })))
const AdminMahaYagnasPage = lazy(() => import('./pages/admin/AdminMahaYagnasPage').then(m => ({ default: m.AdminMahaYagnasPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminLevelsPage = lazy(() => import('./pages/admin/AdminLevelsPage').then(m => ({ default: m.AdminLevelsPage })))
const AdminVideosPage = lazy(() => import('./pages/admin/AdminVideosPage').then(m => ({ default: m.AdminVideosPage })))
const AdminVideoAnalyticsPage = lazy(() => import('./pages/admin/AdminVideoAnalyticsPage').then(m => ({ default: m.AdminVideoAnalyticsPage })))
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })))
const AdminProductUsagePage = lazy(() => import('./pages/admin/AdminProductUsagePage').then(m => ({ default: m.AdminProductUsagePage })))
const AdminAppConfigPage = lazy(() => import('./pages/admin/AdminAppConfigPage').then((m) => ({ default: m.AdminAppConfigPage })))
const AdminSatsangPage = lazy(() => import('./pages/admin/AdminSatsangPage').then((m) => ({ default: m.AdminSatsangPage })))
const GaneshotsavPage = lazy(() => import('./pages/GaneshotsavPage').then((m) => ({ default: m.GaneshotsavPage })))
const SatsangReportPage = lazy(() => import('./pages/SatsangReportPage').then((m) => ({ default: m.SatsangReportPage })))
const PriestPage = lazy(() => import('./pages/PriestPage').then(m => ({ default: m.PriestPage })))
const PriestLoginPage = lazy(() => import('./pages/PriestLoginPage').then(m => ({ default: m.PriestLoginPage })))
const MarathonsPage = lazy(() => import('./pages/MarathonsPage').then(m => ({ default: m.MarathonsPage })))
const MahaYagnasPage = lazy(() => import('./pages/MahaYagnasPage').then(m => ({ default: m.MahaYagnasPage })))
const PlansDakshinaPage = lazy(() => import('./pages/PlansDakshinaPage').then(m => ({ default: m.PlansDakshinaPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ApavargaPage = lazy(() => import('./pages/ApavargaPage').then(m => ({ default: m.ApavargaPage })))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })))
const RefundCancellationPage = lazy(() => import('./pages/RefundCancellationPage').then(m => ({ default: m.RefundCancellationPage })))
const ShippingDeliveryPage = lazy(() => import('./pages/ShippingDeliveryPage').then(m => ({ default: m.ShippingDeliveryPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })))
const LearnPage = lazy(() => import('./pages/learn/LearnPage').then((m) => ({ default: m.LearnPage })))
const PushpaAradhanaPage = lazy(() =>
  import('./pages/PushpaAradhanaPage').then((m) => ({ default: m.PushpaAradhanaPage })),
)
const SpecialsPage = lazy(() => import('./pages/SpecialsPage').then((m) => ({ default: m.SpecialsPage })))
const Japa108SpecialPage = lazy(() =>
  import('./pages/Japa108SpecialPage').then((m) => ({ default: m.Japa108SpecialPage })),
)
const WeeklyStreakPage = lazy(() =>
  import('./pages/WeeklyStreakPage').then((m) => ({ default: m.WeeklyStreakPage })),
)
const JapamCounterSpecialPage = lazy(() =>
  import('./pages/JapamCounterSpecialPage').then((m) => ({ default: m.JapamCounterSpecialPage })),
)
const AutoJapamCounterSpecialPage = lazy(() =>
  import('./pages/JapamCounterSpecialPage').then((m) => ({ default: m.AutoJapamCounterSpecialPage })),
)
const BirthdayOccasionPage = lazy(() =>
  import('./pages/BirthdayOccasionPage').then((m) => ({ default: m.BirthdayOccasionPage })),
);
const AnniversaryLobbyPage = lazy(() =>
  import('./pages/AnniversaryLobbyPage').then((m) => ({ default: m.AnniversaryLobbyPage })),
);
const AnniversaryJoinPage = lazy(() =>
  import('./pages/AnniversaryJoinPage').then((m) => ({ default: m.AnniversaryJoinPage })),
);
// eslint-disable-next-line react-refresh/only-export-components
function PageFallback() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-3">
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
      <GlobalJapamBackdrop />
      <AuthProvider>
      <DeitySharePickerProvider>
      <AuthSessionOverlay />
      <PaymentReturnHandler />
      <RefCapture />
      <SeoLandingParams />
      <GoogleAnalytics />
      <ProductUsageTracker />
      <BlockedOverlay />
      <PWAUpdatePrompt />
      <OfflineBanner />
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/ganeshotsav" element={<GaneshotsavPage />} />
        <Route path="/satsang-report" element={<SatsangReportPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route
          path="/pushpa-aradhana"
          element={
            <RequireAuth>
              <PushpaAradhanaPage />
            </RequireAuth>
          }
        />
        <Route path="/specials" element={<SpecialsPage />} />
        <Route
          path="/special-108-japa"
          element={
            <RequireAuth>
              <Japa108SpecialPage />
            </RequireAuth>
          }
        />
        <Route
          path="/weekly-streak"
          element={
            <RequireAuth>
              <WeeklyStreakPage />
            </RequireAuth>
          }
        />
        <Route
          path="/special-japam-counter"
          element={
            <RequireAuth>
              <JapamCounterSpecialPage />
            </RequireAuth>
          }
        />
        <Route
          path="/special-auto-japam-counter"
          element={
            <RequireAuth>
              <AutoJapamCounterSpecialPage />
            </RequireAuth>
          }
        />
        <Route path="/pushpa-abhisheka" element={<Navigate to="/pushpa-aradhana" replace />} />
        <Route path="/test/menu-demo" element={<MenuDemoTestPage />} />
        <Route path="/test/mala-swipe-haptic" element={<MalaSwipeHapticTestPage />} />
        <Route path="/test/japam-counter" element={<JapamCounterBackdropTestPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/levels" element={<LevelsPage />} />
        <Route path="/japa" element={<JapaPage />} />
        <Route
          path="/occasion/birthday"
          element={
            LAUNCH_FEATURE_OCCASION_GAMES ? <BirthdayOccasionPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/occasion/anniversary"
          element={
            LAUNCH_FEATURE_OCCASION_GAMES ? <AnniversaryLobbyPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/occasion/anniversary/join"
          element={
            LAUNCH_FEATURE_OCCASION_GAMES ? <AnniversaryJoinPage /> : <Navigate to="/" replace />
          }
        />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/admin">
          <Route index element={<AdminPage />} />
          <Route element={<AdminLayout />}>
            <Route path="pricing" element={<AdminPricingPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="temples" element={<AdminTemplesPage />} />
            <Route path="marathons" element={<AdminMarathonsPage />} />
            <Route path="maha-yagnas" element={<AdminMahaYagnasPage />} />
            <Route path="levels" element={<AdminLevelsPage />} />
            <Route path="videos" element={<AdminVideosPage />} />
            <Route path="video-analytics" element={<AdminVideoAnalyticsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="product-usage" element={<AdminProductUsagePage />} />
            <Route path="app-config" element={<AdminAppConfigPage />} />
            <Route path="satsang" element={<AdminSatsangPage />} />
          </Route>
        </Route>
        <Route path="/priest-login" element={<PriestLoginPage />} />
        <Route path="/priest" element={<PriestPage />} />
        <Route path="/marathons" element={<MarathonsPage />} />
        <Route path="/maha-yagnas" element={<MahaYagnasPage />} />
        <Route path="/plans" element={<PlansDakshinaPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about-apavarga" element={<ApavargaPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-cancellation" element={<RefundCancellationPage />} />
        <Route path="/shipping-delivery" element={<ShippingDeliveryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/learn" element={<LearnLayout />}>
          <Route index element={<Navigate to="en/japa-108-times" replace />} />
          <Route path=":lang/:slug" element={<LearnPage />} />
        </Route>
      </Routes>
      </Suspense>
      <RouterChrome />
      </DeitySharePickerProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
