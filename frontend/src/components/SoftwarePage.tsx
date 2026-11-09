import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getSubjects } from '../services/academics'
import { isSessionExpired } from '../services/http'
import { createSoftware, deleteSoftware, getSoftware } from '../services/software'
import type { Subject } from '../types/academic'
import { ChecklistSkeleton, ListSkeleton } from './Skeleton'
import { EditSoftwareForm } from './EditSoftwareForm'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { SelectMenu } from './SelectMenu'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { SortButton } from './SortButton'
import type { SortKey, SortOption } from './SortButton'
import { ChipDisclosure } from './ChipDisclosure'
import { useCustomScrollbar } from '../utils/useCustomScrollbar'
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

  const [pendingDelete, setPendingDelete] = useState<SoftwareProgram | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const deleteModalRef = useRef<ModalHandle>(null)

  const scrollbarKey = `${programs.length}:${loading}`
  const {
    scrollRef: programsListRef,
    thumbRef: programsThumbRef,
    barRef: programsScrollbarRef,
    handlePointerDown: handleProgramsScrollbarPointerDown,
  } = useCustomScrollbar<HTMLUListElement>(scrollbarKey)
  const {
    scrollRef: checklistRef,
    thumbRef: checklistThumbRef,
    barRef: checklistScrollbarRef,
    handlePointerDown: handleChecklistScrollbarPointerDown,
  } = useCustomScrollbar<HTMLDivElement>(`${subjects.length}:${loading}`)

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
    setEditingProgram(program)
  }

  async function handleDelete(program: SoftwareProgram) {
    setDeletingId(program.id)
    setDeleteError('')
    try {
      await deleteSoftware(accessToken, program.id)
      setPrograms((current) => current.filter((item) => item.id !== program.id))
      deleteModalRef.current?.close(() => setPendingDelete(null))
    } catch (exception: unknown) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setDeleteError(exception instanceof Error ? exception.message : 'No se pudo eliminar el software')
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
          <span className="subjects-levels-meta">
            {selected.length < sortedSubjects.length && (
              <button className="text-button subjects-levels-all" type="button" onClick={onSelectAll}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                Todas
              </button>
            )}
            {selected.length > 0 && (
              <button className="text-button subjects-levels-clear" type="button" onClick={onClear}>
                Limpiar
              </button>
            )}
          </span>
        </div>
        <div className="subjects-checklist-scroll">
          <div className="subjects-checklist" ref={checklistRef}>
            {sortedSubjects.map((subject) => (
              <label className="subjects-checkbox" key={subject.id} title={subject.nombre}>
                <input type="checkbox" checked={selected.includes(subject.id)} onChange={() => onToggle(subject.id)} />
                <span>{subject.nombre}</span>
              </label>
            ))}
          </div>
          <div
            className="list-scrollbar"
            aria-hidden="true"
            ref={checklistScrollbarRef}
            onPointerDown={handleChecklistScrollbarPointerDown}
          >
            <span className="list-scrollbar-thumb" ref={checklistThumbRef} />
          </div>
        </div>
      </div>
    )
  }

  function renderAsignaturaChips(program: SoftwareProgram) {
    if (program.asignaturaIds.length === 0) {
      return (
        <span className="subjects-chips">
          <span className="subject-chip subject-chip-danger">Sin asignaturas</span>
        </span>
      )
    }

    const subjectIds = new Set(program.asignaturaIds)
    const coversAllSubjects = sortedSubjects.length > 0
      && sortedSubjects.every((subject) => subjectIds.has(subject.id))

    if (coversAllSubjects) {
      return (
        <span className="subjects-chips">
          <span className="subject-chip subject-chip-success">Todas las asignaturas</span>
        </span>
      )
    }

    const sortedIds = [...program.asignaturaIds].sort((a, b) =>
      (subjectNameById.get(a) ?? '').localeCompare(subjectNameById.get(b) ?? '', 'es', { sensitivity: 'base' }),
    )

    return (
      <ChipDisclosure
        items={sortedIds.map((id) => subjectNameById.get(id) ?? `Asignatura ${id}`)}
      />
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
                <label className="field-float">
                  <span>Programa</span>
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Ej: GeoGebra"
                    maxLength={150}
                    required
                  />
                </label>
                <label className="field-float">
                  <span>Versión</span>
                  <input
                    value={newVersion}
                    onChange={(event) => setNewVersion(event.target.value)}
                    placeholder="Ej: 6.0"
                    maxLength={50}
                    required
                  />
                </label>
                <label className="field-float">
                  <span>Licencia</span>
                  {renderLicenseSelect(newLicense, setNewLicense)}
                </label>
                {loading ? (
                  <ChecklistSkeleton label="Cargando asignaturas…" />
                ) : renderAsignaturaPicker(
                  newAsignaturaIds,
                  (id) => setNewAsignaturaIds((current) => toggleId(current, id)),
                  () => setNewAsignaturaIds([]),
                  () => setNewAsignaturaIds(sortedSubjects.map((subject) => subject.id)),
                )}
                <button className="primary-action primary-action-solid" type="submit" disabled={creating || !newName.trim() || !newVersion.trim()}>
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
                <div className="list-scroll">
                  <ul className="subjects-list" ref={programsListRef}>
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
                            onClick={() => {
                              setDeleteError('')
                              setPendingDelete(program)
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div
                    className="list-scrollbar"
                    aria-hidden="true"
                    ref={programsScrollbarRef}
                    onPointerDown={handleProgramsScrollbarPointerDown}
                  >
                    <span className="list-scrollbar-thumb" ref={programsThumbRef} />
                  </div>
                </div>
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

          {pendingDelete && (
            <Modal
              ref={deleteModalRef}
              role="alertdialog"
              label={`Eliminar ${pendingDelete.nombre}`}
              cardClassName="create-device-card modal-card config-delete-modal"
              dismissible={deletingId === null}
              onClose={() => setPendingDelete(null)}
            >
              <div className="device-modal-body">
                <h2 className="config-dialog-title">Eliminar software</h2>
                <p className="config-dialog-text">
                  ¿Eliminar <strong>{pendingDelete.nombre}</strong>? Esta acción no se puede deshacer.
                </p>
                {deleteError && <p className="error" role="alert">{deleteError}</p>}
                <div className="device-form-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => deleteModalRef.current?.close()}
                  >
                    Cancelar
                  </button>
                  <button
                    className="config-danger-button"
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => { void handleDelete(pendingDelete) }}
                  >
                    {deletingId !== null ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </section>
    </main>
  )
}
