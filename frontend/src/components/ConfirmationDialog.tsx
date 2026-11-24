import { useEffect, useRef, useState } from 'react'
export function ConfirmationDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const panel = useRef<HTMLElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    panel.current?.querySelector('button')?.focus()
    return () => previous?.focus()
  }, [])
  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao confirmar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="activity-modal confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        ref={panel}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) onCancel()
          if (e.key === 'Tab') {
            const buttons = Array.from(
              panel.current?.querySelectorAll<HTMLButtonElement>(
                'button:not(:disabled)',
              ) ?? [],
            )
            const first = buttons[0],
              last = buttons[buttons.length - 1]
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault()
              last?.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <h2 id="confirmation-title">{title}</h2>
        <p id="confirmation-message">{message}</p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="app-button app-button-secondary"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Voltar
          </button>
          <button
            className="app-button"
            type="button"
            disabled={busy}
            onClick={() => {
              void confirm()
            }}
          >
            {busy ? 'Aguarde…' : 'Confirmar'}
          </button>
        </div>
      </section>
    </div>
  )
}
