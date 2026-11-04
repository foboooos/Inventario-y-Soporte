import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, TransitionEvent } from 'react'
import { createLocation, getLocations, renameLocation } from '../services/locations'
import { isSessionExpired } from '../services/http'
import { getUsers, deleteUser } from '../services/users'
import type { Location, LocationType } from '../types/location'
import type { User, UserRole } from '../types/user'
import { downloadUsersPdf } from '../utils/usersPdf'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { SelectMenu } from './SelectMenu'
import { ListSkeleton, TableSkeleton } from './Skeleton'
import { CreateUserForm } from './CreateUserForm'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { RoleIcon } from './RoleIcon'

type ConfigurationPageProps = {
  accessToken: string
  onSessionExpired: () => void
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

function prepareCardToggle(body: HTMLDivElement | null, willExpand: boolean) {
  if (!body || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  if (willExpand) {
    body.style.maxHeight = `${body.scrollHeight}px`
    return
  }

  body.style.transition = 'none'
  body.style.maxHeight = `${body.scrollHeight}px`
  void body.offsetHeight
  body.style.transition = ''
}

function handleCardTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget || event.propertyName !== 'max-height') return
  event.currentTarget.style.removeProperty('max-height')
}

export function ConfigurationPage({ accessToken, onSessionExpired }: ConfigurationPageProps) {
  const [createdUser, setCreatedUser] = useState<{ nombre: string; password: string } | null>(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [deletingRut, setDeletingRut] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [usersExpanded, setUsersExpanded] = useState(false)
  const [locationsExpanded, setLocationsExpanded] = useState(false)
  const [usersSort, setUsersSort] = useState<'asc' | 'desc'>('asc')

  const [locations, setLocations] = useState<Location[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationSigla, setNewLocationSigla] = useState('')
  const [newLocationTipo, setNewLocationTipo] = useState<LocationType | 'ALL'>('ALL')
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editLocationName, setEditLocationName] = useState('')
  const [editLocationSigla, setEditLocationSigla] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationEditError, setLocationEditError] = useState('')
  const usersCardBodyRef = useRef<HTMLDivElement>(null)
  const locationsCardBodyRef = useRef<HTMLDivElement>(null)
  const locationModalRef = useRef<ModalHandle>(null)
  const deleteModalRef = useRef<ModalHandle>(null)

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

  useLayoutEffect(() => {
    if (!usersExpanded) usersCardBodyRef.current?.style.removeProperty('max-height')
  }, [usersExpanded])

  useLayoutEffect(() => {
    if (!locationsExpanded) locationsCardBodyRef.current?.style.removeProperty('max-height')
  }, [locationsExpanded])

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) =>
      locationTypeOrder[a.tipo] - locationTypeOrder[b.tipo]
      || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [locations],
  )

  const visibleLocations = useMemo(
    () => newLocationTipo === 'ALL'
      ? sortedLocations
      : sortedLocations.filter((location) => location.tipo === newLocationTipo),
    [sortedLocations, newLocationTipo],
  )

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => {
      const comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      return usersSort === 'asc' ? comparison : -comparison
    }),
    [users, usersSort],
  )

  async function handleDeleteUser(user: User) {
    setDeletingRut(user.rut)
    setUsersError('')

    try {
      await deleteUser(accessToken, user.rut)
      setUsers((current) => current.filter((item) => item.rut !== user.rut))
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
    if (!nombre || !sigla || newLocationTipo === 'ALL') return

    setCreatingLocation(true)
    setLocationsError('')

    try {
      const created = await createLocation(accessToken, {
        nombre,
        sigla,
        tipo: newLocationTipo,
      })
      setLocations((current) => [...current, created])
      setNewLocationName('')
      setNewLocationSigla('')
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setLocationsError(exception instanceof Error ? exception.message : 'No se pudo crear la ubicación')
    } finally {
      setCreatingLocation(false)
    }
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
      <section className="support-content configuration-content" aria-label="Configuración">
        <section className={`support-card config-card config-users-card${usersExpanded ? '' : ' is-collapsed'}`} aria-label="Usuarios">
          <div
            className="config-card-body"
            ref={usersCardBodyRef}
            onTransitionEnd={handleCardTransitionEnd}
          >
          <div className="config-users-head">
            <h3 className="config-users-title">Usuarios</h3>
            <div className="config-users-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => { void downloadUsersPdf(sortedUsers) }}
                disabled={usersLoading || sortedUsers.length === 0}
              >
                Descargar PDF
              </button>
              <button
                className="primary-action config-users-create"
                type="button"
                onClick={() => {
                  setCreatedUser(null)
                  setCreateUserOpen(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon"><path d="M12 5v14M5 12h14" /></svg>
                Crear usuario
              </button>
            </div>
          </div>

          {usersError && <p className="subjects-state" role="status">{usersError}</p>}
          {usersLoading && (
            <TableSkeleton
              label="Cargando usuarios…"
              columns={['27%', '15%', '31%', '12%', '15%']}
              rows={12}
              className="config-users-skeleton"
            />
          )}
          {!usersLoading && sortedUsers.length === 0 && (
            <p className="subjects-state" role="status">Aún no hay usuarios registrados.</p>
          )}
          {!usersLoading && sortedUsers.length > 0 && (
            <div className="config-users-table-scroll">
              <table className="config-users-table">
                <thead>
                  <tr>
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
                    <th>RUT</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr key={user.rut}>
                      <td>{user.nombre}</td>
                      <td>{user.rut}</td>
                      <td className="config-users-email" title={user.email}>{user.email}</td>
                      <td className="config-users-role-cell">
                        <span className="config-users-role" title={roleLabel(user.rol)}>
                          <RoleIcon role={user.rol} />
                          <span className="sr-only">{roleLabel(user.rol)}</span>
                        </span>
                      </td>
                      <td className="config-users-actions-cell">
                        <button
                          className="subjects-icon-button subjects-icon-button-danger"
                          type="button"
                          aria-label={`Eliminar ${user.nombre}`}
                          title="Eliminar"
                          onClick={() => {
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
          )}
          </div>
          <button
            className="config-card-toggle"
            type="button"
            aria-expanded={usersExpanded}
            aria-label={usersExpanded ? 'Contraer usuarios' : 'Expandir usuarios'}
            onClick={() => {
              const collapsing = usersExpanded
              prepareCardToggle(usersCardBodyRef.current, !collapsing)
              setUsersExpanded(!collapsing)
              if (collapsing) window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </section>

        <section className={`support-card config-card${locationsExpanded ? '' : ' is-collapsed'}`} aria-label="Ubicaciones">
          <div
            className="config-card-body"
            ref={locationsCardBodyRef}
            onTransitionEnd={handleCardTransitionEnd}
          >
          <h2 className="config-title">Ubicaciones</h2>

          {locationsError && (
            <div className="banner-error" role="alert">
              <span>{locationsError}</span>
              <button className="text-button" type="button" onClick={() => setLocationsError('')}>Cerrar</button>
            </div>
          )}

          <form className="device-form config-form config-location-form" onSubmit={handleCreateLocation}>
            <label>
              <span>Nombre</span>
              <input
                value={newLocationName}
                onChange={(event) => setNewLocationName(event.target.value)}
                placeholder="Ej: Laboratorio de Computación"
                maxLength={100}
                required
              />
            </label>
            <label>
              <span>Sigla</span>
              <input
                value={newLocationSigla}
                onChange={(event) => setNewLocationSigla(event.target.value.toUpperCase())}
                placeholder="LAB"
                maxLength={3}
                pattern="[A-Za-z0-9]{1,3}"
                title="Sigla de hasta 3 letras o números"
                required
              />
            </label>
            <div className="device-field">
              <span>Tipo de ubicación</span>
              <SelectMenu
                id="config-location-type"
                ariaLabel="Tipo de ubicación"
                value={newLocationTipo}
                onChange={(next) => setNewLocationTipo(next as LocationType | 'ALL')}
                options={locationFilterOptions}
                visibleItems={4}
                fixedList
              />
            </div>
            <div className="device-form-actions">
              <button
                className="primary-action primary-action-solid"
                type="submit"
                disabled={creatingLocation || !newLocationName.trim() || !newLocationSigla.trim() || newLocationTipo === 'ALL'}
              >
                {creatingLocation ? 'Agregando…' : 'Agregar ubicación'}
              </button>
            </div>
          </form>

          {locationsLoading && <ListSkeleton label="Cargando ubicaciones…" rows={24} />}

          {!locationsLoading && locations.length === 0 && (
            <p className="subjects-state" role="status">Aún no hay ubicaciones registradas.</p>
          )}

          {!locationsLoading && locations.length > 0 && visibleLocations.length === 0 && (
            <div className="empty-state-block" role="status">
              <p>No hay ubicaciones de tipo {locationTypeLabels[newLocationTipo as LocationType]}.</p>
              <button className="secondary-button" type="button" onClick={() => setNewLocationTipo('ALL')}>
                Ver todas
              </button>
            </div>
          )}

          {!locationsLoading && locations.length > 0 && (
            <ul className="subjects-list">
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
          )}
          </div>
          <button
            className="config-card-toggle"
            type="button"
            aria-expanded={locationsExpanded}
            aria-label={locationsExpanded ? 'Contraer ubicaciones' : 'Expandir ubicaciones'}
            onClick={() => {
              const expanding = !locationsExpanded
              prepareCardToggle(locationsCardBodyRef.current, expanding)
              setLocationsExpanded(expanding)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </section>
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

      {createUserOpen && (
        <CreateUserForm
          accessToken={accessToken}
          onClose={() => setCreateUserOpen(false)}
          onSessionExpired={onSessionExpired}
          onCreated={(created) => {
            setUsers((current) => [...current, created])
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
