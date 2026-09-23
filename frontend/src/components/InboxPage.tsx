import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getTicketBitacora, getTicketInbox, updateTicketStatus } from '../services/tickets'
import { isSessionExpired } from '../services/http'
import type { AuthUser } from '../types/auth'
import type { Ticket, TicketBitacora, TicketStatus } from '../types/ticket'
import { DashboardLayout } from './DashboardLayout'
import { TicketLogDocument } from './TicketLogDocument'
import { TicketResolutionForm } from './TicketResolutionForm'
import { TicketSymptomPreview } from './TicketSymptomPreview'
import type { RouteKey } from './Sidebar'

type InboxPageProps = {
  user: AuthUser
  accessToken: string
  onLogout: () => void
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
}

type StatusFilter = 'ALL' | TicketStatus

const PAGE_SIZE = 10

const statusLabels: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
}

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'RESUELTO', label: 'Resueltos' },
]

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

function InboxTable({ tickets, startingId, bitacoraId, onSelectTicket, onStartTicket, onOpenBitacora }: {
  tickets: Ticket[]
  startingId: number | null
  bitacoraId: number | null
  onSelectTicket: (ticket: Ticket, trigger: HTMLButtonElement) => void
  onStartTicket: (ticket: Ticket) => void
  onOpenBitacora: (ticket: Ticket) => void
}) {
  return (
    <div className="table-scroll inbox-table-scroll" role="region" tabIndex={0} aria-label="Tabla de tickets">
      <table className="inbox-table">
        <caption className="sr-only">Tickets de soporte ordenados por fecha de creación</caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Estado</th>
            <th scope="col">Solicitante</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Síntoma</th>
            <th scope="col">Fecha de creación</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const canResolve = ticket.estado === 'EN_PROCESO'

            return (
              <tr key={ticket.id_ticket}>
                <td className="inbox-code">
                  {canResolve ? (
                    <button
                      className="device-code-button ticket-code-button"
                      type="button"
                      aria-label={`Abrir formulario de cierre para ${ticket.codigo_ticket}`}
                      onClick={(event) => onSelectTicket(ticket, event.currentTarget)}
                    >
                      {ticket.codigo_ticket}
                    </button>
                  ) : (
                    <span className="inbox-code-disabled">{ticket.codigo_ticket}</span>
                  )}
                </td>
                <td>
                  <span className={`ticket-status ticket-status-${ticket.estado.toLowerCase().replace('_', '-')}`}>
                    {statusLabels[ticket.estado] ?? ticket.estado}
                  </span>
                </td>
                <td>{ticket.id_solicitante ?? 'No disponible'}</td>
                <td>{ticket.ubicacion}</td>
                <td className="inbox-symptom"><TicketSymptomPreview ticket={ticket} /></td>
                <td className="inbox-date">
                  {ticket.fecha_creacion ? (
                    <time dateTime={ticket.fecha_creacion}>{formatTicketDate(ticket.fecha_creacion)}</time>
                  ) : (
                    'No disponible'
                  )}
                </td>
                <td className="inbox-actions">
                  {ticket.estado === 'ABIERTO' && (
                    <button
                      className="text-button"
                      type="button"
                      disabled={startingId === ticket.id_ticket}
                      aria-label={`Iniciar ticket ${ticket.codigo_ticket}`}
                      onClick={() => onStartTicket(ticket)}
                    >
                      {startingId === ticket.id_ticket ? 'Iniciando…' : 'Iniciar'}
                    </button>
                  )}
                  {ticket.estado === 'RESUELTO' && (
                    <button
                      className="text-button"
                      type="button"
                      disabled={bitacoraId === ticket.id_ticket}
                      aria-label={`Ver bitácora del ticket ${ticket.codigo_ticket}`}
                      onClick={() => onOpenBitacora(ticket)}
                    >
                      {bitacoraId === ticket.id_ticket ? 'Abriendo…' : 'Bitácora'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const resolutionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const statusTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [startingId, setStartingId] = useState<number | null>(null)
  const [bitacoraId, setBitacoraId] = useState<number | null>(null)
  const [bitacora, setBitacora] = useState<TicketBitacora | null>(null)
  const [actionError, setActionError] = useState('')

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

  const visibleTickets = statusFilter === 'ALL'
    ? tickets
    : tickets.filter((ticket) => ticket.estado === statusFilter)
  const totalPages = Math.max(1, Math.ceil(visibleTickets.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * PAGE_SIZE
  const pagedTickets = visibleTickets.slice(pageStart, pageStart + PAGE_SIZE)
  const pageNumbers = getPageNumbers(activePage, totalPages)

  function retryLoad() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  function changeStatusFilter(nextStatus: StatusFilter) {
    setStatusFilter(nextStatus)
    setCurrentPage(1)
  }

  function handleStatusTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % statusOptions.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + statusOptions.length) % statusOptions.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = statusOptions.length - 1
    if (nextIndex === index) return

    event.preventDefault()
    changeStatusFilter(statusOptions[nextIndex].value)
    statusTabRefs.current[nextIndex]?.focus()
  }

  async function startTicket(ticket: Ticket) {
    setStartingId(ticket.id_ticket)
    setActionError('')

    try {
      const updatedTicket = await updateTicketStatus(accessToken, ticket.id_ticket, 'EN_PROCESO')
      setTickets((current) => current.map((item) => (item.id_ticket === updatedTicket.id_ticket ? updatedTicket : item)))
    } catch (exception: unknown) {
      if (isSessionExpired(exception)) {
        onLogout()
        return
      }
      setActionError(exception instanceof Error ? exception.message : 'No se pudo iniciar el ticket')
    } finally {
      setStartingId(null)
    }
  }

  async function openBitacora(ticket: Ticket) {
    setBitacoraId(ticket.id_ticket)
    setActionError('')

    try {
      const record = await getTicketBitacora(accessToken, ticket.id_ticket)
      setBitacora(record)
    } catch (exception: unknown) {
      if (isSessionExpired(exception)) {
        onLogout()
        return
      }
      setActionError(exception instanceof Error ? exception.message : 'No se pudo cargar la bitácora del ticket')
    } finally {
      setBitacoraId(null)
    }
  }

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="inventory-shell">
        <section className="inventory-content inbox-content" aria-label="Bandeja de entrada de tickets">
          <div className="inventory-status-tabs" role="tablist" aria-label="Filtrar tickets por estado">
            {statusOptions.map((option, index) => {
              const selected = statusFilter === option.value
              const tabId = `inbox-tab-${option.value.toLowerCase()}`

              return (
                <button
                  className={`inventory-status-tab${selected ? ' active' : ''}`}
                  id={tabId}
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="inbox-results-panel"
                  tabIndex={selected ? 0 : -1}
                  ref={(element) => { statusTabRefs.current[index] = element }}
                  onClick={() => changeStatusFilter(option.value)}
                  onKeyDown={(event) => handleStatusTabKeyDown(event, index)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <div
            className="table-card inbox-table-card"
            id="inbox-results-panel"
            role="tabpanel"
            aria-labelledby={`inbox-tab-${statusFilter.toLowerCase()}`}
          >
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

            {!loading && !error && actionError && (
              <div className="banner-error" role="alert">
                <span>{actionError}</span>
                <button className="text-button" type="button" onClick={() => setActionError('')}>Cerrar</button>
              </div>
            )}

            {!loading && !error && tickets.length === 0 && (
              <div className="empty-state-block" role="status">
                <p>No hay tickets registrados.</p>
              </div>
            )}

            {!loading && !error && tickets.length > 0 && visibleTickets.length === 0 && (
              <div className="empty-state-block" role="status">
                <p>No hay tickets con este estado.</p>
              </div>
            )}

            {!loading && !error && visibleTickets.length > 0 && (
              <>
                <InboxTable
                  tickets={pagedTickets}
                  startingId={startingId}
                  bitacoraId={bitacoraId}
                  onStartTicket={startTicket}
                  onOpenBitacora={openBitacora}
                  onSelectTicket={(ticket, trigger) => {
                    resolutionTriggerRef.current = trigger
                    setSelectedTicket(ticket)
                  }}
                />
                <footer className="table-footer">
                  <span>Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, visibleTickets.length)} de {visibleTickets.length} tickets</span>
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
        {selectedTicket && (
          <TicketResolutionForm
            accessToken={accessToken}
            ticket={selectedTicket}
            onResolved={() => {
              setSelectedTicket(null)
              resolutionTriggerRef.current = null
              setReloadKey((key) => key + 1)
            }}
            onCancel={() => {
              setSelectedTicket(null)
              requestAnimationFrame(() => resolutionTriggerRef.current?.focus())
            }}
            onSessionExpired={onLogout}
          />
        )}
        {bitacora && (
          <TicketLogDocument bitacora={bitacora} onClose={() => setBitacora(null)} />
        )}
      </main>
    </DashboardLayout>
  )
}
