import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePlatform } from '../context/PlatformContext'
import { api } from '../lib/api'
import type { UserRole } from '../types/platform'

type InvitationPreview = {
  email: string
  role: UserRole
  classes: Array<{ id: string; name: string }>
  subjects: Array<{ classId: string; className: string; subjectName: string }>
}

const roleLabels: Record<UserRole, string> = {
  student: 'Estudante',
  teacher: 'Professor(a)',
  coordinator: 'Coordenação',
}

export function InvitationPage() {
  const { preferences } = usePlatform()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('O link do convite está incompleto.')
      setLoading(false)
      return
    }
    api<InvitationPreview>(`/auth/invitations/${encodeURIComponent(token)}`)
      .then(setInvitation)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false))
  }, [token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api('/auth/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token, full_name: fullName, password }),
      })
      setAccepted(true)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível aceitar o convite.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={`auth-page${preferences.darkMode ? ' dark-mode' : ''}`}>
      <div className="auth-aside">
        <Link className="auth-brand" to="/">
          <img src="/noctua-logo.png" alt="" />
          <span>Noctua</span>
        </Link>
        <div className="auth-aside-copy">
          <span className="eyebrow">
            <span className="eyebrow-line" /> BEM-VINDO AO NOCTUA
          </span>
          <h1>
            Sua rotina
            <br />
            escolar em
            <br />
            <em>um só lugar.</em>
          </h1>
          <p>
            Atividades, provas e avisos organizados para acompanhar seu dia a
            dia.
          </p>
        </div>
      </div>
      <section className="auth-panel">
        <Link className="auth-back" to="/">
          <Icon name="back" /> Voltar ao início
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">
            <span className="eyebrow-line" /> CONVITE DA INSTITUIÇÃO
          </span>
          <h2>
            {accepted
              ? 'Conta criada com sucesso.'
              : loading
                ? 'Conferindo seu convite…'
                : !invitation
                  ? 'Convite indisponível.'
                  : 'Finalize seu acesso.'}
          </h2>
          {accepted ? (
            <>
              <p className="auth-intro">
                Sua conta foi criada para {invitation?.email}. Entre para
                acessar sua agenda.
              </p>
              <Link
                className="app-button auth-submit auth-link-submit"
                to="/login"
              >
                Ir para o acesso <Icon name="arrow" />
              </Link>
            </>
          ) : invitation ? (
            <>
              <p className="auth-intro">
                Convite para {roleLabels[invitation.role]} · {invitation.email}
              </p>
              {invitation.classes.length > 0 && (
                <p className="invite-scope">
                  Turmas:{' '}
                  {invitation.classes.map((item) => item.name).join(', ')}
                </p>
              )}
              {invitation.subjects.length > 0 && (
                <p className="invite-scope">
                  Disciplinas:{' '}
                  {invitation.subjects
                    .map((item) => `${item.subjectName} (${item.className})`)
                    .join(', ')}
                </p>
              )}
              <form className="auth-form" onSubmit={submit}>
                <label>
                  Nome completo
                  <input
                    required
                    minLength={2}
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </label>
                <label>
                  Crie uma senha
                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                  />
                </label>
                <button
                  className="app-button auth-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Criando conta…' : 'Aceitar convite'}{' '}
                  <Icon name="arrow" />
                </button>
              </form>
            </>
          ) : !loading ? (
            <p className="auth-intro" role="alert">
              {error || 'Este convite não está disponível.'} Solicite um novo
              convite à coordenação.
            </p>
          ) : null}
          {error && invitation && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
