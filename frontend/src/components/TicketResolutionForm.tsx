import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isSessionExpired } from '../services/http'
import { resolveTicket } from '../services/tickets'
import type { DeviceStatus, DeviceType } from '../types/inventory'
import type { Ticket, TicketStatus } from '../types/ticket'

type TicketResolutionFormProps = {
  accessToken: string
  ticket: Ticket
  onResolved: (ticket: Ticket) => void
  onCancel: () => void
  onSessionExpired: () => void
}

const statusLabels: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
}

const deviceTypeLabels: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'Proyector',
  IMPRESORA: 'Impresora',
  RED: 'Red',
}

const finalStatusOptions: Array<{ value: DeviceStatus; label: string }> = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'BAJA_TECNICA', label: 'Baja Técnica' },
]

export function TicketResolutionForm({ accessToken, ticket, onResolved, onCancel, onSessionExpired }: TicketResolutionFormProps) {
  const [cause, setCause] = useState('')
  const [solution, setSolution] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [finalStatus, setFinalStatus] = useState<DeviceStatus | ''>('')
  const causeRef = useRef<HTMLTextAreaElement | null>(null)
  const solutionRef = useRef<HTMLTextAreaElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const saveRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    causeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onCancel()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = [causeRef.current, solutionRef.current, cancelRef.current, saveRef.current]
        .filter((element): element is HTMLButtonElement | HTMLTextAreaElement => element !== null && !element.disabled)
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, saving])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!finalStatus) return
    setError('')
    setSaving(true)

    try {
      const resolvedTicket = await resolveTicket(accessToken, ticket.id_ticket, {
        causa_raiz: cause.trim(),
        solucion_aplicada: solution.trim(),
        estado_final: finalStatus,
      })
      onResolved(resolvedTicket)
    } catch (exception: unknown) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo guardar la resolución del ticket')
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = statusLabels[ticket.estado] ?? ticket.estado
  const statusModifier = ticket.estado.toLowerCase().replace('_', '-')

  return (
    <div
      className="modal-backdrop ticket-resolution-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel()
      }}
    >
      <section
        className="modal-card ticket-resolution-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Resolver ticket ${ticket.codigo_ticket}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ticket-resolution-body">
          <dl className="ticket-resolution-summary">
            <div>
              <dt>Estado</dt>
              <dd><span className={`ticket-status ticket-status-${statusModifier}`}>{statusLabel}</span></dd>
            </div>
            <div>
              <dt>Solicitante</dt>
              <dd>{ticket.id_solicitante ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{ticket.ubicacion}</dd>
            </div>
            <div>
              <dt>Dispositivo</dt>
              <dd>
                {ticket.codigo_inventario
                  ? `${ticket.dispositivo_tipo ? `${deviceTypeLabels[ticket.dispositivo_tipo]} · ` : ''}${ticket.codigo_inventario}`
                  : 'No asociado'}
              </dd>
            </div>
          </dl>

          <form className="ticket-resolution-form" onSubmit={handleSubmit}>
            <label>
              <span>Causa raíz</span>
              <textarea
                ref={causeRef}
                value={cause}
                onChange={(event) => setCause(event.target.value)}
                maxLength={2000}
                rows={4}
                required
                aria-invalid={Boolean(error) || undefined}
              />
            </label>
            <label>
              <span>Solución aplicada</span>
              <textarea
                ref={solutionRef}
                value={solution}
                onChange={(event) => setSolution(event.target.value)}
                maxLength={2000}
                rows={4}
                required
                aria-invalid={Boolean(error) || undefined}
              />
            </label>
            <fieldset className="ticket-resolution-status">
              <legend>Estado Final</legend>
              <div className="ticket-resolution-status-options">
                {finalStatusOptions.map((option) => (
                  <label key={option.value} className="ticket-resolution-status-option" data-status={option.value.toLowerCase()}>
                    <input
                      type="radio"
                      name="ticket-estado-final"
                      value={option.value}
                      checked={finalStatus === option.value}
                      onChange={() => setFinalStatus(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="ticket-resolution-actions">
              <button ref={cancelRef} className="primary-action" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>
              <button ref={saveRef} className="primary-action" type="submit" disabled={saving || !cause.trim() || !solution.trim() || !finalStatus}>
                {saving ? 'Guardando…' : 'Cerrar ticket'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
