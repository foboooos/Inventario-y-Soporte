import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getInventory, deleteInventoryDevice, type InventorySummary } from '../services/inventory'
import { isSessionExpired } from '../services/http'
import type { AuthUser } from '../types/auth'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import { TrashIcon } from './ActionIcons'
import { CreateDeviceForm } from './CreateDeviceForm'
import { EditDeviceForm } from './EditDeviceForm'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { TableSkeleton } from './Skeleton'
import { getPageNumbers } from '../utils/pagination'

type InventoryPageProps = {
  user: AuthUser
  accessToken: string
  onSessionExpired: () => void
}

type StatusFilter = 'ALL' | DeviceStatus
type Modal = { kind: 'create' } | { kind: 'edit'; device: Device } | null

const FILTERS_KEY = 'inventory-filters-v1'
const MIN_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 30
const SKELETON_ROW_HEIGHT = 34
const SKELETON_HEADER_HEIGHT = 30
const BOTTOM_SAFETY = 8
const CHROME_GAPS = 22
const CONTENT_PADDING = 20
const FALLBACK_ACTIONS = 44
const FALLBACK_SUMMARY = 64
const FALLBACK_TABS = 41
const INITIAL_PAGE_SIZE = 10
const NO_BRAND = 'Sin marca'
const NO_MODEL = 'Sin modelo'

const statusLabels: Record<DeviceStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  BAJA_TECNICA: 'Baja técnica',
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

export function InventoryPage({ user, accessToken, onSessionExpired }: InventoryPageProps) {
  const [initial] = useState<StoredFilters>(() => loadStoredFilters())

  const [devices, setDevices] = useState<Device[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<InventorySummary>({ total: 0, activo: 0, inactivo: 0, baja_tecnica: 0 })
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    pickFilter(initial.status, ['ALL', 'ACTIVO', 'INACTIVO', 'BAJA_TECNICA'] as const, 'ALL'),
  )
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState<Modal>(null)
  const [pendingDelete, setPendingDelete] = useState<Device | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE)
  const pageSizeRef = useRef(INITIAL_PAGE_SIZE)
  const hasDataRef = useRef(false)
  const actionsRef = useRef<HTMLDivElement | null>(null)
  const summaryRef = useRef<HTMLElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const tableScrollRef = useRef<HTMLDivElement | null>(null)
  const deleteModalRef = useRef<ModalHandle>(null)
  const baseRowHeightRef = useRef<number | null>(null)
  const statusTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const canManageInventory = user.rol === 'ADMIN' || user.rol === 'TECNICO'
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activePage = Math.min(currentPage, totalPages)

  useEffect(() => {
    let active = true

    getInventory(accessToken, {
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(statusFilter !== 'ALL' ? { estado: statusFilter } : {}),
      page: activePage,
      limit: pageSize,
      sortBy: 'code',
      sortDir: 'asc',
    })
      .then((result) => {
        if (!active) return
        hasDataRef.current = true
        setDevices(result.devices)
        setTotal(result.total)
        setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(result.total / pageSize))))
        setSummary(result.summary)
        setError('')
        setRefreshError('')
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
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
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, onSessionExpired, reloadKey, searchTerm, statusFilter, activePage, pageSize])

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setCurrentPage(1)
    }, 350)

    return () => clearTimeout(handle)
  }, [searchInput])


  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        status: statusFilter,
      }))
    } catch {
      return
    }
  }, [statusFilter])

  useEffect(() => {
    function computePageSize() {
      if (actionsRef.current && actionsRef.current.offsetHeight === 0) {
        return
      }

      if (!window.matchMedia('(max-width: 700px)').matches) {
        const scroll = tableScrollRef.current
        const table = scroll?.querySelector('table')
        const header = table?.querySelector('thead')?.getBoundingClientRect().height ?? 0

        if (scroll && table && !baseRowHeightRef.current) {
          const naturalRowHeight = table.querySelector('tbody tr')?.getBoundingClientRect().height ?? 0
          if (naturalRowHeight > 0) baseRowHeightRef.current = naturalRowHeight
        }

        const baseRowHeight = baseRowHeightRef.current
        if (scroll && table && baseRowHeight && baseRowHeight > 0) {
          const available = scroll.clientHeight - header
          const fit = Math.floor(available / baseRowHeight)
          const measured = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, fit))

          if (measured !== pageSizeRef.current) {
            pageSizeRef.current = measured
            setPageSize(measured)
            setCurrentPage(1)
          }
          setRowHeight(available > 0 ? available / measured : null)
          return
        }
      }

      setRowHeight(null);

      const chrome =
        (actionsRef.current?.offsetHeight ?? FALLBACK_ACTIONS) +
        (summaryRef.current?.offsetHeight ?? FALLBACK_SUMMARY) +
        (tabsRef.current?.offsetHeight ?? FALLBACK_TABS) +
        CHROME_GAPS +
        CONTENT_PADDING
      const rows = Math.floor((window.innerHeight - chrome - SKELETON_HEADER_HEIGHT - BOTTOM_SAFETY) / SKELETON_ROW_HEIGHT)
      const next = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, rows))

      if (next !== pageSizeRef.current) {
        pageSizeRef.current = next
        setPageSize(next)
        setCurrentPage(1)
      }
    }

    computePageSize()
    window.addEventListener('resize', computePageSize)

    const observer = new ResizeObserver(computePageSize)
    if (tableScrollRef.current) observer.observe(tableScrollRef.current)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', computePageSize)
    }
  }, [loading])

  function retryLoad() {
    setLoading(true)
    setError('')
    setRefreshError('')
    setReloadKey((key) => key + 1)
  }

  async function handleDeleteDevice(device: Device) {
    setDeleteError('')
    setDeleting(true)

    try {
      await deleteInventoryDevice(accessToken, device.id)
      deleteModalRef.current?.close(() => {
        setPendingDelete(null)
        setReloadKey((key) => key + 1)
      })
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setDeleteError(exception instanceof Error ? exception.message : 'No se pudo eliminar el dispositivo')
    } finally {
      setDeleting(false)
    }
  }

  const pageStart = (activePage - 1) * pageSize
  const pageNumbers = getPageNumbers(activePage, totalPages)
  const hasQuery = Boolean(searchTerm) || statusFilter !== 'ALL'

  function changeStatusFilter(nextStatus: StatusFilter) {
    setStatusFilter(nextStatus)
    setCurrentPage(1)
  }

  function clearQuery() {
    setSearchInput('')
    setSearchTerm('')
    setStatusFilter('ALL')
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
    <main className="inventory-shell">
      <section className="inventory-content" aria-label="Inventario">
    {canManageInventory && (
    <div className="inventory-actions" ref={actionsRef}>
      <button className="primary-action" type="button" onClick={() => setModal({ kind: 'create' })}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
        Nuevo dispositivo
      </button>
    </div>
  )}
  <section className="inventory-summary" aria-label="Resumen del inventario" ref={summaryRef}>
    <article className="inventory-summary-card" data-status="total">
      <span className="summary-label">Total</span>
      <strong className="summary-value">{summary.total}</strong>
    </article>
    <article className="inventory-summary-card" data-status="activo">
      <span className="summary-label">Activos</span>
      <strong className="summary-value">{summary.activo}</strong>
    </article>
    <article className="inventory-summary-card" data-status="inactivo">
      <span className="summary-label">Inactivos</span>
      <strong className="summary-value">{summary.inactivo}</strong>
    </article>
    <article className="inventory-summary-card" data-status="baja-tecnica">
      <span className="summary-label">Baja técnica</span>
      <strong className="summary-value">{summary.baja_tecnica}</strong>
    </article>
  </section>
  <div className="inventory-status-row">
  <div className="inventory-status-tabs" role="tablist" aria-label="Filtrar por estado" ref={tabsRef}>
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
  <label className="table-search inventory-search-desktop">
    <span className="sr-only">Buscar dispositivos</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    <input
      type="search"
      value={searchInput}
      onChange={(event) => setSearchInput(event.target.value)}
      placeholder="Buscar por código, marca, modelo o ubicación"
    />
  </label>
  </div>
{modal?.kind === 'edit' && canManageInventory && (
      <EditDeviceForm
        key={modal.device.id}
        accessToken={accessToken}
        device={modal.device}
        onCancel={() => setModal(null)}
        onSessionExpired={onSessionExpired}
        onUpdated={() => {
          setModal(null)
          setReloadKey((key) => key + 1)
        }}
      />
    )}
    {pendingDelete && (
      <Modal
        ref={deleteModalRef}
        role="alertdialog"
        label={`Eliminar ${pendingDelete.code}`}
        backdropClassName="device-modal-backdrop"
        cardClassName="create-device-card modal-card config-delete-modal"
        dismissible={!deleting}
        onClose={() => setPendingDelete(null)}
      >
        <div className="device-modal-body">
          <div className="device-delete-header">
            <span className="device-delete-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <div>
              <h2 className="config-dialog-title">Eliminar dispositivo</h2>
              <p className="config-dialog-text">
                ¿Eliminar este dispositivo? Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="device-delete-summary">
            <span className="device-delete-code">{pendingDelete.code}</span>
            <span>{typeLabels[pendingDelete.type]}</span>
            <span>{pendingDelete.brand} {pendingDelete.model}</span>
            <span>{pendingDelete.location}</span>
          </div>
          {deleteError && <p className="error" role="alert">{deleteError}</p>}
          <div className="device-form-actions device-delete-actions">
            <button className="secondary-button" type="button" onClick={() => deleteModalRef.current?.close()} disabled={deleting}>Cancelar</button>
            <button
              className="config-danger-button"
              type="button"
              disabled={deleting}
              onClick={() => { void handleDeleteDevice(pendingDelete) }}
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    )}
    {modal?.kind === 'create' && canManageInventory && (
      <CreateDeviceForm
        accessToken={accessToken}
        onCancel={() => setModal(null)}
        onSessionExpired={onSessionExpired}
        onCreated={() => {
          setModal(null)
          setReloadKey((key) => key + 1)
        }}
      />
    )}
  <div
    className="table-card"
    id="inventory-results-panel"
    role="tabpanel"
    aria-labelledby={`inventory-tab-${statusFilter.toLowerCase()}`}
  >
    <div className="table-toolbar">
      <label className="table-search">
        <span className="sr-only">Buscar dispositivos</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por código, marca, modelo o ubicación"
        />
      </label>
    </div>
    {loading && (
      <TableSkeleton
        label="Cargando inventario…"
        columns={['13%', '14%', '22%', '34%', '17%']}
        rows={pageSize}
      />
    )}
    {!loading && error && devices.length === 0 && (
      <div className="empty-state-block">
        <p className="error" role="alert">{error}</p>
        <button className="text-button" type="button" onClick={retryLoad}>Reintentar</button>
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
        {total === 0 ? (
          hasQuery ? (
            <div className="empty-state-block">
              <p role="status">No encontramos dispositivos con esos filtros.</p>
              <button className="secondary-button" type="button" onClick={clearQuery}>Limpiar filtros</button>
            </div>
          ) : (
            <div className="empty-state-block">
              <p>Aún no hay dispositivos registrados.</p>
              {canManageInventory && (
                <button className="primary-action" type="button" onClick={() => setModal({ kind: 'create' })}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
                  Nuevo dispositivo
                </button>
              )}
            </div>
          )
        ) : (
          <div className="table-scroll" ref={tableScrollRef}>
            <table>
              <caption className="sr-only">Listado de dispositivos del inventario</caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort="ascending">Código</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Marca y modelo</th>
                  <th scope="col">Ubicación</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} style={rowHeight ? { height: rowHeight } : undefined}>
                    <td className="device-code">
                      {canManageInventory ? (
                        <button className="device-code-button" type="button" aria-label={`Editar ${device.code}`} title={`Editar ${device.code}`} onClick={() => setModal({ kind: 'edit', device })}>
                          {device.code}
                        </button>
                      ) : (
                        device.code
                      )}
                    </td>
                    <td>{typeLabels[device.type]}</td>
                    <td>{renderBrandModel(device)}</td>
                    <td>{device.location}</td>
                    <td><div className="inventory-row-actions">
                      <span className={`status status-${device.status.toLowerCase().replace('_', '-')}`}>{statusLabels[device.status]}</span>
                      {canManageInventory && (
                        <button
                          className="inventory-row-delete"
                          type="button"
                          aria-label={`Eliminar ${device.code}`}
                          title="Eliminar"
                          onClick={() => {
                            setDeleteError('')
                            setPendingDelete(device)
                          }}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <footer className="table-footer">
            <span>Mostrando {pageStart + 1}–{Math.min(pageStart + pageSize, total)} de {total} dispositivos</span>
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
  )
}
