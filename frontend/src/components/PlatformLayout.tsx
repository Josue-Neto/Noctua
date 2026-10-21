import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { usePlatform } from '../context/PlatformContext'
import { Icon } from './Icon'

const navigation = [
  { path: '/inicio', label: 'Visão geral', icon: 'home' },
  { path: '/agenda', label: 'Agenda', icon: 'calendar' },
  { path: '/tarefas', label: 'Minhas tarefas', icon: 'tasks' },
]

const settingsNavigation = [
  { path: '/perfil', label: 'Meu perfil', icon: 'user' },
  { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
]

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export function PlatformLayout() {
  const { profile, preferences } = usePlatform()
  const location = useLocation()
  const navigate = useNavigate()
  const currentLabel = [...navigation, ...settingsNavigation, { path: '/avisos', label: 'Avisos', icon: 'bell' }].find((item) => item.path === location.pathname)?.label ?? 'Visão geral'

  return (
    <div className={`platform${preferences.highContrast ? ' high-contrast' : ''}${preferences.darkMode ? ' dark-mode' : ''}${preferences.dyslexiaFont ? ' dyslexia-font' : ''}`}>
      <aside className="platform-sidebar">
        <NavLink className="platform-brand" to="/inicio"><img src="/noctua-logo.png" alt="" /><span>Noctua</span></NavLink>
        <div className="workspace-label">AGENDA DA TURMA</div>
        <nav className="platform-nav" aria-label="Navegação da plataforma">
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'selected' : ''}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="workspace-label workspace-label-settings">SUA CONTA</div>
        <nav className="platform-nav" aria-label="Perfil e preferências">
          {settingsNavigation.map((item) => <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'selected' : ''}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}
        </nav>
        <NavLink className="profile-block" to="/perfil">
          <span className="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : initials(profile.name)}</span>
          <span><strong>{profile.name}</strong><small>{profile.className} · {profile.course}</small></span>
        </NavLink>
      </aside>
      <main className="platform-main">
        <header className="platform-topbar">
          <div><span className="breadcrumb">Noctua <span>/</span> {currentLabel}</span><h1>{currentLabel}</h1></div>
          <div className="topbar-tools">
            <NavLink className="profile-shortcut" to="/perfil" aria-label="Abrir meu perfil"><span className="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : <Icon name="user" />}</span><span className="profile-shortcut-label">Meu perfil</span></NavLink>
            <button className="topbar-notice" type="button" aria-label="Abrir avisos" onClick={() => navigate('/avisos')}><Icon name="bell" /><i /></button>
          </div>
        </header>
        <div className="platform-content"><Outlet /></div>
        <nav className="mobile-platform-nav" aria-label="Navegação móvel">
          {[...navigation, settingsNavigation[1]].map((item) => <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'selected' : ''}><Icon name={item.icon} /><span>{item.label === 'Visão geral' ? 'Início' : item.label === 'Minhas tarefas' ? 'Tarefas' : item.label === 'Configurações' ? 'Ajustes' : item.label}</span></NavLink>)}
        </nav>
      </main>
    </div>
  )
}
