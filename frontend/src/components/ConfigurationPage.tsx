import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createLocation, getLocations, renameLocation } from '../services/locations'
import { isSessionExpired } from '../services/http'
import { getUsers, deleteUser } from '../services/users'
import type { Location, LocationType } from '../types/location'
import type { User, UserRole } from '../types/user'
import { downloadUsersPdf } from '../utils/usersPdf'
import { getPageNumbers } from '../utils/pagination'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { SelectMenu } from './SelectMenu'
import { ListSkeleton, TableSkeleton } from './Skeleton'
import { CreateUserForm } from './CreateUserForm'
import { EditUserForm } from './EditUserForm'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { RoleIcon } from './RoleIcon'
import { useCustomScrollbar } from '../utils/useCustomScrollbar'
import { configSectionPaths, type ConfigSection } from '../routes'

const USERS_PAGE_SIZE = 10
const MIN_USERS_PAGE_SIZE = 5
const MAX_USERS_PAGE_SIZE = 30

type ConfigurationPageProps = {
  accessToken: string
  currentUserRut: string
  onSessionExpired: () => void
  section: ConfigSection | null
  onNavigate: (path: string) => void
}

const roleOptions = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'DOCENTE', label: 'Docente' },
]

const locationTypeLabels: Record<LocationType, string> = {
  PRINCIPAL: 'Principal',
  SECUNDARIA: 'Secundaria',
  TERCIARIA: 'Terciaria',
}

const locationTypeOrder: Record<LocationType, number> = {
  PRINCIPAL: 0,
  SECUNDARIA: 1,
  TERCIARIA: 2,
}

const locationTypeOptions = (Object.keys(locationTypeLabels) as LocationType[]).map((value) => ({
  value,
  label: locationTypeLabels[value],
}))

const locationFilterOptions = [
  { value: 'ALL', label: 'Todas' },
  ...locationTypeOptions,
]

export function ConfigurationPage({ accessToken, currentUserRut, onSessionExpired, section, onNavigate }: ConfigurationPageProps) {
  const [createdUser, setCreatedUser] = useState<{ nombre: string; password: string } | null>(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [deletingRut, setDeletingRut] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [usersSort, setUsersSort] = useState<'asc' | 'desc'>('asc')
  const [usersSearch, setUsersSearch] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersPageSize, setUsersPageSize] = useState(USERS_PAGE_SIZE)
  const [selectedRuts, setSelectedRuts] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [locations, setLocations] = useState<Location[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState('')
  const locationsScrollbarKey = `${locations.length}:${locationsLoading}`
  const {
    scrollRef: locationsListRef,
    thumbRef: locationsThumbRef,
    barRef: locationsScrollbarRef,
    handlePointerDown: handleLocationsScrollbarPointerDown,
  } = useCustomScrollbar<HTMLUListElement>(locationsScrollbarKey)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationSigla, setNewLocationSigla] = useState('')
  const [newLocationTipo, setNewLocationTipo] = useState<LocationType>('PRINCIPAL')
  const [locationFilter, setLocationFilter] = useState<LocationType | 'ALL'>('ALL')
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [addLocationOpen, setAddLocationOpen] = useState(false)
  const [createLocationError, setCreateLocationError] = useState('')
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editLocationName, setEditLocationName] = useState('')
  const [editLocationSigla, setEditLocationSigla] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationEditError, setLocationEditError] = useState('')
  const usersTableScrollRef = useRef<HTMLDivElement>(null)
  const locationModalRef = useRef<ModalHandle>(null)
  const addLocationModalRef = useRef<ModalHandle>(null)
  const deleteModalRef = useRef<ModalHandle>(null)
  const bulkDeleteModalRef = useRef<ModalHandle>(null)

  useEffect(() => {
    let active = true

    getLocations(accessToken)
      .then((loaded) => {
        if (active) setLocations(loaded)
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setLocationsError(exception instanceof Error ? exception.message : 'No se pudieron cargar las ubicaciones')
      })
      .finally(() => {
        if (active) setLocationsLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, onSessionExpired])

  useEffect(() => {
    let active = true

    getUsers(accessToken)
      .then((loaded) => {
        if (active) setUsers(loaded)
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setUsersError(exception instanceof Error ? exception.message : 'No se pudieron cargar los usuarios')
      })
      .finally(() => {
        if (active) setUsersLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, onSessionExpired])

  useEffect(() => {
    const scroll = usersTableScrollRef.current
    if (!scroll || usersLoading) return

    const scrollElement = scroll

    function measure() {
      const table = scrollElement.querySelector('table')

      table?.style.removeProperty('--config-users-row-height')

      const header = table?.querySelector('thead')?.getBoundingClientRect().height ?? 0
      const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : []
      const rowHeight = rows.reduce((max, row) => Math.max(max, row.getBoundingClientRect().height), 0)

      if (rowHeight <= 0) return

      const available = scrollElement.clientHeight - header

      if (available <= 0) return

      const fit = Math.floor(available / rowHeight)
      const next = Math.min(MAX_USERS_PAGE_SIZE, Math.max(MIN_USERS_PAGE_SIZE, fit))

      table?.classList.toggle('is-partial', rows.length < next)

      setUsersPageSize((current) => (current === next ? current : next))

      if (table) {
        const target = Math.max(rowHeight, (available - 2) / next)
        table.style.setProperty('--config-users-row-height', `${target}px`)
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scrollElement)

    return () => observer.disconnect()
  }, [usersLoading, users, usersSearch, usersSort, usersPage, usersPageSize])

  useEffect(() => {
    if (!createdUser) return
    const timer = window.setTimeout(() => setCreatedUser(null), 6000)
    return () => window.clearTimeout(timer)
  }, [createdUser])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 701px)')

    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) window.scrollTo(0, 0)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) =>
      locationTypeOrder[a.tipo] - locationTypeOrder[b.tipo]
      || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [locations],
  )

  const visibleLocations = useMemo(
    () => locationFilter === 'ALL'
      ? sortedLocations
      : sortedLocations.filter((location) => location.tipo === locationFilter),
    [sortedLocations, locationFilter],
  )

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => {
      const comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      return usersSort === 'asc' ? comparison : -comparison
    }),
    [users, usersSort],
  )

  const filteredUsers = useMemo(() => {
    const term = usersSearch.trim().toLowerCase()
    if (!term) return sortedUsers
    return sortedUsers.filter((user) =>
      user.nombre.toLowerCase().includes(term)
      || user.rut.toLowerCase().includes(term)
      || user.email.toLowerCase().includes(term))
  }, [sortedUsers, usersSearch])

  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPageSize))
  const activeUsersPage = Math.min(usersPage, usersTotalPages)
  const usersStart = (activeUsersPage - 1) * usersPageSize
  const visibleUsers = filteredUsers.slice(usersStart, usersStart + usersPageSize)
  const usersPageNumbers = getPageNumbers(activeUsersPage, usersTotalPages)

  function toggleUserSelected(rut: string) {
    setSelectedRuts((current) => {
      const next = new Set(current)
      if (next.has(rut)) next.delete(rut)
      else next.add(rut)
      return next
    })
  }

  function selectPageUsers() {
    setSelectedRuts((current) => {
      const next = new Set(current)
      visibleUsers.forEach((user) => next.add(user.rut))
      return next
    })
  }

  async function handleBulkDelete() {
    const targets = users.filter((user) => selectedRuts.has(user.rut))
    if (targets.length === 0) return

    setDeletingBulk(true)
    setUsersError('')
    const deleted: string[] = []
    const failed: string[] = []

    for (const user of targets) {
      try {
        await deleteUser(accessToken, user.rut)
        deleted.push(user.rut)
      } catch (exception) {
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        failed.push(exception instanceof Error ? exception.message : `No se pudo eliminar a ${user.nombre}`)
      }
    }

    if (deleted.length > 0) {
      const remaining = users.filter((user) => !deleted.includes(user.rut))
      setUsers(remaining)
      setSelectedRuts((current) => {
        const next = new Set(current)
        deleted.forEach((rut) => next.delete(rut))
        return next
      })
      setUsersPage((page) => Math.min(page, Math.max(1, Math.ceil(remaining.length / usersPageSize))))
    }

    if (failed.length > 0) {
      setUsersError(`${failed.length} usuario(s) no se pudieron eliminar: ${failed[0]}`)
    } else {
      bulkDeleteModalRef.current?.close()
    }

    setDeletingBulk(false)
  }

  async function handleDeleteUser(user: User) {
    setDeletingRut(user.rut)
    setUsersError('')

    try {
      await deleteUser(accessToken, user.rut)
      const remaining = users.filter((item) => item.rut !== user.rut)
      setUsers(remaining)
      setUsersPage((page) => Math.min(page, Math.max(1, Math.ceil(remaining.length / usersPageSize))))
      deleteModalRef.current?.close()
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setUsersError(exception instanceof Error ? exception.message : 'No se pudo eliminar el usuario')
    } finally {
      setDeletingRut(null)
    }
  }

  async function handleCreateLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = newLocationName.trim()
    const sigla = newLocationSigla.trim().toUpperCase()
    if (!nombre || !sigla) return

    setCreatingLocation(true)
    setCreateLocationError('')

    try {
      const created = await createLocation(accessToken, {
        nombre,
        sigla,
        tipo: newLocationTipo,
      })
      setLocations((current) => [...current, created])
      setLocationFilter(created.tipo)
      setNewLocationName('')
      setNewLocationSigla('')
      addLocationModalRef.current?.close()
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setCreateLocationError(exception instanceof Error ? exception.message : 'No se pudo crear la ubicación')
    } finally {
      setCreatingLocation(false)
    }
  }

  function closeAddLocationModal() {
    setAddLocationOpen(false)
    setCreateLocationError('')
    setNewLocationName('')
    setNewLocationSigla('')
    setNewLocationTipo('PRINCIPAL')
  }

  function startEditLocation(location: Location) {
    setEditingLocation(location)
    setEditLocationName(location.nombre)
    setEditLocationSigla(location.sigla ?? '')
    setLocationEditError('')
  }

  async function handleRenameLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingLocation) return
    const nombre = editLocationName.trim()
    if (!nombre) return

    const isCourse = editingLocation.padreId !== null
    const sigla = editLocationSigla.trim().toUpperCase()
    if (!isCourse && !sigla) return

    setSavingLocation(true)
    setLocationEditError('')

    try {
      const updated = await renameLocation(
        accessToken,
        editingLocation.id,
        isCourse ? { nombre } : { nombre, sigla },
      )
      setLocations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      locationModalRef.current?.close()
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setLocationEditError(exception instanceof Error ? exception.message : 'No se pudo actualizar la ubicación')
    } finally {
      setSavingLocation(false)
    }
  }

  function locationTypeLabel(location: Location) {
    return locationTypeLabels[location.tipo] ?? locationTypeLabels.PRINCIPAL
  }

  function roleLabel(role: UserRole) {
    return roleOptions.find((option) => option.value === role)?.label ?? role
  }

  return (
    <main className="support-shell config-shell">
      <section className={`support-content configuration-content${section ? ` is-${section}` : ''}`} aria-label="Configuración">
        {!section && (
          <nav className="config-mobile-nav" aria-label="Secciones de configuración">
            <button className="secondary-button" type="button" onClick={() => onNavigate(configSectionPaths.users)}>
              Usuarios
            </button>
            <button className="secondary-button" type="button" onClick={() => onNavigate(configSectionPaths.locations)}>
              Ubicaciones
            </button>
          </nav>
        )}

        {(!section || section === 'users') && (
        <section className="support-card config-card config-users-card" aria-label="Usuarios">
          <div className="config-card-body">
          <div className="config-users-head">
            <div className="config-users-actions">
              <button
                className="primary-action config-users-create"
                type="button"
                onClick={() => {
                  setCreatedUser(null)
                  setCreateUserOpen(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
                Crear
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => { void downloadUsersPdf(sortedUsers) }}
                disabled={usersLoading || sortedUsers.length === 0}
              >
                Descargar PDF
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={selectPageUsers}
                disabled={usersLoading || visibleUsers.length === 0}
              >
                Seleccionar página
              </button>
              {selectedRuts.size > 0 && (
                <button
                  className="config-danger-button config-users-bulk-delete"
                  type="button"
                  onClick={() => {
                    setUsersError('')
                    setBulkDeleteOpen(true)
                  }}
                >
                  Borrar seleccionados
                </button>
              )}
            </div>
          </div>

          <label className="table-search config-users-search">
            <span className="sr-only">Buscar usuarios</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="search"
              value={usersSearch}
              onChange={(event) => {
                setUsersSearch(event.target.value)
                setUsersPage(1)
              }}
              placeholder="Buscar por nombre, RUT o email"
            />
          </label>

          {usersError && <p className="subjects-state" role="alert">{usersError}</p>}
          {usersLoading && (
            <TableSkeleton
              label="Cargando usuarios…"
              columns={['24%', '42%', '12%', '22%']}
              rows={12}
              className="config-users-skeleton"
            />
          )}
          {!usersLoading && users.length === 0 && (
            <p className="subjects-state" role="status">Aún no hay usuarios registrados.</p>
          )}
          {!usersLoading && users.length > 0 && filteredUsers.length === 0 && (
            <p className="subjects-state" role="status">No hay usuarios que coincidan con la búsqueda.</p>
          )}
          {!usersLoading && filteredUsers.length > 0 && (
            <>
            <div className="config-users-table-scroll" ref={usersTableScrollRef}>
              <table className="config-users-table">
                <thead>
                  <tr>
                    <th scope="col">RUT</th>
                    <th scope="col" aria-sort={usersSort === 'asc' ? 'ascending' : 'descending'}>
                      <span className="config-users-sort-head">
                        Nombre
                        <button
                          className="config-users-sort-button"
                          type="button"
                          onClick={() => setUsersSort((current) => (current === 'asc' ? 'desc' : 'asc'))}
                          aria-label={usersSort === 'asc'
                            ? 'Orden por nombre: A-Z. Cambiar a Z-A'
                            : 'Orden por nombre: Z-A. Cambiar a A-Z'}
                          title={usersSort === 'asc' ? 'Cambiar a Z-A' : 'Cambiar a A-Z'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d={usersSort === 'asc' ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'} />
                          </svg>
                        </button>
                      </span>
                    </th>
                    <th scope="col">Rol</th>
                    <th scope="col"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr
                      key={user.rut}
                      className={selectedRuts.has(user.rut) ? 'is-selected' : undefined}
                      tabIndex={0}
                      onClick={() => toggleUserSelected(user.rut)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleUserSelected(user.rut)
                        }
                      }}
                    >
                      <td className="config-user-rut" title={user.rut}>{user.rut}</td>
                      <td>
                        <span className="config-user-name-cell">
                          <span className="config-user-name" title={user.nombre}>{user.nombre}</span>
                          <span className="config-user-mail" title={user.email}>{user.email}</span>
                        </span>
                      </td>
                      <td className="config-users-role-cell">
                        <span className="config-users-role" title={roleLabel(user.rol)}>
                          <RoleIcon role={user.rol} />
                          <span className="sr-only">{roleLabel(user.rol)}</span>
                        </span>
                      </td>
                      <td className="config-users-actions-cell">
                        <button
                          className="subjects-icon-button"
                          type="button"
                          aria-label={`Editar ${user.nombre}`}
                          title="Editar"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditingUser(user)
                          }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          className="subjects-icon-button subjects-icon-button-danger"
                          type="button"
                          aria-label={`Eliminar ${user.nombre}`}
                          title="Eliminar"
                          onClick={(event) => {
                            event.stopPropagation()
                            setUsersError('')
                            setPendingDelete(user)
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="table-footer config-users-footer">
              <span>
                Mostrando {usersStart + 1}–{Math.min(usersStart + usersPageSize, filteredUsers.length)} de {filteredUsers.length} usuarios
              </span>
              <nav className="pagination" aria-label="Paginación de usuarios">
                <button className="pagination-button" type="button" disabled={activeUsersPage === 1} onClick={() => setUsersPage((page) => Math.max(1, page - 1))}>Anterior</button>
                {usersPageNumbers.map((page, index) => page === 'ellipsis'
                  ? <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
                  : <button className={`pagination-button page-number${page === activeUsersPage ? ' active' : ''}`} type="button" key={page} aria-current={page === activeUsersPage ? 'page' : undefined} onClick={() => setUsersPage(page)}>{page}</button>)}
                <button className="pagination-button" type="button" disabled={activeUsersPage === usersTotalPages} onClick={() => setUsersPage((page) => Math.min(usersTotalPages, page + 1))}>Siguiente</button>
              </nav>
            </footer>
            </>
          )}
          </div>
        </section>
        )}

        {(!section || section === 'locations') && (
        <section className="support-card config-card config-locations-card" aria-label="Ubicaciones">
          <div className="config-card-body">
          <div className="config-locations-head">
            <div className="config-locations-actions">
              <button
                className="primary-action primary-action-solid"
                type="button"
                onClick={() => {
                  setCreateLocationError('')
                  setAddLocationOpen(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
                Crear
              </button>
              <SelectMenu
                id="config-location-filter"
                ariaLabel="Filtrar ubicaciones por tipo"
                value={locationFilter}
                onChange={(next) => setLocationFilter(next as LocationType | 'ALL')}
                options={locationFilterOptions}
                visibleItems={4}
                fixedList
              />
            </div>
          </div>

          {locationsError && (
            <div className="banner-error" role="alert">
              <span>{locationsError}</span>
              <button className="text-button" type="button" onClick={() => setLocationsError('')}>Cerrar</button>
            </div>
          )}

          {locationsLoading && <ListSkeleton label="Cargando ubicaciones…" rows={24} />}

          {!locationsLoading && locations.length === 0 && (
            <p className="subjects-state" role="status">Aún no hay ubicaciones registradas.</p>
          )}

          {!locationsLoading && locations.length > 0 && visibleLocations.length === 0 && (
            <div className="empty-state-block" role="status">
              <p>No hay ubicaciones de tipo {locationTypeLabels[locationFilter as LocationType]}.</p>
              <button className="secondary-button" type="button" onClick={() => setLocationFilter('ALL')}>
                Ver todas
              </button>
            </div>
          )}

          {!locationsLoading && locations.length > 0 && (
            <div className="list-scroll">
              <ul className="subjects-list" ref={locationsListRef}>
                {visibleLocations.map((location) => (
                  <li className="subjects-item subjects-item-block" key={location.id}>
                    <div className="subjects-subject-info">
                      <span className="subjects-name">{location.nombre}</span>
                      <span className="config-location-parent">
                        {location.sigla ? `${locationTypeLabel(location)} · ${location.sigla}` : locationTypeLabel(location)}
                      </span>
                    </div>
                    <div className="subjects-actions">
                      <button
                        className="subjects-icon-button"
                        type="button"
                        aria-label={`Editar ${location.nombre}`}
                        title="Editar"
                        onClick={() => startEditLocation(location)}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div
                className="list-scrollbar"
                aria-hidden="true"
                ref={locationsScrollbarRef}
                onPointerDown={handleLocationsScrollbarPointerDown}
              >
                <span className="list-scrollbar-thumb" ref={locationsThumbRef} />
              </div>
            </div>
          )}
          </div>
        </section>
        )}
      </section>

      {editingLocation && (
        <Modal
          ref={locationModalRef}
          label={`Editar ${editingLocation.nombre}`}
          cardClassName="create-device-card modal-card config-location-modal"
          dismissible={!savingLocation}
          onClose={() => setEditingLocation(null)}
        >
            <div className="device-modal-body">
              <h2 className="config-dialog-title">Editar ubicación</h2>
              <form className="device-form" onSubmit={handleRenameLocation}>
                <label className="device-form-wide">
                  <span>Nombre</span>
                  <input
                    value={editLocationName}
                    onChange={(event) => setEditLocationName(event.target.value)}
                    maxLength={100}
                    required
                    aria-label={`Nuevo nombre para ${editingLocation.nombre}`}
                  />
                </label>
                {editingLocation.padreId === null && (
                  <label className="device-form-wide">
                    <span>Sigla</span>
                    <input
                      value={editLocationSigla}
                      onChange={(event) => setEditLocationSigla(event.target.value.toUpperCase())}
                      maxLength={3}
                      pattern="[A-Za-z0-9]{1,3}"
                      title="Sigla de hasta 3 letras o números"
                      required
                      aria-label={`Sigla de ${editingLocation.nombre}`}
                    />
                  </label>
                )}
                {locationEditError && <p className="error device-form-wide" role="alert">{locationEditError}</p>}
                <div className="device-form-actions device-form-wide">
                  <button className="secondary-button" type="button" onClick={() => locationModalRef.current?.close()} disabled={savingLocation}>
                    Cancelar
                  </button>
                  <button
                    className="primary-action primary-action-solid"
                    type="submit"
                    disabled={savingLocation || !editLocationName.trim() || (editingLocation.padreId === null && !editLocationSigla.trim())}
                  >
                    {savingLocation ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
        </Modal>
      )}

      {addLocationOpen && (
        <Modal
          ref={addLocationModalRef}
          label="Agregar ubicación"
          cardClassName="create-device-card modal-card config-location-modal"
          dismissible={!creatingLocation}
          onClose={closeAddLocationModal}
        >
          <div className="device-modal-body">
            <form className="device-form config-location-create-form" onSubmit={handleCreateLocation}>
              <label>
                <span>Nombre</span>
                <input
                  value={newLocationName}
                  onChange={(event) => setNewLocationName(event.target.value)}
                  placeholder="Ej: Lab. Computación 1"
                  maxLength={100}
                  required
                />
              </label>
              <label>
                <span>Sigla</span>
                <input
                  value={newLocationSigla}
                  onChange={(event) => setNewLocationSigla(event.target.value.toUpperCase())}
                  placeholder="LC1"
                  maxLength={3}
                  pattern="[A-Za-z0-9]{1,3}"
                  title="Sigla de hasta 3 letras o números"
                  required
                />
              </label>
              <div className="device-field device-form-wide">
                <span>Tipo de ubicación</span>
                <SelectMenu
                  id="config-location-type"
                  ariaLabel="Tipo de ubicación"
                  value={newLocationTipo}
                  onChange={(next) => setNewLocationTipo(next as LocationType)}
                  options={locationTypeOptions}
                  visibleItems={3}
                  fixedList
                />
              </div>
              {createLocationError && <p className="error device-form-wide" role="alert">{createLocationError}</p>}
              <div className="device-form-actions device-form-wide">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => addLocationModalRef.current?.close()}
                  disabled={creatingLocation}
                >
                  Cancelar
                </button>
                <button
                  className="primary-action primary-action-solid"
                  type="submit"
                  disabled={creatingLocation || !newLocationName.trim() || !newLocationSigla.trim()}
                >
                  {creatingLocation ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <Modal
          ref={deleteModalRef}
          role="alertdialog"
          label={`Eliminar a ${pendingDelete.nombre}`}
          cardClassName="create-device-card modal-card config-delete-modal"
          dismissible={deletingRut === null}
          onClose={() => setPendingDelete(null)}
        >
            <div className="device-modal-body">
              <h2 className="config-dialog-title">Eliminar usuario</h2>
              <p className="config-dialog-text">
                ¿Eliminar a <strong>{pendingDelete.nombre}</strong>? Esta acción no se puede deshacer.
              </p>
              {usersError && <p className="error" role="alert">{usersError}</p>}
              <div className="device-form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={deletingRut !== null}
                  onClick={() => deleteModalRef.current?.close()}
                >
                  Cancelar
                </button>
                <button
                  className="config-danger-button"
                  type="button"
                  disabled={deletingRut !== null}
                  onClick={() => { void handleDeleteUser(pendingDelete) }}
                >
                  {deletingRut ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
        </Modal>
      )}

      {bulkDeleteOpen && (
        <Modal
          ref={bulkDeleteModalRef}
          role="alertdialog"
          label="Eliminar usuarios seleccionados"
          cardClassName="create-device-card modal-card config-delete-modal"
          dismissible={!deletingBulk}
          onClose={() => setBulkDeleteOpen(false)}
        >
          <div className="device-modal-body">
            <h2 className="config-dialog-title">Eliminar usuarios</h2>
            <p className="config-dialog-text">
              ¿Eliminar {selectedRuts.size} usuario(s) seleccionados? Esta acción no se puede deshacer.
            </p>
            {usersError && <p className="error" role="alert">{usersError}</p>}
            <div className="device-form-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={deletingBulk}
                onClick={() => bulkDeleteModalRef.current?.close()}
              >
                Cancelar
              </button>
              <button
                className="config-danger-button"
                type="button"
                disabled={deletingBulk}
                onClick={() => { void handleBulkDelete() }}
              >
                {deletingBulk ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingUser && (
        <EditUserForm
          key={editingUser.rut}
          accessToken={accessToken}
          user={editingUser}
          isSelf={editingUser.rut === currentUserRut}
          onCancel={() => setEditingUser(null)}
          onSessionExpired={onSessionExpired}
          onUpdated={(updated) => {
            setUsers((current) => current.map((item) => (item.rut === updated.rut ? {
              ...item,
              ...updated,
              fecha_nacimiento_configurada: item.fecha_nacimiento_configurada || updated.fecha_nacimiento_configurada,
            } : item)))
            setEditingUser(null)
          }}
        />
      )}

      {createUserOpen && (
        <CreateUserForm
          accessToken={accessToken}
          onClose={() => setCreateUserOpen(false)}
          onSessionExpired={onSessionExpired}
          onCreated={(created) => {
            setUsers((current) => [...current, created])
            setUsersSearch('')
            setUsersPage(1)
            setCreatedUser({ nombre: created.nombre, password: created.rut.replace(/\./g, '') })
            setCreateUserOpen(false)
          }}
        />
      )}

      {createdUser && (
        <div className="config-toast" role="status">
          <span className="config-toast-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m20 6-9 9-5-5" /></svg>
          </span>
          <div className="config-toast-body">
            <span className="config-toast-title">Usuario creado</span>
            <span className="config-toast-name">{createdUser.nombre}</span>
            <span className="config-toast-meta">
              Contraseña inicial <code>{createdUser.password}</code>
            </span>
          </div>
          <button
            className="config-toast-close"
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setCreatedUser(null)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </main>
  )
}
