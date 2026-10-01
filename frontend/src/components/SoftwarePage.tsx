import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getSubjects } from '../services/academics'
import { isSessionExpired } from '../services/http'
import { createSoftware, deleteSoftware, getSoftware, updateSoftware } from '../services/software'
import type { Subject } from '../types/academic'
import type { AuthUser } from '../types/auth'
import { SOFTWARE_LICENSES, softwareLicenseLabel } from '../types/software'
import type { SoftwareLicense, SoftwareProgram } from '../types/software'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type SoftwarePageProps = {
  user: AuthUser
  accessToken: string
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

function toggleId(current: number[], id: number): number[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function SoftwarePage({ user, accessToken, activeRoute, onNavigate, onLogout }: SoftwarePageProps) {
  const [programs, setPrograms] = useState<SoftwareProgram[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [newName, setNewName] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [newLicense, setNewLicense] = useState<SoftwareLicense>('LIBRE')
  const [newAsignaturaIds, setNewAsignaturaIds] = useState<number[]>([])
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editVersion, setEditVersion] = useState('')
  const [editLicense, setEditLicense] = useState<SoftwareLicense>('LIBRE')
  const [editAsignaturaIds, setEditAsignaturaIds] = useState<number[]>([])
  const [savingId, setSavingId] = useState<number | null>(null)

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([getSoftware(accessToken), getSubjects(accessToken)])
      .then(([loadedPrograms, loadedSubjects]) => {
        if (!active) return
        setPrograms(loadedPrograms)
        setSubjects(loadedSubjects)
        setError('')
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onLogout()
          return
        }
        setError(exception instanceof Error ? exception.message : 'No se pudo cargar el software educativo')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, onLogout, reloadKey])

  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.nombre]))

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
    const version = newVersion.trim()
    if (!nombre || !version) return

    setCreating(true)
    setError('')
    try {
      const created = await createSoftware(accessToken, {
        nombre,
        version,
        licencia: newLicense,
        asignaturaIds: newAsignaturaIds,
      })
      setPrograms((current) => [...current, created])
      setNewName('')
      setNewVersion('')
      setNewLicense('LIBRE')
      setNewAsignaturaIds([])
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo registrar el software')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(program: SoftwareProgram) {
    setConfirmId(null)
    setEditingId(program.id)
    setEditName(program.nombre)
    setEditVersion(program.version)
    setEditLicense(program.licencia)
    setEditAsignaturaIds(program.asignaturaIds)
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, program: SoftwareProgram) {
    event.preventDefault()
    const nombre = editName.trim()
    const version = editVersion.trim()
    if (!nombre || !version) return

    setSavingId(program.id)
    setError('')
    try {
      const updated = await updateSoftware(accessToken, program.id, {
        nombre,
        version,
        licencia: editLicense,
        asignaturaIds: editAsignaturaIds,
      })
      setPrograms((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditingId(null)
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo actualizar el software')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(program: SoftwareProgram) {
    setDeletingId(program.id)
    setError('')
    try {
      await deleteSoftware(accessToken, program.id)
      setPrograms((current) => current.filter((item) => item.id !== program.id))
      setConfirmId(null)
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo eliminar el software')
    } finally {
      setDeletingId(null)
    }
  }

  function renderAsignaturaPicker(selected: number[], onToggle: (id: number) => void, onClear: () => void) {
    if (subjects.length === 0) {
      return <p className="subjects-hint">Crea primero una asignatura.</p>
    }

    return (
      <div className="subjects-levels">
        <div className="subjects-levels-head">
          <span className="subjects-levels-title">Asignaturas</span>
          <span className="subjects-levels-meta">
            <span className="subjects-levels-count">{selected.length} de {subjects.length} seleccionadas</span>
            {selected.length > 0 && (
              <button className="text-button" type="button" onClick={onClear}>
                Limpiar
              </button>
            )}
          </span>
        </div>
        <div className="subjects-checklist">
          {subjects.map((subject) => (
            <label className="subjects-checkbox" key={subject.id}>
              <input type="checkbox" checked={selected.includes(subject.id)} onChange={() => onToggle(subject.id)} />
              <span>{subject.nombre}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  function renderAsignaturaChips(program: SoftwareProgram) {
    if (program.asignaturaIds.length === 0) {
      return <span className="subjects-hint">Sin asignaturas</span>
    }

    return (
      <span className="subjects-chips">
        {program.asignaturaIds.map((id) => (
          <span className="subject-chip" key={id}>
            {subjectNameById.get(id) ?? `Asignatura ${id}`}
          </span>
        ))}
      </span>
    )
  }

  function renderLicenseSelect(value: SoftwareLicense, onChange: (license: SoftwareLicense) => void) {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value as SoftwareLicense)}>
        {SOFTWARE_LICENSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-shell">
        <section className="support-content subjects-content" aria-label="Catálogo de software educativo">
          {error && (
            <div className="banner-error" role="alert">
              <span>{error}</span>
              {programs.length === 0 && (
                <button className="text-button" type="button" onClick={retry}>
                  Reintentar
                </button>
              )}
              <button className="text-button" type="button" onClick={() => setError('')}>
                Cerrar
              </button>
            </div>
          )}

          <div className="subjects-grid">
            <section className="support-card subjects-card" aria-label="Registrar software educativo">
              <form className="subjects-form subjects-form-column" onSubmit={handleCreate}>
                <label>
                  <span>Programa</span>
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Ej: GeoGebra"
                    maxLength={150}
                    required
                  />
                </label>
                <label>
                  <span>Versión</span>
                  <input
                    value={newVersion}
                    onChange={(event) => setNewVersion(event.target.value)}
                    placeholder="Ej: 6.0"
                    maxLength={50}
                    required
                  />
                </label>
                <label>
                  <span>Licencia</span>
                  {renderLicenseSelect(newLicense, setNewLicense)}
                </label>
                {renderAsignaturaPicker(
                  newAsignaturaIds,
                  (id) => setNewAsignaturaIds((current) => toggleId(current, id)),
                  () => setNewAsignaturaIds([]),
                )}
                <button className="primary-action" type="submit" disabled={creating || !newName.trim() || !newVersion.trim()}>
                  {creating ? 'Registrando…' : 'Registrar'}
                </button>
              </form>
            </section>

            <section className="support-card subjects-card" aria-label="Programas registrados">
              {loading && <p className="subjects-state" role="status">Cargando software educativo…</p>}
              {!loading && programs.length === 0 && (
                <p className="subjects-state" role="status">Aún no hay programas registrados.</p>
              )}

              {!loading && programs.length > 0 && (
                <ul className="subjects-list">
                  {programs.map((program) => (
                    <li className="subjects-item subjects-item-block" key={program.id}>
                      {editingId === program.id ? (
                        <form className="subjects-edit-column" onSubmit={(event) => handleUpdate(event, program)}>
                          <label>
                            <span>Programa</span>
                            <input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              maxLength={150}
                              required
                            />
                          </label>
                          <label>
                            <span>Versión</span>
                            <input
                              value={editVersion}
                              onChange={(event) => setEditVersion(event.target.value)}
                              maxLength={50}
                              required
                            />
                          </label>
                          <label>
                            <span>Licencia</span>
                            {renderLicenseSelect(editLicense, setEditLicense)}
                          </label>
                          {renderAsignaturaPicker(
                            editAsignaturaIds,
                            (id) => setEditAsignaturaIds((current) => toggleId(current, id)),
                            () => setEditAsignaturaIds([]),
                          )}
                          <div className="subjects-edit-actions">
                            <button className="primary-action" type="submit" disabled={savingId === program.id || !editName.trim() || !editVersion.trim()}>
                              {savingId === program.id ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button className="secondary-button" type="button" disabled={savingId === program.id} onClick={() => setEditingId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="subjects-subject-info">
                            <span className="subjects-name">{program.nombre}</span>
                            <span className="software-meta">
                              <span className="software-version">{program.version}</span>
                              <span className={`software-license software-license-${program.licencia.toLowerCase()}`}>
                                {softwareLicenseLabel(program.licencia)}
                              </span>
                            </span>
                            {renderAsignaturaChips(program)}
                          </div>
                          <div className="subjects-actions">
                            {confirmId === program.id ? (
                              <>
                                <span className="subjects-confirm">¿Eliminar?</span>
                                <button
                                  className="text-button text-button-danger"
                                  type="button"
                                  disabled={deletingId === program.id}
                                  onClick={() => handleDelete(program)}
                                >
                                  {deletingId === program.id ? 'Eliminando…' : 'Confirmar'}
                                </button>
                                <button className="text-button" type="button" disabled={deletingId === program.id} onClick={() => setConfirmId(null)}>
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="text-button" type="button" onClick={() => startEdit(program)}>Editar</button>
                                <button
                                  className="text-button text-button-danger"
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null)
                                    setConfirmId(program.id)
                                  }}
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
