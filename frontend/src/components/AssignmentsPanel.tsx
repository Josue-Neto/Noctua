import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'

type Person = {
  id: string
  name: string
  email: string
  role: string
  class_ids: string[]
  subjects: Array<{ class_id: string; subject_id: string }>
}
type Catalog = {
  class_id: string
  class_name: string
  subject_id: string | null
  subject_name: string | null
  teacher_id: string | null
  reserved: boolean
}
export function AssignmentsPanel({
  catalog,
  onSaved,
}: {
  catalog: Catalog[]
  onSaved: () => Promise<void>
}) {
  const [people, setPeople] = useState<Person[]>([]),
    [personId, setPersonId] = useState(''),
    [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const person = people.find((p) => p.id === personId)
  async function load() {
    setPeople(await api<Person[]>('/staff/users'))
  }
  useEffect(() => {
    void load().catch((cause) => setError(cause.message))
  }, [])
  function choose(id: string) {
    setPersonId(id)
    setMessage('')
    const user = people.find((p) => p.id === id)
    setSelected(
      user?.role === 'student'
        ? user.class_ids
        : (user?.subjects.map((s) => `${s.class_id}|${s.subject_id}`) ?? []),
    )
  }
  const classes = Array.from(
    new Map(catalog.map((c) => [c.class_id, c])).values(),
  )
  const options =
    person?.role === 'student'
      ? classes.map((c) => ({
          id: c.class_id,
          label: c.class_name,
          disabled: false,
        }))
      : catalog
          .filter((c) => c.subject_id)
          .map((c) => ({
            id: `${c.class_id}|${c.subject_id}`,
            label: `${c.class_name} · ${c.subject_name}`,
            disabled:
              (!!c.teacher_id && c.teacher_id !== personId) || c.reserved,
          }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api(`/staff/users/${personId}/assignments`, {
        method: 'PUT',
        body: JSON.stringify({
          class_ids: person?.role === 'student' ? selected : [],
          subjects:
            person?.role === 'teacher'
              ? selected.map((s) => {
                  const [class_id, subject_id] = s.split('|')
                  return { class_id, subject_id }
                })
              : [],
        }),
      })
      await load()
      await onSaved()
      setMessage('Vínculos atualizados.')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Falha ao salvar vínculos.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="app-panel user-management-panel">
      <span className="eyebrow">USUÁRIOS CADASTRADOS</span>
      <h3>Gerenciar vínculos</h3>
      <form className="user-invite-form" onSubmit={submit}>
        <label>
          Usuário
          <select
            value={personId}
            onChange={(event) => choose(event.target.value)}
          >
            <option value="">Selecione</option>
            {people.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} · {p.email} ·{' '}
                {p.role === 'student'
                  ? 'Estudante'
                  : p.role === 'teacher'
                    ? 'Professor(a)'
                    : 'Coordenação'}
              </option>
            ))}
          </select>
        </label>
        {person && person.role !== 'coordinator' && (
          <>
            <fieldset>
              <legend>
                {person.role === 'student' ? 'Turmas' : 'Turmas e disciplinas'}
              </legend>
              {options.map((o) => (
                <label className="selection-option" key={o.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    disabled={o.disabled || busy}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(o.id)
                          ? current.filter((s) => s !== o.id)
                          : [...current, o.id],
                      )
                    }
                  />
                  {o.label}
                  {o.disabled ? ' (indisponível)' : ''}
                </label>
              ))}
            </fieldset>
            <button className="app-button" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar vínculos'}
            </button>
          </>
        )}
        {person?.role === 'coordinator' && (
          <p>A coordenação tem acesso a todas as turmas.</p>
        )}
      </form>
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
    </section>
  )
}
