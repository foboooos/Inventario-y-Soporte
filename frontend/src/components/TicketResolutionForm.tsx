import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isSessionExpired } from '../services/http'
import { resolveTicket } from '../services/tickets'
import type { DeviceStatus, DeviceType } from '../types/inventory'
import type { Ticket, TicketStatus } from '../types/ticket'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'

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
  const modalRef = useRef<ModalHandle>(null)
  const hasDevice = typeof ticket.id_dispositivo === 'number'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (hasDevice && !finalStatus) return
    setError('')
    setSaving(true)

    try {
      const resolvedTicket = await resolveTicket(accessToken, ticket.id_ticket, {
        causa_raiz: cause.trim(),
        solucion_aplicada: solution.trim(),
        ...(hasDevice && finalStatus ? { estado_final: finalStatus } : {}),
      })
      modalRef.current?.close(() => onResolved(resolvedTicket))
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
    <Modal
      ref={modalRef}
      label={`Resolver ticket ${ticket.codigo_ticket}`}
      backdropClassName="ticket-resolution-backdrop"
      cardClassName="modal-card ticket-resolution-modal"
      dismissible={!saving}
      onClose={onCancel}
    >
        <div className="ticket-resolution-body">
          <dl className="ticket-resolution-summary">
            <div>
              <dt>Estado</dt>
              <dd><span className={`ticket-status ticket-status-${statusModifier}`}>{statusLabel}</span></dd>
            </div>
            <div>
              <dt>Solicitante</dt>
              <dd>{ticket.solicitante_nombre ?? ticket.id_solicitante ?? 'No disponible'}</dd>
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
                value={cause}
                onChange={(event) => setCause(event.target.value)}
                maxLength={2000}
                rows={4}
                required
              />
            </label>
            <label>
              <span>Solución aplicada</span>
              <textarea
                value={solution}
                onChange={(event) => setSolution(event.target.value)}
                maxLength={2000}
                rows={4}
                required
              />
            </label>
            {hasDevice && (
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
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <div className="ticket-resolution-actions">
              <button className="secondary-button" type="button" disabled={saving} onClick={() => modalRef.current?.close()}>Cancelar</button>
              <button className="primary-action" type="submit" disabled={saving || !cause.trim() || !solution.trim() || (hasDevice && !finalStatus)}>
                {saving ? 'Guardando…' : 'Cerrar ticket'}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  )
}
