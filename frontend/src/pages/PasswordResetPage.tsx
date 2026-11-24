import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'
import { api } from '../lib/api'

export function PasswordResetPage() {
  const { preferences } = usePlatform()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await api('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) })
      setMessage('Senha atualizada. Entre com a nova senha.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.')
    } finally { setLoading(false) }
  }

  return <main className={`auth-page${preferences.darkMode ? ' dark-mode' : ''}`}><div className="auth-aside"><Link className="auth-brand" to="/"><img src="/noctua-logo.png" alt="" /><span>Noctua</span></Link><div className="auth-aside-copy"><span className="eyebrow"><span className="eyebrow-line" /> ACESSO SEGURO</span><h1>Vamos deixar<br />tudo em ordem<br /><em>de novo.</em></h1></div></div><section className="auth-panel"><Link className="auth-back" to="/login"><Icon name="back" /> Voltar ao acesso</Link><div className="auth-form-wrap"><span className="eyebrow"><span className="eyebrow-line" /> NOVA SENHA</span><h2>Redefina sua senha.</h2><p className="auth-intro">Escolha uma senha com pelo menos oito caracteres.</p><form className="auth-form" onSubmit={submit}><label>Nova senha<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="app-button auth-submit" disabled={loading || !token}>{loading ? 'Salvando…' : 'Salvar nova senha'} <Icon name="arrow" /></button></form>{message && <p className="auth-message" role="status">{message} <Link to="/login">Entrar</Link></p>}{error && <p className="auth-error" role="alert">{error}</p>}{!token && <p className="auth-error" role="alert">O link de recuperação está incompleto.</p>}</div></section></main>
}
