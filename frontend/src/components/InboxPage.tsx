import { useEffect, useState } from 'react'
import { getTicketInbox } from '../services/tickets'
import { isSessionExpired } from '../services/http'
import type { AuthUser } from '../types/auth'
import type { Ticket, TicketStatus } from '../types/ticket'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type InboxPageProps = {
  user: AuthUser
  accessToken: string
  onLogout: () => void
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
}

const PAGE_SIZE = 10

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

function formatTicketDate(value?: string) {
  if (!value) return 'No disponible'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function InboxTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="table-scroll inbox-table-scroll" role="region" tabIndex={0} aria-label="Tabla de tickets pendientes">
      <table className="inbox-table">
        <caption className="sr-only">Tickets pendientes ordenados por fecha de creación</caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Estado</th>
            <th scope="col">Solicitante</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Síntoma</th>
            <th scope="col">Fecha de creación</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id_ticket}>
              <td className="inbox-code">{ticket.codigo_ticket}</td>
              <td>
                <span className={`ticket-status ticket-status-${ticket.estado.toLowerCase().replace('_', '-')}`}>
                  {statusLabels[ticket.estado] ?? ticket.estado}
                </span>
              </td>
              <td>{ticket.id_solicitante ?? 'No disponible'}</td>
              <td>{ticket.ubicacion}</td>
              <td className="inbox-symptom">{ticket.sintoma}</td>
              <td className="inbox-date">
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

export function InboxPage({ user, accessToken, onLogout, activeRoute, onNavigate }: InboxPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    getTicketInbox(accessToken)
      .then((loadedTickets) => {
        if (!isMounted) return
        setTickets(loadedTickets)
        setCurrentPage(1)
      })
      .catch((exception: unknown) => {
        if (!isMounted) return
        if (isSessionExpired(exception)) {
          onLogout()
          return
        }
        setError(exception instanceof Error ? exception.message : 'No se pudo cargar la bandeja de tickets')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, onLogout, reloadKey])

  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * PAGE_SIZE
  const pagedTickets = tickets.slice(pageStart, pageStart + PAGE_SIZE)
  const pageNumbers = getPageNumbers(activePage, totalPages)

  function retryLoad() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="inventory-shell">
        <section className="inventory-content inbox-content" aria-label="Bandeja de entrada de tickets">
          <div className="table-card inbox-table-card">
            {loading && (
              <div className="skeleton-block" role="status" aria-live="polite" aria-label="Cargando bandeja de tickets">
                <span className="sr-only">Cargando bandeja de tickets…</span>
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
              </div>
            )}

            {!loading && error && (
              <div className="empty-state-block">
                <p className="error" role="alert">{error}</p>
                <button type="button" onClick={retryLoad}>Reintentar</button>
              </div>
            )}

            {!loading && !error && tickets.length === 0 && (
              <div className="empty-state-block" role="status">
                <p>No hay tickets pendientes en la bandeja.</p>
              </div>
            )}

            {!loading && !error && tickets.length > 0 && (
              <>
                <InboxTable tickets={pagedTickets} />
                <footer className="table-footer">
                  <span>Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, tickets.length)} de {tickets.length} tickets</span>
                  <nav className="pagination" aria-label="Paginación de la bandeja de entrada">
                    <button className="pagination-button" type="button" disabled={activePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Anterior</button>
                    {pageNumbers.map((page, index) => page === 'ellipsis'
                      ? <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
                      : <button className={`pagination-button page-number${page === activePage ? ' active' : ''}`} type="button" key={page} aria-current={page === activePage ? 'page' : undefined} onClick={() => setCurrentPage(page)}>{page}</button>)}
                    <button className="pagination-button" type="button" disabled={activePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Siguiente</button>
                  </nav>
                </footer>
              </>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
