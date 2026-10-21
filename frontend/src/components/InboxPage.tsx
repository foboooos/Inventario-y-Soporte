import { useEffect, useMemo, useRef, useState } from 'react'
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
import { getPageNumbers } from '../utils/pagination'

type InboxPageProps = {
  accessToken: string
  onSessionExpired: () => void
}

type EstadoFilter = 'ALL' | 'EN_ESPERA' | 'EN_PROCESO' | 'OPERATIVO' | 'INACTIVO' | 'BAJA_TECNICA'

const PAGE_SIZE = 10
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
  { value: 'EN_ESPERA', label: 'En espera' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'BAJA_TECNICA', label: 'Baja técnica' },
]

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

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

export function InboxPage({ accessToken, onSessionExpired }: InboxPageProps) {
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
  const [startingId, setStartingId] = useState<number | null>(null)
  const [bitacoraId, setBitacoraId] = useState<number | null>(null)
  const [bitacora, setBitacora] = useState<TicketBitacora | null>(null)
  const [actionError, setActionError] = useState('')

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
      { page: currentPage, limit: PAGE_SIZE },
    )
      .then((result) => {
        if (!isMounted) return
        hasDataRef.current = true
        setTickets(result.tickets)
        setTotal(result.total)
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
  }, [accessToken, onSessionExpired, reloadKey, estadoFilter, parentLocation, subLocation, desde, hasta, currentPage])

  useEffect(() => {
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
  }, [])

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * PAGE_SIZE
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
    <main className="inventory-shell">
      <section className="inventory-content inbox-content" aria-label="Bandeja de entrada de tickets">
          <div className="inbox-filters">
            <label>
              <span>Estado</span>
              <select value={estadoFilter} onChange={(event) => { setEstadoFilter(event.target.value as EstadoFilter); resetPage() }}>
                {estadoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Ubicación</span>
              <select value={parentLocation} onChange={(event) => { setParentLocation(event.target.value); setSubLocation(''); resetPage() }}>
                <option value="">Todas las ubicaciones</option>
                {globalLocations.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </label>
            {subLocations.length > 0 && (
              <label>
                <span>Curso / Sala</span>
                <select value={subLocation} onChange={(event) => { setSubLocation(event.target.value); resetPage() }}>
                  <option value="">Toda la ubicación</option>
                  {subLocations.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
                </select>
              </label>
            )}
            <label>
              <span>Desde</span>
              <input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); resetPage() }} />
            </label>
            <label>
              <span>Hasta</span>
              <input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); resetPage() }} />
            </label>
            <button className="text-button" type="button" onClick={clearFilters}>Limpiar filtros</button>
          </div>

          <div className="table-card inbox-table-card" id="inbox-results-panel">
            {loading && (
              <TableSkeleton
                label="Cargando bandeja de tickets…"
                columns={['12%', '12%', '14%', '14%', '30%', '14%', '8%']}
                rows={PAGE_SIZE}
              />
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
                <p>{hasActiveFilters ? 'No hay tickets que coincidan con los filtros.' : 'No hay tickets registrados.'}</p>
              </div>
            )}

            {!loading && !error && tickets.length > 0 && (
              <>
                <InboxTable
                  tickets={tickets}
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
                  <span>Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, total)} de {total} tickets</span>
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
