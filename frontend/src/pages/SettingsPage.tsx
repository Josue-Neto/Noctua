import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { SettingToggle } from '../components/SettingToggle'
import { usePlatform } from '../context/PlatformContext'
import { currentPushSubscription, disablePush, enablePush, pushSupported } from '../lib/push'

export function SettingsPage() {
  const { preferences, setDarkMode, updatePreferences, logout, authUser, pending } = usePlatform()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pushActive,setPushActive]=useState(false)
  const [pushBusy,setPushBusy]=useState(false)
  const [pushMessage,setPushMessage]=useState('')
  useEffect(()=>{void currentPushSubscription().then(subscription=>setPushActive(!!subscription)).catch(()=>setPushActive(false))},[])
  async function changePush() {
    setPushBusy(true);setError('');setPushMessage('')
    try {
      if(pushActive) {await disablePush();setPushActive(false);setPushMessage('Notificações desativadas neste dispositivo.')}
      else {await enablePush();setPushActive(true);await updatePreferences({pushEnabled:true});setPushMessage('Notificações ativadas neste dispositivo.')}
    } catch(cause) {setError(cause instanceof Error?cause.message:'Não foi possível alterar as notificações.')}
    finally {setPushBusy(false)}
  }

  function update(key: keyof typeof preferences, checked: boolean) {
    setError('')
    void (
      key === 'darkMode'
        ? setDarkMode(checked)
        : updatePreferences({ [key]: checked })
    ).catch((cause) =>
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar.'),
    )
  }
  return (
    <section className="settings-layout">
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <div className="app-panel settings-panel">
        <span className="eyebrow">APARÊNCIA E ACESSIBILIDADE</span>
        <h2>Deixe o Noctua confortável para você</h2>
        <label className="theme-select">
          Tema
          <select
            value={preferences.theme}
            disabled={pending || pushBusy}
            onChange={(event) => {
              void updatePreferences({
                theme: event.target.value as 'system' | 'light' | 'dark',
              }).catch((cause) => setError(cause.message))
            }}
          >
            <option value="system">Seguir o sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </label>
        <SettingToggle
          label="Alto contraste"
          description="Aumenta a distinção entre textos e superfícies."
          checked={preferences.highContrast}
          disabled={pending || pushBusy}
          onChange={(value) => update('highContrast', value)}
        />
        <SettingToggle
          label="Fonte OpenDyslexic"
          description="Ativa uma alternativa tipográfica para leitura."
          checked={preferences.dyslexiaFont}
          disabled={pending || pushBusy}
          onChange={(value) => update('dyslexiaFont', value)}
        />
      </div>
      <div className="app-panel settings-panel">
        <span className="eyebrow">LEMBRETES</span>
        <h2>Escolha como acompanhar os prazos</h2>
        {authUser?.role==='student' && <div className="push-controls"><p>Receba lembretes neste dispositivo quando o navegador permitir. A entrega depende do serviço de notificações.</p><button className="app-button app-button-secondary" type="button" disabled={pending || pushBusy || !pushSupported()} onClick={()=>{void changePush()}}>{pushBusy?'Aguarde…':pushActive?'Desativar neste dispositivo':'Ativar notificações neste dispositivo'}</button>{!pushSupported()&&<p>Notificações indisponíveis neste navegador ou endereço.</p>}{pushMessage&&<p role="status">{pushMessage}</p>}</div>}
        <SettingToggle
          label="Avisos na plataforma"
          description="Receba comunicados e lembretes importantes."
          checked={preferences.notifications}
          disabled={pending || pushBusy}
          onChange={(value) => update('notifications', value)}
        />
        <SettingToggle
          label="Lembretes por e-mail"
          description="Preferência salva. O envio de lembretes ainda está indisponível."
          checked={preferences.emailReminders}
          disabled={pending || pushBusy}
          onChange={(value) => update('emailReminders', value)}
        />
        <SettingToggle
          label="Lembrar 24 horas antes"
          description="Escolha a antecedência dos lembretes."
          checked={preferences.remind24Hours}
          disabled={pending || pushBusy}
          onChange={(value) => update('remind24Hours', value)}
        />
        <SettingToggle
          label="Lembrar 48 horas antes"
          description="Escolha a antecedência dos lembretes."
          checked={preferences.remind48Hours}
          disabled={pending || pushBusy}
          onChange={(value) => update('remind48Hours', value)}
        />
      </div>
      <div className="app-panel account-panel">
        <span className="eyebrow">SUA CONTA</span>
        <h2>Perfil e dados pessoais</h2>
        <p>Atualize as informações que aparecem na sua agenda.</p>
        <Link
          className="app-link-button"
          to="/perfil"
          state={{ editProfile: true }}
        >
          Personalizar meu perfil <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="app-panel account-panel account-actions">
        <span className="eyebrow">ACESSO E PRIVACIDADE</span>
        <h2>Gerencie sua conta</h2>
        <p>Encerre sua sessão com segurança.</p>
        <div className="account-action-buttons">
          <button
            className="app-button app-button-secondary"
            type="button"
            onClick={() => {
              void logout()
                .then(() => navigate('/login', { replace: true }))
                .catch((cause) => setError(cause.message))
            }}
          >
            <Icon name="logout" /> Sair da conta
          </button>
        </div>
      </div>
    </section>
  )
}
