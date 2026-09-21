import { useEffect, useMemo, useRef, useState } from 'react'
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

type TypeFilter = 'ALL' | DeviceType
type StatusFilter = 'ALL' | DeviceStatus
type SortKey = 'code' | 'location' | 'status'
type SortDir = 'asc' | 'desc'
type Modal = { kind: 'create' } | { kind: 'edit'; device: Device } | null

const FILTERS_KEY = 'inventory-filters-v1'
const SEARCH_DEBOUNCE_MS = 180
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

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PC', label: 'PC' },
  { value: 'PROYECTOR', label: 'Proyectores' },
  { value: 'IMPRESORA', label: 'Impresoras' },
  { value: 'RED', label: 'Equipos de red' },
]

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
  { value: 'BAJA_TECNICA', label: 'Baja técnica' },
]

type StoredFilters = {
  q?: unknown
  type?: unknown
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
  const [searchInput, setSearchInput] = useState(typeof initial.q === 'string' ? initial.q : '')
  const [search, setSearch] = useState(typeof initial.q === 'string' ? initial.q : '')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    pickFilter(initial.type, ['ALL', 'PC', 'PROYECTOR', 'IMPRESORA', 'RED'] as const, 'ALL'),
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    pickFilter(initial.status, ['ALL', 'ACTIVO', 'INACTIVO', 'BAJA_TECNICA'] as const, 'ALL'),
  )
  const [sortKey, setSortKey] = useState<SortKey>(
    pickFilter(initial.sortKey, ['code', 'location', 'status'] as const, 'code'),
  )
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir === 'desc' ? 'desc' : 'asc')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState<Modal>(null)
  const hasDataRef = useRef(false)
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
          setRefreshing(false)
        }
      })

    return () => {
      active = false
    }
  }, [accessToken, onLogout, reloadKey])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        q: searchInput,
        type: typeFilter,
        status: statusFilter,
        sortKey,
        sortDir,
      }))
    } catch {
      return
    }
  }, [searchInput, typeFilter, statusFilter, sortKey, sortDir])

  function retryLoad() {
    setError('')
    setRefreshError('')
    setRefreshing(true)
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
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = devices.filter((device) => {
      const haystack = [
        device.code,
        device.location,
        typeLabels[device.type],
        ...(device.brand !== NO_BRAND ? [device.brand] : []),
        ...(device.model !== NO_MODEL ? [device.model] : []),
      ]
      const matchesSearch = !normalizedSearch || haystack.some((value) => value.toLowerCase().includes(normalizedSearch))
      const matchesType = typeFilter === 'ALL' || device.type === typeFilter
      const matchesStatus = statusFilter === 'ALL' || device.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'location') return a.location.localeCompare(b.location, 'es') * dir
      if (sortKey === 'status') return (statusOrder[a.status] - statusOrder[b.status]) * dir
      return a.code.localeCompare(b.code, 'es', { numeric: true }) * dir
    })
  }, [devices, search, typeFilter, statusFilter, sortKey, sortDir])

  const hasActiveFilters = searchInput.trim() !== '' || typeFilter !== 'ALL' || statusFilter !== 'ALL'

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setTypeFilter('ALL')
    setStatusFilter('ALL')
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
        <section className="inventory-content" aria-labelledby="inventory-title">
          <div className="page-heading">
            <div>
              <span className="eyebrow">Administración</span>
              <h1 id="inventory-title">Inventario</h1>
              <p className="subtitle">Gestiona los dispositivos de la institución: registra, edita y filtra por ubicación o estado.</p>
            </div>
            <div className="heading-actions">
              {canManageInventory && (
                <button className="primary-action" type="button" onClick={() => setModal({ kind: 'create' })}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
                  Nuevo dispositivo
                </button>
              )}
            </div>
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

          <div className="inventory-toolbar">
            <label className="search-field" htmlFor="inventory-search">
              <span>Buscar</span>
              <input id="inventory-search" type="search" placeholder="Código, marca o ubicación" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </label>
            <label htmlFor="inventory-type-filter">
              <span>Tipo</span>
              <select id="inventory-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
                {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor="inventory-status-filter">
              <span>Estado</span>
              <select id="inventory-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {hasActiveFilters && (
              <button className="text-button" type="button" onClick={clearFilters}>Limpiar filtros</button>
            )}
          </div>

          <div className="table-card">
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
                <p className="toolbar-result" role="status" aria-live="polite">
                  <strong>{visibleDevices.length}</strong> de {devices.length} dispositivos
                  {refreshing && <span> · Actualizando…</span>}
                </p>
                {devices.length === 0 ? (
                  <div className="empty-state-block">
                    <p>Aún no hay dispositivos registrados.</p>
                    {canManageInventory && (
                      <button type="button" onClick={() => setModal({ kind: 'create' })}>Registrar el primero</button>
                    )}
                  </div>
                ) : visibleDevices.length === 0 ? (
                  <div className="empty-state-block">
                    <p role="status">No encontramos dispositivos con esos filtros.</p>
                    <button className="secondary-button" type="button" onClick={clearFilters}>Limpiar filtros</button>
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
                        {visibleDevices.map((device) => (
                          <tr key={device.id}>
                            <td className="device-code">{device.code}</td>
                            <td>{typeLabels[device.type]}</td>
                            <td>{renderBrandModel(device)}</td>
                            <td>{device.location}</td>
                            <td><span className={`status status-${device.status.toLowerCase().replace('_', '-')}`}>{statusLabels[device.status]}</span></td>
                            {canManageInventory && (
                              <td>
                                <button className="table-action" type="button" aria-label={`Editar ${device.code}`} onClick={() => setModal({ kind: 'edit', device })}>
                                  Editar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
