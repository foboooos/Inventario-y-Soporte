import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getSubjects } from '../services/academics'
import { isSessionExpired } from '../services/http'
import { createSoftware, deleteSoftware, getSoftware } from '../services/software'
import type { Subject } from '../types/academic'
import { ChecklistSkeleton, ListSkeleton } from './Skeleton'
import { EditSoftwareForm } from './EditSoftwareForm'
import { SelectMenu } from './SelectMenu'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { SortButton } from './SortButton'
import type { SortKey, SortOption } from './SortButton'
import { SOFTWARE_LICENSES, softwareLicenseLabel } from '../types/software'
import type { SoftwareLicense, SoftwareProgram } from '../types/software'

type SoftwarePageProps = {
  accessToken: string
  onSessionExpired: () => void
}

const softwareSortOptions: SortOption[] = [
  { value: 'alfabetico', label: 'A-Z' },
  { value: 'alfabetico-desc', label: 'Z-A' },
  { value: 'adicion', label: 'Adición' },
]

function toggleId(current: number[], id: number): number[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function SoftwarePage({ accessToken, onSessionExpired }: SoftwarePageProps) {
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

  const [editingProgram, setEditingProgram] = useState<SoftwareProgram | null>(null)
  const [softwareSort, setSoftwareSort] = useState<SortKey>('alfabetico')

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
          onSessionExpired()
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
  }, [accessToken, onSessionExpired, reloadKey])

  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.nombre]))

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [subjects],
  )

  const sortedPrograms = useMemo(() => {
    const items = [...programs]

    if (softwareSort === 'alfabetico-desc') {
      return items.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es', { sensitivity: 'base' }))
    }

    if (softwareSort === 'adicion') {
      return items.sort((a, b) => a.id - b.id)
    }

    return items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }, [programs, softwareSort])

  function retry() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  function reportError(exception: unknown, fallback: string) {
    if (isSessionExpired(exception)) {
      onSessionExpired()
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
    setEditingProgram(program)
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

  function renderAsignaturaPicker(selected: number[], onToggle: (id: number) => void, onClear: () => void, onSelectAll: () => void) {
    if (sortedSubjects.length === 0) {
      return <p className="subjects-hint">Crea primero una asignatura.</p>
    }

    return (
      <div className="subjects-levels">
        <div className="subjects-levels-head">
          <span className="subjects-levels-title">Asignaturas</span>
          <span className="subjects-levels-meta">
            <span className="subjects-levels-count">{selected.length} de {sortedSubjects.length} seleccionadas</span>
            {selected.length < sortedSubjects.length && (
              <button className="text-button" type="button" onClick={onSelectAll}>
                Todas
              </button>
            )}
            {selected.length > 0 && (
              <button className="text-button" type="button" onClick={onClear}>
                Limpiar
              </button>
            )}
          </span>
        </div>
        <div className="subjects-checklist">
          {sortedSubjects.map((subject) => (
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

    const sortedIds = [...program.asignaturaIds].sort((a, b) =>
      (subjectNameById.get(a) ?? '').localeCompare(subjectNameById.get(b) ?? '', 'es', { sensitivity: 'base' }),
    )

    return (
      <span className="subjects-chips">
        {sortedIds.map((id) => (
          <span className="subject-chip" key={id}>
            {subjectNameById.get(id) ?? `Asignatura ${id}`}
          </span>
        ))}
      </span>
    )
  }

  function renderLicenseSelect(value: SoftwareLicense, onChange: (license: SoftwareLicense) => void) {
    return (
      <SelectMenu
        id="software-license"
        ariaLabel="Licencia"
        value={value}
        onChange={(next) => onChange(next as SoftwareLicense)}
        options={SOFTWARE_LICENSES}
        visibleItems={5}
      />
    )
  }

  return (
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

          <div className="subjects-grid software-grid">
            <section className="support-card subjects-card software-form-card" aria-label="Registrar software educativo">
              <form className="subjects-form software-create-form" onSubmit={handleCreate}>
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
                {loading ? (
                  <ChecklistSkeleton label="Cargando asignaturas…" title="Asignaturas" />
                ) : renderAsignaturaPicker(
                  newAsignaturaIds,
                  (id) => setNewAsignaturaIds((current) => toggleId(current, id)),
                  () => setNewAsignaturaIds([]),
                  () => setNewAsignaturaIds(sortedSubjects.map((subject) => subject.id)),
                )}
                <button className="primary-action" type="submit" disabled={creating || !newName.trim() || !newVersion.trim()}>
                  {creating ? 'Registrando…' : 'Registrar'}
                </button>
              </form>
            </section>

            <section className="support-card subjects-card software-list-card" aria-label="Programas registrados">
              {loading && <ListSkeleton label="Cargando software educativo…" rows={16} />}
              {!loading && programs.length === 0 && (
                <p className="subjects-state" role="status">Aún no hay programas registrados.</p>
              )}

              {!loading && programs.length > 0 && (
                <SortButton options={softwareSortOptions} value={softwareSort} onChange={setSoftwareSort} />
              )}

              {!loading && programs.length > 0 && (
                <ul className="subjects-list">
                  {sortedPrograms.map((program) => (
                    <li className="subjects-item subjects-item-block" key={program.id}>
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
                            <button
                              className="subjects-icon-button"
                              type="button"
                              aria-label={`Editar ${program.nombre}`}
                              title="Editar"
                              onClick={() => startEdit(program)}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              className="subjects-icon-button subjects-icon-button-danger"
                              type="button"
                              aria-label={`Eliminar ${program.nombre}`}
                              title="Eliminar"
                              onClick={() => setConfirmId(program.id)}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {editingProgram && (
            <EditSoftwareForm
              accessToken={accessToken}
              program={editingProgram}
              subjects={sortedSubjects}
              onUpdated={(updated) => {
                setPrograms((current) => current.map((item) => (item.id === updated.id ? updated : item)))
                setEditingProgram(null)
              }}
              onCancel={() => setEditingProgram(null)}
              onSessionExpired={onSessionExpired}
            />
          )}
        </section>
    </main>
  )
}
