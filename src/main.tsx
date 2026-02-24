import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AdminPage } from './pages/AdminPage'
import { PriestPage } from './pages/PriestPage'
import { PriestLoginPage } from './pages/PriestLoginPage'
import { MarathonsPage } from './pages/MarathonsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/priest" element={<PriestPage />} />
        <Route path="/priest/login" element={<PriestLoginPage />} />
        <Route path="/marathons" element={<MarathonsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
