import { useEffect, useRef, useState } from 'react'
import { getTickets } from '../services/tickets'
import { isSessionExpired } from '../services/http'
import { TicketSymptomPreview } from './TicketSymptomPreview'
import { TableSkeleton } from './Skeleton'
import { getPageNumbers } from '../utils/pagination'
import type { Ticket, TicketStatus } from '../types/ticket'
import type { RefObject } from 'react'

type TicketHistoryProps = {
  accessToken: string
  onSessionExpired: () => void
  refreshKey: number
  desktopOnly?: boolean
}

const INITIAL_PAGE_SIZE = 10
const MIN_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 30
const FALLBACK_HEADER_HEIGHT = 30
const TABLE_ROW_HEIGHT = 31

const statusLabels: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: false,
})

function formatTicketDate(value?: string) {
  if (!value) return 'No disponible'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}


function TicketHistoryTable({ tickets, pageSize, scrollRef }: { tickets: Ticket[]; pageSize: number; scrollRef: RefObject<HTMLDivElement | null> }) {
  const [expandedSymptomId, setExpandedSymptomId] = useState<number | null>(null)

  return (
    <div ref={scrollRef} className="ticket-history-table-scroll" role="region" tabIndex={0} aria-label="Tabla de historial de tickets">
      <table className={`ticket-history-table${tickets.length < pageSize ? ' is-partial' : ''}`}>
        <caption className="sr-only">Historial de tickets de soporte</caption>
        <thead>
          <tr>
            <th className="ticket-history-code-column" scope="col">Código</th>
            <th className="ticket-history-status-column" scope="col">Estado</th>
            <th className="ticket-history-location-column" scope="col">Ubicación</th>
            <th className="ticket-history-symptom-column" scope="col">Síntoma</th>
            <th className="ticket-history-date-column" scope="col">Fecha</th>
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
              <td className="ticket-history-location"><span className="ticket-history-location-text">{ticket.ubicacion}</span></td>
              <td className="ticket-history-symptom">
                <TicketSymptomPreview
                  ticket={ticket}
                  isExpanded={expandedSymptomId === ticket.id_ticket}
                  onExpandedChange={(expanded) => setExpandedSymptomId(expanded ? ticket.id_ticket : null)}
                />
              </td>
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

export function TicketHistory({ accessToken, onSessionExpired, refreshKey, desktopOnly = false }: TicketHistoryProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const pageSizeRef = useRef(INITIAL_PAGE_SIZE)
  const baseRowHeightRef = useRef<number | null>(null)

  useEffect(() => {
    const scrollElement = tableScrollRef.current
    if (!scrollElement) return

    const updatePageSize = () => {
      if (scrollElement.clientHeight === 0) return
      const table = scrollElement.querySelector('table')
      table?.style.removeProperty('--ticket-history-row-height')

      const headerHeight = table?.tHead?.getBoundingClientRect().height ?? 0
      const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : []
      const naturalRowHeight = rows.reduce(
        (max, row) => Math.max(max, row.getBoundingClientRect().height),
        0,
      )
      if (naturalRowHeight > 0) baseRowHeightRef.current = naturalRowHeight

      const baseRowHeight = naturalRowHeight || baseRowHeightRef.current || TABLE_ROW_HEIGHT
      const availableHeight = scrollElement.clientHeight - (headerHeight || FALLBACK_HEADER_HEIGHT) - 2
      if (availableHeight <= 0 || !table) return

      const nextPageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(MIN_PAGE_SIZE, Math.floor(availableHeight / baseRowHeight)),
      )

      if (pageSizeRef.current !== nextPageSize) {
        const previousPageSize = pageSizeRef.current
        pageSizeRef.current = nextPageSize
        setPageSize(nextPageSize)
        setCurrentPage((page) => Math.floor(((page - 1) * previousPageSize) / nextPageSize) + 1)
      }

      table.style.setProperty(
        '--ticket-history-row-height',
        `${Math.max(baseRowHeight, availableHeight / nextPageSize)}px`,
      )
    }

    updatePageSize()
    const observer = new ResizeObserver(updatePageSize)
    observer.observe(scrollElement)
    window.addEventListener('resize', updatePageSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePageSize)
    }
  }, [loading])

  useEffect(() => {
    let isMounted = true

    async function loadTickets() {
      setLoading(true)
      setError('')

      try {
        const result = await getTickets(accessToken, { page: currentPage, limit: pageSize })
        if (isMounted) {
          setTickets(result.tickets)
          setTotal(result.total)
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
  }, [accessToken, onSessionExpired, refreshKey, reloadKey, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * pageSize
  const pageNumbers = getPageNumbers(activePage, totalPages)

  return (
    <section className={`ticket-history-section${desktopOnly ? ' ticket-history-desktop-only' : ''}`} aria-label="Historial de tickets">
      <section className="support-card ticket-history-card">
        {loading && (
          <TableSkeleton
            label="Cargando historial de tickets…"
            columns={[
              '114px',
              '104px',
              'calc((100% - 218px) * 0.355)',
              'calc((100% - 218px) * 0.258)',
              'calc((100% - 218px) * 0.387)',
            ]}
            rows={pageSize}
          />
        )}

        {!loading && error && (
          <div className="ticket-history-state">
            <p className="error" role="alert">{error}</p>
            <button className="text-button" type="button" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</button>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="ticket-history-state" role="status">
            <p>Aún no hay tickets registrados.</p>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <>
            <TicketHistoryTable tickets={tickets} pageSize={pageSize} scrollRef={tableScrollRef} />
            <footer className="table-footer">
              <span>Mostrando {pageStart + 1}–{Math.min(pageStart + pageSize, total)} de {total} tickets</span>
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
