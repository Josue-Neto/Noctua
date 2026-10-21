import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'

type AuthMode = 'login' | 'register' | 'recovery'

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { preferences } = usePlatform()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/inicio'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'login') {
      setMessage('O acesso à conta estará disponível em breve.')
    } else if (mode === 'register') {
      setMessage(`O cadastro${name ? ` de ${name}` : ''} será disponibilizado pela instituição.`)
    } else {
      setMessage(`A recuperação de acesso para ${email} estará disponível em breve.`)
    }
  }

  const title = mode === 'login' ? 'Que bom ter você por aqui.' : mode === 'register' ? 'Comece com tranquilidade.' : 'Vamos encontrar sua conta.'

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
          <p className="auth-intro">{mode === 'login' ? 'Entre para acompanhar sua agenda escolar.' : mode === 'register' ? 'A criação de contas será disponibilizada pela sua instituição.' : 'Informe seu e-mail para recuperar o acesso.'}</p>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label>Nome completo<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" /></label>}
            <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@escola.edu.br" /></label>
            {mode !== 'recovery' && <label>Senha<input required type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} placeholder="Mínimo de 8 caracteres" /></label>}
            {mode === 'login' && <Link className="auth-inline-link" to="/recuperar-senha">Esqueceu sua senha?</Link>}
            <button className="app-button auth-submit" type="submit">{mode === 'login' ? 'Continuar' : mode === 'register' ? 'Criar conta' : 'Enviar instruções'} <Icon name="arrow" /></button>
          </form>
          {message && <p className="auth-message" role="status">{message}</p>}
          {mode === 'login' && (
            <div className="demo-access">
              <p>Acesse sua agenda, prazos e atividades:</p>
              <div className="demo-role-buttons"><button type="button" onClick={() => navigate(next)}>Explorar a plataforma <Icon name="arrow" /></button></div>
            </div>
          )}
          <div className="auth-switch">
            {mode === 'login'
              ? <>Primeiro acesso? <Link to="/cadastro">Saiba como criar sua conta</Link></>
              : <>Já tem uma conta? <Link to="/login">Voltar ao acesso</Link></>}
          </div>
        </div>
      </section>
    </main>
  )
}
