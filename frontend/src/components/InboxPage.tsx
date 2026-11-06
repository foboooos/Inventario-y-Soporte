import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { getTicketBitacora, getTicketInbox, updateTicketStatus } from '../services/tickets'
import { getLocations } from '../services/locations'
import { isSessionExpired } from '../services/http'
import type { DeviceType } from '../types/inventory'
import type { Ticket, TicketBitacora, TicketStatus } from '../types/ticket'
import type { Location } from '../types/location'
import { TicketLogDocument } from './TicketLogDocument'
import { TicketResolutionForm } from './TicketResolutionForm'
import { TicketSymptomPreview } from './TicketSymptomPreview'
import { TableSkeleton } from './Skeleton'
import { DateField } from './DateField'
import { SelectMenu } from './SelectMenu'
import { getPageNumbers } from '../utils/pagination'

type InboxPageProps = {
  accessToken: string
  onSessionExpired: () => void
  isActive: boolean
}

type EstadoFilter = 'ALL' | TicketStatus

const PAGE_SIZE = 10
const MIN_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 100
const AUTO_REFRESH_MS = 15000

const statusLabels: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
}

const deviceTypeLabels: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'Proyector',
  IMPRESORA: 'Impresora',
  RED: 'Equipo de red',
}

function formatDeviceLabel(ticket: Ticket): string {
  if (!ticket.codigo_inventario) return '—'
  const type = ticket.dispositivo_tipo ? deviceTypeLabels[ticket.dispositivo_tipo] : ''
  return [type, ticket.codigo_inventario].filter(Boolean).join(' · ')
}

const estadoOptions: Array<{ value: EstadoFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ABIERTO', label: 'Abierto' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'RESUELTO', label: 'Resuelto' },
]

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

function InboxTable({ tickets, startingId, bitacoraId, rowHeight, onSelectTicket, onStartTicket, onOpenBitacora }: {
  tickets: Ticket[]
  startingId: number | null
  bitacoraId: number | null
  rowHeight?: number
  onSelectTicket: (ticket: Ticket, trigger: HTMLButtonElement) => void
  onStartTicket: (ticket: Ticket) => void
  onOpenBitacora: (ticket: Ticket) => void
}) {
  const [expandedSymptomId, setExpandedSymptomId] = useState<number | null>(null)

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
            <th scope="col">Equipo</th>
            <th scope="col">Síntoma</th>
            <th scope="col">Fecha</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const canResolve = ticket.estado === 'EN_PROCESO'

            return (
              <tr key={ticket.id_ticket} style={rowHeight ? { height: rowHeight } : undefined}>
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
                <td>{ticket.solicitante_nombre ?? ticket.id_solicitante ?? 'No disponible'}</td>
                <td>{ticket.ubicacion}</td>
                <td className="inbox-device" title={formatDeviceLabel(ticket)}>{formatDeviceLabel(ticket)}</td>
                <td className="inbox-symptom">
                  <TicketSymptomPreview
                    ticket={ticket}
                    isExpanded={expandedSymptomId === ticket.id_ticket}
                    onExpandedChange={(expanded) => setExpandedSymptomId(expanded ? ticket.id_ticket : null)}
                  />
                </td>
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
                  {ticket.estado === 'EN_PROCESO' && (
                    <span className="inbox-action-state">Iniciado</span>
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

export function InboxPage({ accessToken, onSessionExpired, isActive }: InboxPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('ALL')
  const [parentLocation, setParentLocation] = useState('')
  const [subLocation, setSubLocation] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const resolutionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const hasDataRef = useRef(false)
  const tableCardRef = useRef<HTMLDivElement | null>(null)
  const tableFooterRef = useRef<HTMLElement | null>(null)
  const estadoTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const baseRowHeightRef = useRef<number | null>(null)
  const [startingId, setStartingId] = useState<number | null>(null)
  const [bitacoraId, setBitacoraId] = useState<number | null>(null)
  const [bitacora, setBitacora] = useState<TicketBitacora | null>(null)
  const [actionError, setActionError] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activePage = Math.min(currentPage, totalPages)

  useEffect(() => {
    let isMounted = true

    getTicketInbox(
      accessToken,
      {
        ...(estadoFilter !== 'ALL' ? { estado: estadoFilter } : {}),
        ...((subLocation || parentLocation) ? { ubicacion: subLocation || parentLocation } : {}),
        ...(desde ? { desde } : {}),
        ...(hasta ? { hasta } : {}),
      },
      { page: activePage, limit: pageSize },
    )
      .then((result) => {
        if (!isMounted) return
        hasDataRef.current = true
        setTickets(result.tickets)
        setTotal(result.total)
        setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(result.total / pageSize))))
        setError('')
      })
      .catch((exception: unknown) => {
        if (!isMounted) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        const message = exception instanceof Error ? exception.message : 'No se pudo cargar la bandeja de tickets'
        if (hasDataRef.current) {
          setActionError(`${message}. Se muestran los datos anteriores.`)
        } else {
          setError(message)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, onSessionExpired, reloadKey, estadoFilter, parentLocation, subLocation, desde, hasta, activePage, pageSize])

  useEffect(() => {
    if (!isActive) return

    function refresh() {
      if (document.visibilityState === 'visible') {
        setReloadKey((key) => key + 1)
      }
    }

    const intervalId = window.setInterval(refresh, AUTO_REFRESH_MS)
    window.addEventListener('focus', refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
    }
  }, [isActive])

  useEffect(() => {
    const cardElement = tableCardRef.current
    if (!cardElement) return

    function measure() {
      const card = tableCardRef.current
      if (!card) return
      if (card.clientHeight === 0) return

      const table = card.querySelector('table')
      const header = table?.querySelector('thead')?.getBoundingClientRect().height ?? 0
      const measuredRowHeight = table?.querySelector('tbody tr')?.getBoundingClientRect().height ?? 0
      const footer = tableFooterRef.current?.getBoundingClientRect().height ?? 0

      if (measuredRowHeight <= 0) {
        const available = card.clientHeight - 38
        const fit = Math.floor(available / 34)

        setPageSize((current) => {
          const next = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, fit))
          return current === next ? current : next
        })
        setRowHeight(null)
        return
      }

      if (window.matchMedia('(max-width: 700px)').matches) {
        const content = card.parentElement
        const paddingBottom = content ? Number.parseFloat(getComputedStyle(content).paddingBottom) || 0 : 0
        const top = card.getBoundingClientRect().top + window.scrollY
        const available = window.innerHeight - top - paddingBottom - 6
        const fit = Math.floor((available - header - footer) / measuredRowHeight)

        setPageSize((current) => {
          const next = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, fit))
          return current === next ? current : next
        })
        setRowHeight((current) => (current === null ? current : null))
        return
      }

      if (!baseRowHeightRef.current || baseRowHeightRef.current <= 0) {
        baseRowHeightRef.current = measuredRowHeight
      }

      const baseRowHeight = baseRowHeightRef.current
      if (!baseRowHeight || baseRowHeight <= 0) return

      const available = card.clientHeight - header - footer
      const rows = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(available / baseRowHeight)))

      setPageSize((current) => (current === rows ? current : rows))
      setRowHeight(available > 0 ? available / rows : null)
    }

    measure()
    window.addEventListener('resize', measure)

    const observer = new ResizeObserver(measure)
    observer.observe(cardElement)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [tickets.length, loading])

  useEffect(() => {
    let isMounted = true

    getLocations(accessToken)
      .then((loadedLocations) => {
        if (isMounted) setLocations(loadedLocations)
      })
      .catch((exception: unknown) => {
        if (!isMounted) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setActionError(exception instanceof Error ? exception.message : 'No se pudieron cargar las ubicaciones')
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, onSessionExpired])

  const globalLocations = useMemo(
    () => locations
      .filter((item) => item.padreId === null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [locations],
  )

  const subLocations = useMemo(() => {
    const parent = locations.find((item) => item.padreId === null && item.nombre === parentLocation)
    return parent ? locations.filter((item) => item.padreId === parent.id) : []
  }, [locations, parentLocation])

  const hasActiveFilters = estadoFilter !== 'ALL' || Boolean(subLocation || parentLocation) || Boolean(desde) || Boolean(hasta)

  const pageStart = (activePage - 1) * pageSize
  const pageNumbers = getPageNumbers(activePage, totalPages)

  function retryLoad() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  function resetPage() {
    setCurrentPage(1)
  }

  function clearFilters() {
    setEstadoFilter('ALL')
    setParentLocation('')
    setSubLocation('')
    setDesde('')
    setHasta('')
    setCurrentPage(1)
  }

  function changeEstadoFilter(nextEstado: EstadoFilter) {
    setEstadoFilter(nextEstado)
    setCurrentPage(1)
  }

  function handleEstadoTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % estadoOptions.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + estadoOptions.length) % estadoOptions.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = estadoOptions.length - 1
    if (nextIndex === index) return

    event.preventDefault()
    changeEstadoFilter(estadoOptions[nextIndex].value)
    estadoTabRefs.current[nextIndex]?.focus()
  }

  async function startTicket(ticket: Ticket) {
    setStartingId(ticket.id_ticket)
    setActionError('')

    try {
      const updatedTicket = await updateTicketStatus(accessToken, ticket.id_ticket, 'EN_PROCESO')
      setTickets((current) =>
        current.map((item) =>
          item.id_ticket === ticket.id_ticket ? { ...item, estado: updatedTicket.estado } : item,
        ),
      )
    } catch (exception: unknown) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
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
        onSessionExpired()
        return
      }
      setActionError(exception instanceof Error ? exception.message : 'No se pudo cargar la bitácora del ticket')
    } finally {
      setBitacoraId(null)
    }
  }

  return (
    <main className="inventory-shell inbox-shell">
      <section className="inventory-content inbox-content" aria-label="Bandeja de entrada de tickets">
          <div className="inbox-filter-row">
            <div className="inbox-status-row">
              <div className="inventory-status-tabs" role="tablist" aria-label="Filtrar tickets por estado">
                {estadoOptions.map((option, index) => {
                  const selected = estadoFilter === option.value
                  return (
                    <button
                      className={`inventory-status-tab${selected ? ' active' : ''}`}
                      id={`inbox-tab-${option.value.toLowerCase()}`}
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="inbox-results-panel"
                      tabIndex={selected ? 0 : -1}
                      ref={(element) => { estadoTabRefs.current[index] = element }}
                      onClick={() => changeEstadoFilter(option.value)}
                      onKeyDown={(event) => handleEstadoTabKeyDown(event, index)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <button className="text-button inbox-clear-button" type="button" onClick={clearFilters}>Limpiar</button>
            </div>

            <div className="inbox-filters">
              <label>
                <span>Ubicación</span>
                <SelectMenu
                  id="inbox-location"
                  value={parentLocation}
                  options={[{ value: '', label: 'Todas las ubicaciones' }, ...globalLocations.map((item) => ({ value: item.nombre, label: item.nombre }))]}
                  onChange={(value) => { setParentLocation(value); setSubLocation(''); resetPage() }}
                  ariaLabel="Filtrar por ubicación"
                  placeholder="Todas las ubicaciones"
                />
              </label>
              {subLocations.length > 0 && (
                <label>
                  <span>Curso / Sala</span>
                  <SelectMenu
                    id="inbox-sublocation"
                    value={subLocation}
                    options={[{ value: '', label: 'Toda la ubicación' }, ...subLocations.map((item) => ({ value: item.nombre, label: item.nombre }))]}
                    onChange={(value) => { setSubLocation(value); resetPage() }}
                    ariaLabel="Filtrar por curso o sala"
                    placeholder="Toda la ubicación"
                  />
                </label>
              )}
              <label>
                <span>Desde</span>
                <DateField id="inbox-desde" value={desde} onChange={(value) => { setDesde(value); resetPage() }} ariaLabel="Filtrar desde" />
              </label>
              <label>
                <span>Hasta</span>
                <DateField id="inbox-hasta" value={hasta} onChange={(value) => { setHasta(value); resetPage() }} ariaLabel="Filtrar hasta" />
              </label>
            </div>
          </div>

          <div
            className="table-card inbox-table-card"
            id="inbox-results-panel"
            role="tabpanel"
            aria-labelledby={`inbox-tab-${estadoFilter.toLowerCase()}`}
            ref={tableCardRef}
          >
            {loading && (
              <TableSkeleton
                label="Cargando bandeja de tickets…"
                columns={[
                  '114px',
                  '104px',
                  '140px',
                  'calc((100% - 566px) * 0.15)',
                  'calc((100% - 566px) * 0.24)',
                  'calc((100% - 566px) * 0.61)',
                  '130px',
                  '78px',
                ]}
                rows={pageSize}
              />
            )}

            {!loading && error && (
              <div className="empty-state-block">
                <p className="error" role="alert">{error}</p>
                <button className="text-button" type="button" onClick={retryLoad}>Reintentar</button>
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
                <p>{hasActiveFilters ? 'No hay tickets que coincidan con los filtros.' : 'No hay tickets registrados.'}</p>
              </div>
            )}

            {!loading && !error && tickets.length > 0 && (
              <>
                <InboxTable
                  tickets={tickets}
                  startingId={startingId}
                  bitacoraId={bitacoraId}
                  rowHeight={rowHeight ?? undefined}
                  onStartTicket={startTicket}
                  onOpenBitacora={openBitacora}
                  onSelectTicket={(ticket, trigger) => {
                    resolutionTriggerRef.current = trigger
                    setSelectedTicket(ticket)
                  }}
                />
                <footer className="table-footer" ref={tableFooterRef}>
                  <span>Mostrando {pageStart + 1}–{Math.min(pageStart + pageSize, total)} de {total} tickets</span>
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
            onSessionExpired={onSessionExpired}
          />
        )}
        {bitacora && (
          <TicketLogDocument bitacora={bitacora} onClose={() => setBitacora(null)} />
        )}
    </main>
  )
}
