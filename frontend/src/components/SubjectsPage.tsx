import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createLevel,
  createSubject,
  deleteLevel,
  deleteSubject,
  getLevels,
  getSubjects,
  renameLevel,
} from '../services/academics'
import { isSessionExpired } from '../services/http'
import type { EducationalLevel, Subject } from '../types/academic'
import { ChecklistSkeleton, ListSkeleton } from './Skeleton'
import { EditSubjectForm } from './EditSubjectForm'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { SortButton } from './SortButton'
import type { SortKey, SortOption } from './SortButton'

type SubjectsPageProps = {
  accessToken: string
  onSessionExpired: () => void
}

const subjectSortOptions: SortOption[] = [
  { value: 'alfabetico', label: 'A-Z' },
  { value: 'alfabetico-desc', label: 'Z-A' },
  { value: 'adicion', label: 'Adición' },
  { value: 'curso', label: 'Curso' },
]

function compareNames(a: Subject, b: Subject) {
  return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
}

function toggleLevel(current: number[], id: number): number[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function SubjectsPage({ accessToken, onSessionExpired }: SubjectsPageProps) {
  const [levels, setLevels] = useState<EducationalLevel[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [newLevelName, setNewLevelName] = useState('')
  const [creatingLevel, setCreatingLevel] = useState(false)
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null)
  const [editLevelName, setEditLevelName] = useState('')
  const [savingLevelId, setSavingLevelId] = useState<number | null>(null)
  const [confirmLevelId, setConfirmLevelId] = useState<number | null>(null)
  const [deletingLevelId, setDeletingLevelId] = useState<number | null>(null)

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectLevelIds, setNewSubjectLevelIds] = useState<number[]>([])
  const [creatingSubject, setCreatingSubject] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [confirmSubjectId, setConfirmSubjectId] = useState<number | null>(null)
  const [deletingSubjectId, setDeletingSubjectId] = useState<number | null>(null)
  const [subjectSort, setSubjectSort] = useState<SortKey>('alfabetico')

  useEffect(() => {
    let active = true

    Promise.all([getLevels(accessToken), getSubjects(accessToken)])
      .then(([loadedLevels, loadedSubjects]) => {
        if (!active) return
        setLevels(loadedLevels)
        setSubjects(loadedSubjects)
        setError('')
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setError(exception instanceof Error ? exception.message : 'No se pudieron cargar las asignaturas y niveles')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, onSessionExpired, reloadKey])

  const levelNameById = new Map(levels.map((level) => [level.id, level.nombre]))

  const sortedSubjects = useMemo(() => {
    const items = [...subjects]

    if (subjectSort === 'alfabetico') {
      return items.sort(compareNames)
    }

    if (subjectSort === 'alfabetico-desc') {
      return items.sort((a, b) => compareNames(b, a))
    }

    if (subjectSort === 'curso') {
      const levelOrder = new Map(levels.map((level, index) => [level.id, index]))

      const courseKey = (subject: Subject) => {
        const indexes = subject.nivelIds
          .map((id) => levelOrder.get(id))
          .filter((index): index is number => index !== undefined)

        return indexes.length > 0 ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER
      }

      return items.sort((a, b) => courseKey(a) - courseKey(b) || compareNames(a, b))
    }

    return items.sort((a, b) => a.id - b.id)
  }, [subjects, levels, subjectSort])

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

  async function handleCreateLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = newLevelName.trim()
    if (!nombre) return

    setCreatingLevel(true)
    setError('')
    try {
      const created = await createLevel(accessToken, nombre)
      setLevels((current) => [...current, created])
      setNewLevelName('')
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo crear el nivel educativo')
    } finally {
      setCreatingLevel(false)
    }
  }

  function startEditLevel(level: EducationalLevel) {
    setConfirmLevelId(null)
    setEditingLevelId(level.id)
    setEditLevelName(level.nombre)
  }

  async function handleRenameLevel(event: FormEvent<HTMLFormElement>, level: EducationalLevel) {
    event.preventDefault()
    const nombre = editLevelName.trim()
    if (!nombre) return

    setSavingLevelId(level.id)
    setError('')
    try {
      const updated = await renameLevel(accessToken, level.id, nombre)
      setLevels((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditingLevelId(null)
      setEditLevelName('')
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo renombrar el nivel educativo')
    } finally {
      setSavingLevelId(null)
    }
  }

  async function handleDeleteLevel(level: EducationalLevel) {
    setDeletingLevelId(level.id)
    setError('')
    try {
      await deleteLevel(accessToken, level.id)
      setLevels((current) => current.filter((item) => item.id !== level.id))
      setConfirmLevelId(null)
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo eliminar el nivel educativo')
    } finally {
      setDeletingLevelId(null)
    }
  }

  async function handleCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = newSubjectName.trim()
    if (!nombre) return

    setCreatingSubject(true)
    setError('')
    try {
      const created = await createSubject(accessToken, nombre, newSubjectLevelIds)
      setSubjects((current) => [...current, created])
      setNewSubjectName('')
      setNewSubjectLevelIds([])
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo crear la asignatura')
    } finally {
      setCreatingSubject(false)
    }
  }

  function startEditSubject(subject: Subject) {
    setConfirmSubjectId(null)
    setEditingSubject(subject)
  }

  async function handleDeleteSubject(subject: Subject) {
    setDeletingSubjectId(subject.id)
    setError('')
    try {
      await deleteSubject(accessToken, subject.id)
      setSubjects((current) => current.filter((item) => item.id !== subject.id))
      setConfirmSubjectId(null)
    } catch (exception: unknown) {
      reportError(exception, 'No se pudo eliminar la asignatura')
    } finally {
      setDeletingSubjectId(null)
    }
  }

  function renderLevelChecklist(selected: number[], onToggle: (id: number) => void, onClear: () => void, onSelectAll: () => void) {
    if (levels.length === 0) {
      return <p className="subjects-hint">Crea primero un nivel educativo.</p>
    }

    return (
      <div className="subjects-levels">
        <div className="subjects-levels-head">
          <span className="subjects-levels-title">Niveles educativos</span>
          <span className="subjects-levels-meta">
            <span className="subjects-levels-count">{selected.length} de {levels.length} seleccionados</span>
            {selected.length < levels.length && (
              <button className="text-button" type="button" onClick={onSelectAll}>
                Todos
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
          {levels.map((level) => (
            <label className="subjects-checkbox" key={level.id}>
              <input type="checkbox" checked={selected.includes(level.id)} onChange={() => onToggle(level.id)} />
              <span>{level.nombre}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  function renderSubjectChips(subject: Subject) {
    if (subject.nivelIds.length === 0) {
      return <span className="subjects-hint">Sin niveles asignados</span>
    }

    const coversAllLevels = levels.length > 0 && levels.every((level) => subject.nivelIds.includes(level.id))

    if (coversAllLevels) {
      return (
        <span className="subjects-chips">
          <span className="subject-chip">Todos los cursos</span>
        </span>
      )
    }

    return (
      <span className="subjects-chips">
        {subject.nivelIds.map((id) => (
          <span className="subject-chip" key={id}>
            {levelNameById.get(id) ?? `Nivel ${id}`}
          </span>
        ))}
      </span>
    )
  }

  return (
    <main className="support-shell">
      <section className="support-content subjects-content" aria-label="Asignaturas y niveles educativos">
          {error && (
            <div className="banner-error" role="alert">
              <span>{error}</span>
              {levels.length === 0 && subjects.length === 0 && (
                <button className="text-button" type="button" onClick={retry}>
                  Reintentar
                </button>
              )}
              <button className="text-button" type="button" onClick={() => setError('')}>
                Cerrar
              </button>
            </div>
          )}

          <div className="subjects-grid subjects-grid-split">
            <section className="support-card subjects-card subjects-levels-card" aria-label="Niveles educativos">
              <form className="subjects-form" onSubmit={handleCreateLevel}>
                <label>
                  <span>Nivel educativo</span>
                  <input
                    value={newLevelName}
                    onChange={(event) => setNewLevelName(event.target.value)}
                    placeholder="Ej: 5° Básico"
                    maxLength={100}
                    required
                  />
                </label>
                <button className="primary-action" type="submit" disabled={creatingLevel || !newLevelName.trim()}>
                  {creatingLevel ? 'Agregando…' : 'Agregar'}
                </button>
              </form>

              {loading && <ListSkeleton label="Cargando niveles educativos…" rows={12} />}
              {!loading && levels.length === 0 && (
                <p className="subjects-state" role="status">Aún no hay niveles educativos registrados.</p>
              )}

              {!loading && levels.length > 0 && (
                <ul className="subjects-list">
                  {levels.map((level) => (
                    <li className="subjects-item" key={level.id}>
                      {editingLevelId === level.id ? (
                        <form className="subjects-edit" onSubmit={(event) => handleRenameLevel(event, level)}>
                          <input
                            value={editLevelName}
                            onChange={(event) => setEditLevelName(event.target.value)}
                            maxLength={100}
                            required
                            aria-label={`Nuevo nombre para ${level.nombre}`}
                          />
                          <button
                            className="subjects-icon-button"
                            type="submit"
                            aria-label="Guardar"
                            title="Guardar"
                            disabled={savingLevelId === level.id || !editLevelName.trim()}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </button>
                          <button
                            className="subjects-icon-button subjects-icon-button-muted"
                            type="button"
                            aria-label="Cancelar"
                            title="Cancelar"
                            disabled={savingLevelId === level.id}
                            onClick={() => setEditingLevelId(null)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="subjects-name">{level.nombre}</span>
                          <div className="subjects-actions">
                            {confirmLevelId === level.id ? (
                              <>
                                <span className="subjects-confirm">¿Eliminar?</span>
                                <button
                                  className="text-button text-button-danger"
                                  type="button"
                                  disabled={deletingLevelId === level.id}
                                  onClick={() => handleDeleteLevel(level)}
                                >
                                  {deletingLevelId === level.id ? 'Eliminando…' : 'Confirmar'}
                                </button>
                                <button className="text-button" type="button" disabled={deletingLevelId === level.id} onClick={() => setConfirmLevelId(null)}>
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="subjects-icon-button"
                                  type="button"
                                  aria-label={`Renombrar ${level.nombre}`}
                                  title="Renombrar"
                                  onClick={() => startEditLevel(level)}
                                >
                                  <PencilIcon />
                                </button>
                                <button
                                  className="subjects-icon-button subjects-icon-button-danger"
                                  type="button"
                                  aria-label={`Eliminar ${level.nombre}`}
                                  title="Eliminar"
                                  onClick={() => {
                                    setEditingLevelId(null)
                                    setConfirmLevelId(level.id)
                                  }}
                                >
                                  <TrashIcon />
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

            <section className="support-card subjects-card subjects-create-card" aria-label="Crear asignatura">
              <form className="subjects-form subjects-form-column" onSubmit={handleCreateSubject}>
                <label>
                  <span>Asignatura</span>
                  <input
                    value={newSubjectName}
                    onChange={(event) => setNewSubjectName(event.target.value)}
                    placeholder="Ej: Matemática"
                    maxLength={100}
                    required
                  />
                </label>
                {loading ? (
                  <ChecklistSkeleton label="Cargando niveles educativos…" title="Niveles educativos" />
                ) : renderLevelChecklist(
                  newSubjectLevelIds,
                  (id) => setNewSubjectLevelIds((current) => toggleLevel(current, id)),
                  () => setNewSubjectLevelIds([]),
                  () => setNewSubjectLevelIds(levels.map((level) => level.id)),
                )}
                <button className="primary-action" type="submit" disabled={creatingSubject || !newSubjectName.trim()}>
                  {creatingSubject ? 'Agregando…' : 'Agregar'}
                </button>
              </form>
            </section>

            <section className="support-card subjects-card subjects-list-card" aria-label="Asignaturas">
              {loading && <ListSkeleton label="Cargando asignaturas…" rows={16} />}
              {!loading && subjects.length === 0 && (
                <p className="subjects-state" role="status">Aún no hay asignaturas registradas.</p>
              )}

              {!loading && subjects.length > 0 && (
                <SortButton options={subjectSortOptions} value={subjectSort} onChange={setSubjectSort} />
              )}

              {!loading && subjects.length > 0 && (
                <ul className="subjects-list">
                  {sortedSubjects.map((subject) => (
                    <li className="subjects-item subjects-item-block" key={subject.id}>
                      <div className="subjects-subject-info">
                        <span className="subjects-name">{subject.nombre}</span>
                        {renderSubjectChips(subject)}
                      </div>
                      <div className="subjects-actions">
                        {confirmSubjectId === subject.id ? (
                          <>
                            <span className="subjects-confirm">¿Eliminar?</span>
                            <button
                              className="text-button text-button-danger"
                              type="button"
                              disabled={deletingSubjectId === subject.id}
                              onClick={() => handleDeleteSubject(subject)}
                            >
                              {deletingSubjectId === subject.id ? 'Eliminando…' : 'Confirmar'}
                            </button>
                            <button className="text-button" type="button" disabled={deletingSubjectId === subject.id} onClick={() => setConfirmSubjectId(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="subjects-icon-button"
                              type="button"
                              aria-label={`Editar ${subject.nombre}`}
                              title="Editar"
                              onClick={() => startEditSubject(subject)}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              className="subjects-icon-button subjects-icon-button-danger"
                              type="button"
                              aria-label={`Eliminar ${subject.nombre}`}
                              title="Eliminar"
                              onClick={() => setConfirmSubjectId(subject.id)}
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

          {editingSubject && (
            <EditSubjectForm
              accessToken={accessToken}
              subject={editingSubject}
              levels={levels}
              onUpdated={(updated) => {
                setSubjects((current) => current.map((item) => (item.id === updated.id ? updated : item)))
                setEditingSubject(null)
              }}
              onCancel={() => setEditingSubject(null)}
              onSessionExpired={onSessionExpired}
            />
          )}
        </section>
      </main>
  )
}
