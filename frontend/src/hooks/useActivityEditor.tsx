import { useState } from 'react'
import { ActivityForm } from '../components/ActivityForm'
import { usePlatform } from '../context/PlatformContext'
import type { Activity, ActivityStatus, ActivityValues } from '../types/platform'

export function useActivityEditor() {
  const { saveActivity, cancelActivity } = usePlatform()
  const [editing, setEditing] = useState<Activity | null>(null)
  const [initialDate, setInitialDate] = useState<string | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [message, setMessage] = useState('')

  function openNew(date?: string) {
    setEditing(null)
    setInitialDate(date)
    setFormOpen(true)
  }

  function openEdit(activity: Activity) {
    setEditing(activity)
    setInitialDate(undefined)
    setFormOpen(true)
  }

  function save(values: ActivityValues, status: ActivityStatus) {
    saveActivity(values, status, editing?.id)
    setMessage(status === 'draft' ? 'Rascunho salvo.' : editing ? 'Atividade atualizada.' : 'Atividade adicionada.')
    setEditing(null)
    setFormOpen(false)
  }

  function cancel(activity: Activity) {
    if (!window.confirm(`Cancelar "${activity.title}"?`)) return
    cancelActivity(activity.id)
    setMessage('Atividade cancelada.')
  }

  const form = formOpen
    ? <ActivityForm activity={editing} initialDate={initialDate} onSave={save} onClose={() => setFormOpen(false)} />
    : null

  return {
    openNew,
    openEdit,
    cancel,
    form,
    message,
    clearMessage: () => setMessage(''),
  }
}
