import { useState } from 'react'
import { ActivityForm } from '../components/ActivityForm'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { usePlatform } from '../context/PlatformContext'
import type {
  Activity,
  ActivityStatus,
  ActivityValues,
} from '../types/platform'

export function useActivityEditor() {
  const { saveActivity, cancelActivity } = usePlatform()
  const [editing, setEditing] = useState<Activity | null>(null)
  const [initialDate, setInitialDate] = useState<string | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [cancelling, setCancelling] = useState<Activity | null>(null)

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

  async function save(values: ActivityValues, status: ActivityStatus) {
    await saveActivity(values, status, editing?.id)
    setMessage(
      status === 'draft'
        ? 'Rascunho salvo.'
        : editing
          ? 'Atividade atualizada.'
          : 'Atividade adicionada.',
    )
    setEditing(null)
    setFormOpen(false)
  }

  function cancel(activity: Activity) {
    setCancelling(activity)
  }

  const activityForm = formOpen ? (
    <ActivityForm
      activity={editing}
      initialDate={initialDate}
      onSave={save}
      onClose={() => setFormOpen(false)}
    />
  ) : null
  const form = (
    <>
      {activityForm}
      {cancelling && (
        <ConfirmationDialog
          title="Cancelar atividade?"
          message={`O prazo de “${cancelling.title}” será cancelado para a turma.`}
          onCancel={() => setCancelling(null)}
          onConfirm={async () => {
            await cancelActivity(cancelling.id)
            setCancelling(null)
            setMessage('Atividade cancelada.')
          }}
        />
      )}
    </>
  )

  return {
    openNew,
    openEdit,
    cancel,
    form,
    message,
    clearMessage: () => setMessage(''),
  }
}
