import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { PlatformLayout } from './components/PlatformLayout'
import { PlatformProvider } from './context/PlatformContext'
import { AuthPage } from './pages/AuthPage'
import { CalendarPage } from './pages/CalendarPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { NoticesPage } from './pages/NoticesPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'

function LandingRoute() {
  const navigate = useNavigate()
  return <LandingPage onAccess={() => navigate('/login')} />
}

function App() {
  return (
    <BrowserRouter>
      <PlatformProvider>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/cadastro" element={<AuthPage mode="register" />} />
          <Route path="/recuperar-senha" element={<AuthPage mode="recovery" />} />
          <Route element={<PlatformLayout />}>
            <Route path="/inicio" element={<DashboardPage />} />
            <Route path="/agenda" element={<CalendarPage />} />
            <Route path="/tarefas" element={<TasksPage />} />
            <Route path="/avisos" element={<NoticesPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlatformProvider>
    </BrowserRouter>
  )
}

export default App
