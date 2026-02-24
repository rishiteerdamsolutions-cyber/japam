import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AdminPage } from './pages/AdminPage'
import { PriestPage } from './pages/PriestPage'
import { MarathonsPage } from './pages/MarathonsPage'
import { SettingsPage } from './pages/SettingsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/priest" element={<PriestPage />} />
        <Route path="/marathons" element={<MarathonsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
