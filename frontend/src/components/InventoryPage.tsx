import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { getInventory } from '../services/inventory'
import { isSessionExpired } from '../services/http'
import type { AuthUser } from '../types/auth'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import { CreateDeviceForm } from './CreateDeviceForm'
import { EditDeviceForm } from './EditDeviceForm'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type InventoryPageProps = {
  user: AuthUser
  accessToken: string
  onLogout: () => void
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
}

type StatusFilter = 'ALL' | DeviceStatus
type SortKey = 'code' | 'location' | 'status'
type SortDir = 'asc' | 'desc'
type Modal = { kind: 'create' } | { kind: 'edit'; device: Device } | null

const FILTERS_KEY = 'inventory-filters-v1'
const PAGE_SIZE = 8
const NO_BRAND = 'Sin marca'
const NO_MODEL = 'Sin modelo'

const statusLabels: Record<DeviceStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  BAJA_TECNICA: 'Baja técnica',
}

const statusOrder: Record<DeviceStatus, number> = {
  ACTIVO: 0,
  INACTIVO: 1,
  BAJA_TECNICA: 2,
}

const typeLabels: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'Proyector',
  IMPRESORA: 'Impresora',
  RED: 'Equipo de red',
}


const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
  { value: 'BAJA_TECNICA', label: 'Baja técnica' },
]

type StoredFilters = {
  status?: unknown
  sortKey?: unknown
  sortDir?: unknown
}

function loadStoredFilters(): StoredFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as StoredFilters) : {}
  } catch {
    return {}
  }
}

function pickFilter<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
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

function SortButton({ label, sortKey, activeKey, dir, onToggle }: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onToggle: (key: SortKey) => void
}) {
  const active = activeKey === sortKey
  const hint = active
    ? dir === 'asc' ? 'orden ascendente, activar para orden descendente' : 'orden descendente, activar para orden ascendente'
    : 'activar para ordenar'

  return (
    <button type="button" className="th-sort" onClick={() => onToggle(sortKey)} aria-label={`${label}: ${hint}`}>
      {label}
      <span aria-hidden="true" className="th-sort-icon">{active ? (dir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  )
}

export function InventoryPage({ user, accessToken, onLogout, activeRoute, onNavigate }: InventoryPageProps) {
  const [initial] = useState<StoredFilters>(() => loadStoredFilters())

  const [devices, setDevices] = useState<Device[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    pickFilter(initial.status, ['ALL', 'ACTIVO', 'INACTIVO', 'BAJA_TECNICA'] as const, 'ALL'),
  )
  const [sortKey, setSortKey] = useState<SortKey>(
    pickFilter(initial.sortKey, ['code', 'location', 'status'] as const, 'code'),
  )
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir === 'desc' ? 'desc' : 'asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState<Modal>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const hasDataRef = useRef(false)
  const statusTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const canManageInventory = user.rol === 'ADMIN' || user.rol === 'TECNICO'

  useEffect(() => {
    let active = true

    getInventory(accessToken)
      .then((loadedDevices) => {
        if (!active) return
        hasDataRef.current = true
        setDevices(loadedDevices)
        setError('')
        setRefreshError('')
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onLogout()
          return
        }
        const message = exception instanceof Error ? exception.message : 'No se pudo cargar el inventario'
        if (hasDataRef.current) {
          setRefreshError(message)
        } else {
          setError(message)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [accessToken, onLogout, reloadKey])


  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        status: statusFilter,
        sortKey,
        sortDir,
      }))
    } catch {
      return
    }
  }, [statusFilter, sortKey, sortDir])

  function retryLoad() {
    setError('')
    setRefreshError('')
    setReloadKey((key) => key + 1)
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const visibleDevices = useMemo(() => {
    const filtered = devices.filter((device) => statusFilter === 'ALL' || device.status === statusFilter)

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'location') return a.location.localeCompare(b.location, 'es') * dir
      if (sortKey === 'status') return (statusOrder[a.status] - statusOrder[b.status]) * dir
      return a.code.localeCompare(b.code, 'es', { numeric: true }) * dir
    })
  }, [devices, statusFilter, sortKey, sortDir])

  const deviceSummary = useMemo(() => devices.reduce((summary, device) => {
    summary.total += 1
    if (device.status === 'ACTIVO') summary.active += 1
    if (device.status === 'INACTIVO') summary.inactive += 1
    if (device.status === 'BAJA_TECNICA') summary.technicalRetirement += 1
    return summary
  }, { total: 0, active: 0, inactive: 0, technicalRetirement: 0 }), [devices])

  const totalPages = Math.max(1, Math.ceil(visibleDevices.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const pageStart = (activePage - 1) * PAGE_SIZE
  const pagedDevices = visibleDevices.slice(pageStart, pageStart + PAGE_SIZE)
  const pageNumbers = getPageNumbers(activePage, totalPages)

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


  function renderBrandModel(device: Device) {
    const unknownBrand = device.brand === NO_BRAND
    const unknownModel = device.model === NO_MODEL

    if (unknownBrand && unknownModel) {
      return <span className="muted-cell">—</span>
    }

    return (
      <>
        {!unknownBrand && <strong>{device.brand}</strong>}
        {!unknownModel && <span className="secondary-cell">{unknownBrand ? <strong>{device.model}</strong> : device.model}</span>}
      </>
    )
  }

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="inventory-shell">
        <section className="inventory-content" aria-label="Inventario">
          {canManageInventory && (
            <div className="inventory-actions">
              <button className="primary-action" type="button" onClick={() => setModal({ kind: 'create' })}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
                Nuevo dispositivo
              </button>
            </div>
          )}

          <section className="inventory-summary" aria-label="Resumen del inventario">
            <article className="inventory-summary-card" data-status="total">
              <span className="summary-label">Total</span>
              <strong className="summary-value">{deviceSummary.total}</strong>
            </article>
            <article className="inventory-summary-card" data-status="activo">
              <span className="summary-label">Activos</span>
              <strong className="summary-value">{deviceSummary.active}</strong>
            </article>
            <article className="inventory-summary-card" data-status="inactivo">
              <span className="summary-label">Inactivos</span>
              <strong className="summary-value">{deviceSummary.inactive}</strong>
            </article>
            <article className="inventory-summary-card" data-status="baja-tecnica">
              <span className="summary-label">Baja técnica</span>
              <strong className="summary-value">{deviceSummary.technicalRetirement}</strong>
            </article>
          </section>

          <div className="inventory-status-tabs" role="tablist" aria-label="Filtrar por estado">
            {statusOptions.map((option, index) => {
              const selected = statusFilter === option.value
              const tabId = `inventory-tab-${option.value.toLowerCase()}`

              return (
                <button
                  className={`inventory-status-tab${selected ? ' active' : ''}`}
                  id={tabId}
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="inventory-results-panel"
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

          {modal?.kind === 'edit' && canManageInventory && (
            <EditDeviceForm
              key={modal.device.id}
              accessToken={accessToken}
              device={modal.device}
              onCancel={() => setModal(null)}
              onSessionExpired={onLogout}
              onUpdated={(updatedDevice) => {
                setDevices((current) => current.map((device) => device.id === updatedDevice.id ? updatedDevice : device))
                setModal(null)
              }}
            />
          )}

          {modal?.kind === 'create' && canManageInventory && (
            <CreateDeviceForm
              accessToken={accessToken}
              onCancel={() => setModal(null)}
              onSessionExpired={onLogout}
              onCreated={(createdDevice) => {
                setDevices((current) => [...current, createdDevice].sort((a, b) => a.id - b.id))
                setModal(null)
              }}
            />
          )}


          <div
            className="table-card"
            id="inventory-results-panel"
            role="tabpanel"
            aria-labelledby={`inventory-tab-${statusFilter.toLowerCase()}`}
          >
            {loading && (
              <div className="skeleton-block" role="status" aria-label="Cargando inventario">
                <span className="sr-only">Cargando inventario…</span>
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
                <div className="skeleton-row" aria-hidden="true" />
              </div>
            )}

            {!loading && error && devices.length === 0 && (
              <div className="empty-state-block">
                <p className="error" role="alert">{error}</p>
                <button type="button" onClick={retryLoad}>Reintentar</button>
              </div>
            )}

            {!loading && !error && (
              <>
                {refreshError && (
                  <div className="banner-error" role="alert">
                    <span>{refreshError}. Se muestran los datos anteriores.</span>
                    <button className="text-button" type="button" onClick={retryLoad}>Reintentar</button>
                  </div>
                )}

                {devices.length === 0 ? (
                  <div className="empty-state-block">
                    <p>Aún no hay dispositivos registrados.</p>
                    {canManageInventory && (
                      <button className="primary-action" type="button" onClick={() => setModal({ kind: 'create' })}>Registrar el primero</button>
                    )}
                  </div>
                ) : visibleDevices.length === 0 ? (
                  <div className="empty-state-block">
                    <p role="status">No encontramos dispositivos con esos filtros.</p>
                    <button className="secondary-button" type="button" onClick={() => changeStatusFilter('ALL')}>Ver todos</button>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <caption className="sr-only">Listado de dispositivos del inventario</caption>
                      <thead>
                        <tr>

                          <th scope="col" aria-sort={sortKey === 'code' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                            <SortButton label="Código" sortKey="code" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                          </th>
                          <th scope="col">Tipo</th>
                          <th scope="col">Marca y modelo</th>
                          <th scope="col" aria-sort={sortKey === 'location' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                            <SortButton label="Ubicación" sortKey="location" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                          </th>
                          <th scope="col" aria-sort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                            <SortButton label="Estado" sortKey="status" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                          </th>
                          {canManageInventory && <th scope="col">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedDevices.map((device) => (
                          <tr key={device.id}>
                            <td className="device-code">{device.code}</td>
                            <td>{typeLabels[device.type]}</td>
                            <td>{renderBrandModel(device)}</td>
                            <td>{device.location}</td>
                            <td><span className={`status status-${device.status.toLowerCase().replace('_', '-')}`}>{statusLabels[device.status]}</span></td>
                            {canManageInventory && (
                              <td>
                                <button className="table-action table-action-icon" type="button" aria-label={`Editar ${device.code}`} onClick={() => setModal({ kind: 'edit', device })}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.75 4.75L8 20l11.5-11.5a2.12 2.12 0 0 0-3-3L5 17Z" /><path d="m14.5 7.5 2 2" /></svg>
                                  <span className="sr-only">Editar {device.code}</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {visibleDevices.length > 0 && (
                  <footer className="table-footer">
                    <span>Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, visibleDevices.length)} de {visibleDevices.length} dispositivos</span>
                    <nav className="pagination" aria-label="Paginación del inventario">
                      <button className="pagination-button" type="button" disabled={activePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Anterior</button>
                      {pageNumbers.map((page, index) => page === 'ellipsis'
                        ? <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
                        : <button className={`pagination-button page-number${page === activePage ? ' active' : ''}`} type="button" key={page} aria-current={page === activePage ? 'page' : undefined} onClick={() => setCurrentPage(page)}>{page}</button>)}
                      <button className="pagination-button" type="button" disabled={activePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Siguiente</button>
                    </nav>
                  </footer>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
