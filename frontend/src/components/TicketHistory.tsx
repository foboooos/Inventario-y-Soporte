import { useEffect, useState } from 'react'
import { getTickets } from '../services/tickets'
import { isSessionExpired } from '../services/http'
import { TicketSymptomPreview } from './TicketSymptomPreview'
import type { Ticket, TicketStatus } from '../types/ticket'

type TicketHistoryProps = {
  accessToken: string
  onSessionExpired: () => void
  refreshKey: number
}

const PAGE_SIZE = 5

const statusLabels: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
}

function getPageNumbers(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push('ellipsis')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('ellipsis')
  pages.push(totalPages)

  return pages
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
              <td className="ticket-history-symptom"><TicketSymptomPreview ticket={ticket} /></td>
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
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    async function loadTickets() {
      setLoading(true)
      setError('')
      setTickets([])

      try {
        const loadedTickets = await getTickets(accessToken)
        if (isMounted) {
          setTickets(loadedTickets)
          setCurrentPage(1)
        }
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

  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * PAGE_SIZE
  const pagedTickets = tickets.slice(pageStart, pageStart + PAGE_SIZE)
  const pageNumbers = getPageNumbers(activePage, totalPages)

  return (
    <section className="ticket-history-section" aria-label="Historial de tickets">
      <section className="support-card ticket-history-card">
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
          <>
            <TicketHistoryTable tickets={pagedTickets} />
            <footer className="table-footer">
              <span>Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, tickets.length)} de {tickets.length} tickets</span>
              <nav className="pagination" aria-label="Paginación del historial de tickets">
                <button className="pagination-button" type="button" disabled={activePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Anterior</button>
                {pageNumbers.map((page, index) => page === 'ellipsis'
                  ? <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
                  : <button className={`pagination-button page-number${page === activePage ? ' active' : ''}`} type="button" key={page} aria-current={page === activePage ? 'page' : undefined} onClick={() => setCurrentPage(page)}>{page}</button>)}
                <button className="pagination-button" type="button" disabled={activePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Siguiente</button>
              </nav>
            </footer>
          </>
        )}
      </section>
    </section>
  )
}
