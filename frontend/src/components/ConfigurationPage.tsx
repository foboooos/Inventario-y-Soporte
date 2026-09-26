import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createLocation, deleteLocation, generateCourses, getLocations, renameLocation } from '../services/locations'
import { isSessionExpired } from '../services/http'
import type { AuthUser } from '../types/auth'
import type { Location } from '../types/location'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type ConfigurationPageProps = {
  user: AuthUser
  accessToken: string
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

function sortGlobalLocations(locations: Location[]): Location[] {
  return [...locations].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
}

export function ConfigurationPage({ user, accessToken, activeRoute, onNavigate, onLogout }: ConfigurationPageProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    getLocations(accessToken)
      .then((loaded) => {
        if (active) {
          setLocations(loaded)
          setError('')
        }
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onLogout()
          return
        }
        setError(exception instanceof Error ? exception.message : 'No se pudieron cargar las ubicaciones')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [accessToken, onLogout, reloadKey])

  const globalLocations = sortGlobalLocations(locations.filter((location) => location.padreId === null))
  const childrenByParent = new Map<number, Location[]>()
  for (const location of locations) {
    if (location.padreId === null) continue
    const siblings = childrenByParent.get(location.padreId) ?? []
    siblings.push(location)
    childrenByParent.set(location.padreId, siblings)
  }

  function retry() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  function reportError(exception: unknown, fallback: string) {
    if (isSessionExpired(exception)) {
      onLogout()
      return
    }
    setError(exception instanceof Error ? exception.message : fallback)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = newName.trim()
    if (!nombre) return

    setCreating(true)
    setError('')

    try {
      const created = await createLocation(accessToken, nombre, newParentId ? Number(newParentId) : undefined)
      setLocations((current) => [...current, created])
      setNewName('')
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo crear la ubicación')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(location: Location) {
    setConfirmId(null)
    setEditingId(location.id)
    setEditName(location.nombre)
  }

  async function handleRename(event: FormEvent<HTMLFormElement>, location: Location) {
    event.preventDefault()
    const nombre = editName.trim()
    if (!nombre) return

    setSavingId(location.id)
    setError('')

    try {
      const updated = await renameLocation(accessToken, location.id, nombre)
      setLocations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditingId(null)
      setEditName('')
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo renombrar la ubicación')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(location: Location) {
    setDeletingId(location.id)
    setError('')

    try {
      await deleteLocation(accessToken, location.id)
      setLocations((current) => current.filter((item) => item.id !== location.id))
      setConfirmId(null)
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo eliminar la ubicación')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleGenerate(location: Location) {
    setGeneratingId(location.id)
    setError('')

    try {
      const refreshed = await generateCourses(accessToken, location.id)
      setLocations((current) => [
        ...current.filter((item) => item.padreId !== location.id),
        ...refreshed,
      ])
    } catch (exception: unknown) {
      reportError(exception, 'No se pudieron generar los cursos')
    } finally {
      setGeneratingId(null)
    }
  }

  function renderLocationRow(location: Location, isSub: boolean) {
    return (
      <div className={`locations-item${isSub ? ' locations-item-sub' : ''}`} key={location.id}>
        {editingId === location.id ? (
          <form className="locations-edit" onSubmit={(event) => handleRename(event, location)}>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              maxLength={100}
              required
              aria-label={`Nuevo nombre para ${location.nombre}`}
            />
            <button className="primary-action" type="submit" disabled={savingId === location.id || !editName.trim()}>
              {savingId === location.id ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="secondary-button" type="button" disabled={savingId === location.id} onClick={() => setEditingId(null)}>
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <span className="locations-name">{location.nombre}</span>
            <div className="locations-actions">
              {confirmId === location.id ? (
                <>
                  <span className="locations-confirm">¿Eliminar?</span>
                  <button
                    className="text-button text-button-danger"
                    type="button"
                    disabled={deletingId === location.id}
                    onClick={() => handleDelete(location)}
                  >
                    {deletingId === location.id ? 'Eliminando…' : 'Confirmar'}
                  </button>
                  <button className="text-button" type="button" disabled={deletingId === location.id} onClick={() => setConfirmId(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  {!isSub && (
                    <button
                      className="text-button"
                      type="button"
                      disabled={generatingId === location.id}
                      onClick={() => handleGenerate(location)}
                    >
                      {generatingId === location.id ? 'Generando…' : 'Generar cursos'}
                    </button>
                  )}
                  <button className="text-button" type="button" onClick={() => startEdit(location)}>Renombrar</button>
                  <button className="text-button text-button-danger" type="button" onClick={() => { setEditingId(null); setConfirmId(location.id) }}>
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-shell">
        <section className="support-content settings-content" aria-label="Configuración">
          <section className="support-card settings-card" aria-labelledby="locations-title">
            <div className="form-heading">
              <div>
                <h2 id="locations-title">Ubicaciones</h2>
                <p>Administra las salas y oficinas. Cada ubicación global puede tener sub-ubicaciones, como los cursos de una sala de clases.</p>
              </div>
            </div>

            <form className="locations-form" onSubmit={handleCreate}>
              <label>
                <span>Ubicación padre</span>
                <select value={newParentId} onChange={(event) => setNewParentId(event.target.value)}>
                  <option value="">Ninguna (ubicación global)</option>
                  {globalLocations.map((location) => <option key={location.id} value={location.id}>{location.nombre}</option>)}
                </select>
              </label>
              <label>
                <span>Nombre</span>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder={newParentId ? 'Ej: 1° Básico A' : 'Ej: Laboratorio 3'}
                  maxLength={100}
                  required
                />
              </label>
              <button className="primary-action" type="submit" disabled={creating || !newName.trim()}>
                {creating ? 'Agregando…' : 'Agregar'}
              </button>
            </form>

            {error && (
              <div className="banner-error" role="alert">
                <span>{error}</span>
                {locations.length === 0 && (
                  <button className="text-button" type="button" onClick={retry}>Reintentar</button>
                )}
                <button className="text-button" type="button" onClick={() => setError('')}>Cerrar</button>
              </div>
            )}

            {loading && <p className="locations-state" role="status">Cargando ubicaciones…</p>}

            {!loading && locations.length === 0 && (
              <p className="locations-state" role="status">Aún no hay ubicaciones registradas.</p>
            )}

            {!loading && globalLocations.length > 0 && (
              <ul className="locations-list">
                {globalLocations.map((global) => {
                  const children = childrenByParent.get(global.id) ?? []

                  return (
                    <li className="locations-group" key={global.id}>
                      {renderLocationRow(global, false)}
                      {children.length > 0 && (
                        <div className="locations-sublist">
                          {children.map((child) => renderLocationRow(child, true))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </section>
      </main>
    </DashboardLayout>
  )
}
