import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MenuPage } from './pages/MenuPage'
import { GamePage } from './pages/GamePage'
import { LevelsPage } from './pages/LevelsPage'
import { JapaPage } from './pages/JapaPage'
import { SignInPage } from './pages/SignInPage'
import { AdminPage } from './pages/AdminPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminPricingPage } from './pages/admin/AdminPricingPage'
import { AdminTemplesPage } from './pages/admin/AdminTemplesPage'
import { AdminMarathonsPage } from './pages/admin/AdminMarathonsPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminLevelsPage } from './pages/admin/AdminLevelsPage'
import { PriestPage } from './pages/PriestPage'
import { MarathonsPage } from './pages/MarathonsPage'
import { SettingsPage } from './pages/SettingsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </StrictMode>,
)
