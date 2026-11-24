import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'
import { api } from '../lib/api'

type AuthMode = 'login' | 'register' | 'recovery'

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { preferences, login } = usePlatform()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedPath = searchParams.get('next')
  const next = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/inicio'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate(next, { replace: true })
      } else if (mode === 'recovery') {
        const result = await api<{ message: string }>('/auth/password-reset/request', {
          method: 'POST', body: JSON.stringify({ email }),
        })
        setMessage(result.message)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a solicitação.')
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'login' ? 'Que bom ter você por aqui.' : mode === 'register' ? 'Acesso pela sua instituição.' : 'Vamos encontrar sua conta.'

  return (
    <main className={`auth-page${preferences.darkMode ? ' dark-mode' : ''}`}>
      <div className="auth-aside">
        <Link className="auth-brand" to="/"><img src="/noctua-logo.png" alt="" /><span>Noctua</span></Link>
        <div className="auth-aside-copy">
          <span className="eyebrow"><span className="eyebrow-line" /> UMA ROTINA MAIS LEVE</span>
          <h1>O próximo passo<br />fica mais claro<br />quando tudo<br /><em>está no lugar.</em></h1>
          <p>Atividades, provas e avisos da sua turma — reunidos para você seguir no seu ritmo.</p>
        </div>
        <div className="auth-aside-bottom">Agenda escolar Noctua <span>·</span> Para todas as redes de ensino</div>
      </div>
      <section className="auth-panel">
        <Link className="auth-back" to="/"><Icon name="back" /> Voltar ao início</Link>
        <div className="auth-form-wrap">
          <Link className="auth-mobile-brand" to="/"><img src="/noctua-logo.png" alt="" /><span>Noctua</span></Link>
          <span className="eyebrow"><span className="eyebrow-line" /> AGENDA ESCOLAR</span>
          <h2>{title}</h2>
          {mode === 'register' ? (
            <>
              <p className="auth-intro">As contas são criadas pela coordenação da sua instituição. Peça um convite para acessar sua agenda.</p>
              <div className="auth-switch"><Link to="/login">Já recebeu um convite? Entre na sua conta</Link></div>
            </>
          ) : (
            <>
              <p className="auth-intro">{mode === 'login' ? 'Entre para acompanhar sua agenda escolar.' : 'Informe seu e-mail. Se houver uma conta, enviaremos um link para redefinir a senha.'}</p>
              <form className="auth-form" onSubmit={submit}>
                <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@escola.edu.br" /></label>
                {mode === 'login' && <label>Senha<input required type="password" autoComplete="current-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label>}
                {mode === 'login' && <Link className="auth-inline-link" to="/recuperar-senha">Esqueceu sua senha?</Link>}
                <button className="app-button auth-submit" type="submit" disabled={loading}>{loading ? 'Aguarde…' : mode === 'login' ? 'Continuar' : 'Enviar instruções'} <Icon name="arrow" /></button>
              </form>
              {message && <p className="auth-message" role="status">{message}</p>}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="auth-switch">
                {mode === 'login' ? <>Primeiro acesso? <Link to="/cadastro">Saiba como criar sua conta</Link></> : <>Lembrou sua senha? <Link to="/login">Voltar ao acesso</Link></>}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
