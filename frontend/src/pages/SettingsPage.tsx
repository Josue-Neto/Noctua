import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { SettingToggle } from '../components/SettingToggle'
import { usePlatform } from '../context/PlatformContext'

export function SettingsPage() {
  const { preferences, setDarkMode, updatePreferences } = usePlatform()
  const [accountMessage, setAccountMessage] = useState('')
  const navigate = useNavigate()

  function update(key: keyof typeof preferences, checked: boolean) {
    if (key === 'darkMode') {
      setDarkMode(checked)
      return
    }
    updatePreferences({ ...preferences, [key]: checked })
  }

  return (
    <section className="settings-layout">
      <div className="app-panel settings-panel">
        <span className="eyebrow">APARÊNCIA E ACESSIBILIDADE</span>
        <h2>Deixe o Noctua confortável para você</h2>
        <SettingToggle label="Modo escuro" description="Uma paleta noturna em tons de azul e violeta." checked={preferences.darkMode} onChange={(value) => update('darkMode', value)} />
        <SettingToggle label="Alto contraste" description="Aumenta a distinção entre textos e superfícies." checked={preferences.highContrast} onChange={(value) => update('highContrast', value)} />
        <SettingToggle label="Fonte OpenDyslexic" description="Ativa uma alternativa tipográfica para leitura." checked={preferences.dyslexiaFont} onChange={(value) => update('dyslexiaFont', value)} />
      </div>
      <div className="app-panel settings-panel">
        <span className="eyebrow">LEMBRETES</span>
        <h2>Escolha como acompanhar os prazos</h2>
        <SettingToggle label="Avisos na plataforma" description="Receba comunicados e lembretes importantes." checked={preferences.notifications} onChange={(value) => update('notifications', value)} />
        <SettingToggle label="Lembretes por e-mail" description="Receba lembretes antes dos prazos." checked={preferences.emailReminders} onChange={(value) => update('emailReminders', value)} />
      </div>
      <div className="app-panel account-panel">
        <span className="eyebrow">SUA CONTA</span>
        <h2>Perfil e dados pessoais</h2>
        <p>Atualize as informações que aparecem na sua agenda.</p>
        <Link className="app-link-button" to="/perfil" state={{ editProfile: true }}>Personalizar meu perfil <span aria-hidden="true">→</span></Link>
      </div>
      <div className="app-panel account-panel account-actions">
        <span className="eyebrow">ACESSO E PRIVACIDADE</span>
        <h2>Gerencie sua conta</h2>
        <p>Encerre sua sessão ou solicite a exclusão da conta.</p>
        {accountMessage && <p className="account-feedback" role="status">{accountMessage}</p>}
        <div className="account-action-buttons">
          <button className="app-button app-button-secondary" type="button" onClick={() => navigate('/login')}><Icon name="logout" /> Sair da conta</button>
          <button className="account-delete-button" type="button" onClick={() => {
            if (window.confirm('A exclusão permanente será feita quando o serviço de contas estiver conectado. Deseja continuar?')) {
              setAccountMessage('A exclusão de conta ainda não está conectada. Nenhum dado foi removido.')
            }
          }}><Icon name="trash" /> Excluir conta</button>
        </div>
      </div>
    </section>
  )
}
