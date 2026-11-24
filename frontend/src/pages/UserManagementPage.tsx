import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { usePlatform } from '../context/PlatformContext'
import { api } from '../lib/api'
import type { UserRole } from '../types/platform'
import { AssignmentsPanel } from '../components/AssignmentsPanel'
import { ConfirmationDialog } from '../components/ConfirmationDialog'

type CatalogRow = {
  class_id: string
  class_name: string
  school_year: number
  subject_id: string | null
  subject_name: string | null
  teacher_id: string | null
  reserved: boolean
}

type Invitation = {
  id: string
  email: string
  role: UserRole
  expires_at: string
  classes: Array<{ id: string; name: string; schoolYear: number }>
  subjects: Array<{
    classId: string
    className: string
    subjectId: string
    subjectName: string
  }>
}

const roleLabels: Record<UserRole, string> = {
  student: 'Estudante',
  teacher: 'Professor(a)',
  coordinator: 'Coordenação',
}

export function UserManagementPage() {
  const { authUser } = usePlatform()
  const [catalog, setCatalog] = useState<CatalogRow[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [classIds, setClassIds] = useState<string[]>([])
  const [subjectSlots, setSubjectSlots] = useState<string[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [newClassYear, setNewClassYear] = useState('1')
  const [subjectClassId, setSubjectClassId] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revoking, setRevoking] = useState<Invitation | null>(null)

  const classes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; year: number }>()
    catalog.forEach((row) =>
      map.set(row.class_id, {
        id: row.class_id,
        name: row.class_name,
        year: Number(row.school_year),
      }),
    )
    return [...map.values()]
  }, [catalog])
  const availableSubjects = catalog.filter(
    (row) => row.subject_id && !row.teacher_id && !row.reserved,
  )

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [nextCatalog, nextInvitations] = await Promise.all([
        api<CatalogRow[]>('/staff/catalog'),
        api<Invitation[]>('/staff/invitations'),
      ])
      setCatalog(nextCatalog)
      setInvitations(nextInvitations)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar a gestão de contas.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authUser?.role === 'coordinator') void load()
  }, [authUser?.role])

  if (authUser?.role !== 'coordinator') return <Navigate to="/inicio" replace />

  function toggleItem(
    items: string[],
    value: string,
    setItems: (next: string[]) => void,
  ) {
    setItems(
      items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value],
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const subjects =
        role === 'teacher'
          ? subjectSlots.map((slot) => {
              const [class_id, subject_id] = slot.split('|')
              return { class_id, subject_id }
            })
          : undefined
      await api('/staff/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email,
          role,
          class_ids: role === 'student' ? classIds : undefined,
          subjects,
        }),
      })
      setEmail('')
      setClassIds([])
      setSubjectSlots([])
      setMessage('Convite enviado. Ele ficará válido por sete dias.')
      await load()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível enviar o convite.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function revoke(invitation: Invitation) {
    setError('')
    setMessage('')
    try {
      await api(`/staff/invitations/${invitation.id}/revoke`, {
        method: 'POST',
      })
      setMessage('Convite revogado.')
      setRevoking(null)
      await load()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível revogar o convite.',
      )
    }
  }

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const created = await api<{ id: string }>('/staff/catalog/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: newClassName,
          school_year: Number(newClassYear),
        }),
      })
      setNewClassName('')
      setSubjectClassId(created.id)
      setMessage('Turma cadastrada.')
      await load()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível cadastrar a turma.',
      )
    }
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await api(`/staff/catalog/classes/${subjectClassId}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subject_name: newSubjectName }),
      })
      setNewSubjectName('')
      setMessage('Disciplina vinculada à turma.')
      await load()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível vincular a disciplina.',
      )
    }
  }

  return (
    <section className="user-management">
      {revoking && (
        <ConfirmationDialog
          title="Revogar convite?"
          message={`O convite para ${revoking.email} deixará de funcionar.`}
          onCancel={() => setRevoking(null)}
          onConfirm={() => revoke(revoking)}
        />
      )}
      <div className="app-panel user-management-heading">
        <span className="eyebrow">ADMINISTRAÇÃO DA INSTITUIÇÃO</span>
        <h2>Contas e convites</h2>
        <p>
          Convide usuários e vincule cada pessoa às turmas ou disciplinas sob
          sua responsabilidade.
        </p>
      </div>
      <AssignmentsPanel catalog={catalog} onSaved={load} />
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="auth-message" role="status">
          {message}
        </p>
      )}
      <div className="app-panel user-management-panel">
        <span className="eyebrow">NOVO CONVITE</span>
        <h3>Adicionar uma pessoa</h3>
        <form className="user-invite-form" onSubmit={submit}>
          <label>
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@escola.edu.br"
            />
          </label>
          <label>
            Perfil
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as UserRole)
                setClassIds([])
                setSubjectSlots([])
              }}
            >
              <option value="student">Estudante</option>
              <option value="teacher">Professor(a)</option>
              <option value="coordinator">Coordenação</option>
            </select>
          </label>
          {role === 'student' && (
            <fieldset>
              <legend>Turmas do estudante</legend>
              {classes.length ? (
                classes.map((item) => (
                  <label key={item.id} className="selection-option">
                    <input
                      type="checkbox"
                      checked={classIds.includes(item.id)}
                      onChange={() =>
                        toggleItem(classIds, item.id, setClassIds)
                      }
                    />
                    {item.name} · {item.year}º ano
                  </label>
                ))
              ) : (
                <p>Nenhuma turma cadastrada.</p>
              )}
            </fieldset>
          )}
          {role === 'teacher' && (
            <fieldset>
              <legend>Disciplinas atribuídas</legend>
              {availableSubjects.length ? (
                availableSubjects.map((item) => {
                  const slot = `${item.class_id}|${item.subject_id}`
                  return (
                    <label key={slot} className="selection-option">
                      <input
                        type="checkbox"
                        checked={subjectSlots.includes(slot)}
                        onChange={() =>
                          toggleItem(subjectSlots, slot, setSubjectSlots)
                        }
                      />
                      {item.subject_name} · {item.class_name}
                    </label>
                  )
                })
              ) : (
                <p>Não há disciplinas sem professor atribuído.</p>
              )}
            </fieldset>
          )}
          {role === 'coordinator' && (
            <p className="invite-scope">
              A coordenação terá acesso a todas as turmas e poderá administrar
              convites.
            </p>
          )}
          <button
            className="app-button"
            disabled={
              submitting ||
              (role === 'student' && !classIds.length) ||
              (role === 'teacher' && !subjectSlots.length)
            }
          >
            {submitting ? 'Enviando…' : 'Enviar convite'}
          </button>
        </form>
      </div>
      <div className="app-panel user-management-panel">
        <span className="eyebrow">CADASTRO ACADÊMICO</span>
        <h3>Turmas e disciplinas</h3>
        <p>
          Prepare o catálogo da instituição para associar estudantes e
          professores aos convites.
        </p>
        <div className="catalog-setup-grid">
          <form className="user-invite-form" onSubmit={createClass}>
            <strong>Cadastrar turma</strong>
            <label>
              Nome da turma
              <input
                required
                value={newClassName}
                onChange={(event) => setNewClassName(event.target.value)}
                placeholder="Ex.: 2º Informática A"
              />
            </label>
            <label>
              Ano escolar
              <select
                value={newClassYear}
                onChange={(event) => setNewClassYear(event.target.value)}
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}º ano
                  </option>
                ))}
              </select>
            </label>
            <button className="app-button">Cadastrar turma</button>
          </form>
          <form className="user-invite-form" onSubmit={addSubject}>
            <strong>Vincular disciplina</strong>
            <label>
              Turma
              <select
                required
                value={subjectClassId}
                onChange={(event) => setSubjectClassId(event.target.value)}
              >
                <option value="">Selecione uma turma</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.year}º ano
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nome da disciplina
              <input
                required
                value={newSubjectName}
                onChange={(event) => setNewSubjectName(event.target.value)}
                placeholder="Ex.: Matemática"
              />
            </label>
            <button className="app-button" disabled={!subjectClassId}>
              Vincular disciplina
            </button>
          </form>
        </div>
        {classes.length > 0 && (
          <div className="catalog-summary">
            {classes.map((item) => (
              <div key={item.id}>
                <strong>{item.name}</strong>
                <span>
                  {catalog
                    .filter(
                      (row) => row.class_id === item.id && row.subject_name,
                    )
                    .map((row) => row.subject_name)
                    .join(', ') || 'Sem disciplinas cadastradas'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="app-panel user-management-panel">
        <div className="app-panel-heading">
          <div>
            <span className="eyebrow">PENDENTES</span>
            <h3>Convites aguardando resposta</h3>
          </div>
          <button
            className="app-button app-button-secondary"
            type="button"
            onClick={() => void load()}
            disabled={loading}
          >
            Atualizar
          </button>
        </div>
        {loading ? (
          <p>Carregando convites…</p>
        ) : invitations.length ? (
          <div className="invitation-list">
            {invitations.map((invite) => (
              <article className="invitation-row" key={invite.id}>
                <div>
                  <strong>{invite.email}</strong>
                  <span>
                    {roleLabels[invite.role]} · expira em{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                    }).format(new Date(invite.expires_at))}
                  </span>
                  <small>
                    {invite.classes?.map((item) => item.name).join(', ') ||
                      invite.subjects
                        ?.map(
                          (item) => `${item.subjectName} (${item.className})`,
                        )
                        .join(', ') ||
                      (invite.role === 'coordinator' ? 'Todas as turmas' : '')}
                  </small>
                </div>
                <button
                  className="account-delete-button"
                  type="button"
                  onClick={() => setRevoking(invite)}
                >
                  Revogar
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Não há convites pendentes.</p>
        )}
      </div>
    </section>
  )
}
