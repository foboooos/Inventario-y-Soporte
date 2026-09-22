import { useEffect, useState } from 'react'
import { getTickets } from '../services/tickets'
import { isSessionExpired } from '../services/http'
import type { Ticket, TicketStatus } from '../types/ticket'

type TicketHistoryProps = {
  accessToken: string
  onSessionExpired: () => void
  refreshKey: number
}

const statusLabels: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatTicketDate(value?: string) {
  if (!value) return 'No disponible'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function TicketHistoryTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="ticket-history-table-scroll" role="region" tabIndex={0} aria-label="Tabla de historial de tickets">
      <table className="ticket-history-table">
        <caption className="sr-only">Historial de tickets de soporte</caption>
        <thead>
          <tr>
            <th className="ticket-history-code-column" scope="col">Código</th>
            <th className="ticket-history-status-column" scope="col">Estado</th>

            <th className="ticket-history-location-column" scope="col">Ubicación</th>
            <th className="ticket-history-symptom-column" scope="col">Síntoma</th>
            <th className="ticket-history-date-column" scope="col">Fecha de creación</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id_ticket}>
              <td className="ticket-history-code">{ticket.codigo_ticket}</td>
              <td>
                <span className={`ticket-status ticket-status-${ticket.estado.toLowerCase().replace('_', '-')}`}>
                  {statusLabels[ticket.estado] ?? ticket.estado}
                </span>
              </td>

              <td>{ticket.ubicacion}</td>
              <td className="ticket-history-symptom">{ticket.sintoma}</td>
              <td className="ticket-history-date">
                {ticket.fecha_creacion ? (
                  <time dateTime={ticket.fecha_creacion}>{formatTicketDate(ticket.fecha_creacion)}</time>
                ) : (
                  'No disponible'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TicketHistory({ accessToken, onSessionExpired, refreshKey }: TicketHistoryProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadTickets() {
      setLoading(true)
      setError('')
      setTickets([])

      try {
        const loadedTickets = await getTickets(accessToken)
        if (isMounted) setTickets(loadedTickets)
      } catch (exception: unknown) {
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        if (isMounted) {
          setError(exception instanceof Error ? exception.message : 'No se pudo cargar el historial de tickets')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadTickets()

    return () => {
      isMounted = false
    }
  }, [accessToken, onSessionExpired, refreshKey, reloadKey])

  return (
    <section className="ticket-history-section" aria-labelledby="ticket-history-title">
      <header className="ticket-history-heading">
        <span className="eyebrow">Seguimiento</span>
        <h2 id="ticket-history-title">Historial de tickets</h2>
        <p className="subtitle">Consulta el estado y los detalles de tus solicitudes de soporte.</p>
      </header>

      <section className="support-card ticket-history-card" aria-labelledby="ticket-history-list-title">
        <h3 id="ticket-history-list-title" className="sr-only">Listado de tickets</h3>

            {loading && (
              <div className="ticket-history-state" role="status" aria-live="polite">
                <p>Cargando historial de tickets…</p>
                <div className="ticket-history-loading-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="ticket-history-state">
                <p className="error" role="alert">{error}</p>
                <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</button>
              </div>
            )}

            {!loading && !error && tickets.length === 0 && (
              <div className="ticket-history-state" role="status">
                <p>Aún no hay tickets registrados.</p>
              </div>
            )}

            {!loading && !error && tickets.length > 0 && (
              <TicketHistoryTable tickets={tickets} />
            )}
      </section>
    </section>
  )
}
