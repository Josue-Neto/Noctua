import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom'
import type { ReactNode } from 'react'
import { PlatformLayout } from './components/PlatformLayout'
import { PlatformProvider } from './context/PlatformContext'
import { AuthPage } from './pages/AuthPage'
import { InvitationPage } from './pages/InvitationPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { CalendarPage } from './pages/CalendarPage'
import { ActivityDetailPage } from './pages/ActivityDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { NoticesPage } from './pages/NoticesPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'
import { usePlatform } from './context/PlatformContext'

function LandingRoute() {
  const navigate = useNavigate()
  return <LandingPage onAccess={() => navigate('/login')} />
}

function ProtectedLayout() {
  const { authStatus, error, refreshAuth } = usePlatform()
  const location = useLocation()
  if (authStatus === 'error')
    return (
      <div className="auth-loading">
        <div role="alert">
          {error}
          <button
            type="button"
            onClick={() => {
              void refreshAuth()
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  if (authStatus === 'loading')
    return (
      <div className="auth-loading" role="status">
        Carregando sua sessão…
      </div>
    )
  if (authStatus === 'anonymous')
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  return <PlatformLayout />
}

function SignedOutOnly({ children }: { children: ReactNode }) {
  const { authStatus } = usePlatform()
  const [searchParams] = useSearchParams()
  const requestedPath = searchParams.get('next')
  const next =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
      ? requestedPath
      : '/inicio'
  if (authStatus === 'loading')
    return (
      <div className="auth-loading" role="status">
        Carregando…
      </div>
    )
  if (authStatus === 'authenticated') return <Navigate to={next} replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <PlatformProvider>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route
            path="/login"
            element={
              <SignedOutOnly>
                <AuthPage mode="login" />
              </SignedOutOnly>
            }
          />
          <Route
            path="/cadastro"
            element={
              <SignedOutOnly>
                <AuthPage mode="register" />
              </SignedOutOnly>
            }
          />
          <Route
            path="/recuperar-senha"
            element={
              <SignedOutOnly>
                <AuthPage mode="recovery" />
              </SignedOutOnly>
            }
          />
          <Route
            path="/redefinir-senha"
            element={
              <SignedOutOnly>
                <PasswordResetPage />
              </SignedOutOnly>
            }
          />
          <Route
            path="/convite/aceitar"
            element={
              <SignedOutOnly>
                <InvitationPage />
              </SignedOutOnly>
            }
          />
          <Route element={<ProtectedLayout />}>
            <Route path="/inicio" element={<DashboardPage />} />
            <Route path="/agenda" element={<CalendarPage />} />
            <Route path="/atividades/:id" element={<ActivityDetailPage />} />
            <Route path="/tarefas" element={<TasksPage />} />
            <Route path="/avisos" element={<NoticesPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/gestao/usuarios" element={<UserManagementPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlatformProvider>
    </BrowserRouter>
  )
}

export default App
