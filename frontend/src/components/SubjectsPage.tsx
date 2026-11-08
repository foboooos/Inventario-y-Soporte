import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createSubject,
  getLevels,
  getSubjects,
} from '../services/academics'
import { isSessionExpired } from '../services/http'
import type { EducationalLevel, Subject } from '../types/academic'
import { ChecklistSkeleton, ListSkeleton } from './Skeleton'
import { EditSubjectForm } from './EditSubjectForm'
import { LevelFormModal } from './LevelFormModal'
import { DeleteLevelModal } from './DeleteLevelModal'
import { DeleteSubjectModal } from './DeleteSubjectModal'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { SortButton } from './SortButton'
import type { SortKey, SortOption } from './SortButton'
import { ChipDisclosure } from './ChipDisclosure'
import { useCustomScrollbar } from '../utils/useCustomScrollbar'

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

  const [levelModal, setLevelModal] = useState<{ level: EducationalLevel | null } | null>(null)
  const [pendingDeleteLevel, setPendingDeleteLevel] = useState<EducationalLevel | null>(null)
  const scrollbarKey = `${levels.length}:${loading}`
  const {
    scrollRef: levelsListRef,
    thumbRef: levelsThumbRef,
    barRef: levelsScrollbarRef,
    handlePointerDown: handleLevelsScrollbarPointerDown,
  } = useCustomScrollbar<HTMLUListElement>(scrollbarKey)
  const {
    scrollRef: checklistRef,
    thumbRef: checklistThumbRef,
    barRef: checklistScrollbarRef,
    handlePointerDown: handleChecklistScrollbarPointerDown,
  } = useCustomScrollbar<HTMLDivElement>(scrollbarKey)
  const {
    scrollRef: subjectsListRef,
    thumbRef: subjectsThumbRef,
    barRef: subjectsScrollbarRef,
    handlePointerDown: handleSubjectsScrollbarPointerDown,
  } = useCustomScrollbar<HTMLUListElement>(`${subjects.length}:${loading}`)

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectLevelIds, setNewSubjectLevelIds] = useState<number[]>([])
  const [creatingSubject, setCreatingSubject] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [pendingDeleteSubject, setPendingDeleteSubject] = useState<Subject | null>(null)
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

  function handleLevelSaved(saved: EducationalLevel) {
    setLevels((current) => {
      const exists = current.some((level) => level.id === saved.id)
      return exists
        ? current.map((level) => (level.id === saved.id ? saved : level))
        : [...current, saved]
    })
    setLevelModal(null)
  }

  function handleLevelDeleted(id: number) {
    setLevels((current) => current.filter((level) => level.id !== id))
    setNewSubjectLevelIds((current) => current.filter((levelId) => levelId !== id))
    setPendingDeleteLevel(null)
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
    setEditingSubject(subject)
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
            {selected.length < levels.length && (
              <button className="text-button subjects-levels-all" type="button" onClick={onSelectAll}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                Todos
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
            {levels.map((level) => (
              <label className="subjects-checkbox" key={level.id}>
                <input type="checkbox" checked={selected.includes(level.id)} onChange={() => onToggle(level.id)} />
                <span>{level.nombre}</span>
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
      <ChipDisclosure
        items={subject.nivelIds.map((id) => levelNameById.get(id) ?? `Nivel ${id}`)}
        maxVisible={4}
      />
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
              <div className="subjects-levels-toolbar">
                <button
                  className="secondary-button subjects-levels-add"
                  type="button"
                  onClick={() => setLevelModal({ level: null })}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nuevo nivel
                </button>
                <span className="subjects-levels-count">
                  {levels.length} {levels.length === 1 ? 'nivel' : 'niveles'}
                </span>
              </div>

              {loading && <ListSkeleton label="Cargando niveles educativos…" rows={4} />}
              {!loading && levels.length === 0 && (
                <p className="subjects-state" role="status">Aún no hay niveles educativos registrados.</p>
              )}

              {!loading && levels.length > 0 && (
                <div className="subjects-level-scroll">
                  <ul className="subjects-list" ref={levelsListRef}>
                    {levels.map((level) => (
                      <li className="subjects-item" key={level.id}>
                        <span className="subjects-name">{level.nombre}</span>
                        <div className="subjects-actions">
                          <button
                            className="subjects-icon-button"
                            type="button"
                            aria-label={`Renombrar ${level.nombre}`}
                            title="Renombrar"
                            onClick={() => setLevelModal({ level })}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="subjects-icon-button subjects-icon-button-danger"
                            type="button"
                            aria-label={`Eliminar ${level.nombre}`}
                            title="Eliminar"
                            onClick={() => setPendingDeleteLevel(level)}
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
                    ref={levelsScrollbarRef}
                    onPointerDown={handleLevelsScrollbarPointerDown}
                  >
                    <span className="list-scrollbar-thumb" ref={levelsThumbRef} />
                  </div>
                </div>
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
                <div className="list-scroll">
                  <ul className="subjects-list" ref={subjectsListRef}>
                    {sortedSubjects.map((subject) => (
                      <li className="subjects-item subjects-item-block" key={subject.id}>
                        <div className="subjects-subject-info">
                          <span className="subjects-name">{subject.nombre}</span>
                          {renderSubjectChips(subject)}
                        </div>
                        <div className="subjects-actions">
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
                            onClick={() => setPendingDeleteSubject(subject)}
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
                    ref={subjectsScrollbarRef}
                    onPointerDown={handleSubjectsScrollbarPointerDown}
                  >
                    <span className="list-scrollbar-thumb" ref={subjectsThumbRef} />
                  </div>
                </div>
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

          {levelModal && (
            <LevelFormModal
              accessToken={accessToken}
              level={levelModal.level}
              onSaved={handleLevelSaved}
              onCancel={() => setLevelModal(null)}
              onSessionExpired={onSessionExpired}
            />
          )}

          {pendingDeleteLevel && (
            <DeleteLevelModal
              accessToken={accessToken}
              level={pendingDeleteLevel}
              onDeleted={handleLevelDeleted}
              onCancel={() => setPendingDeleteLevel(null)}
              onSessionExpired={onSessionExpired}
            />
          )}

          {pendingDeleteSubject && (
            <DeleteSubjectModal
              accessToken={accessToken}
              subject={pendingDeleteSubject}
              onDeleted={(id) => {
                setSubjects((current) => current.filter((item) => item.id !== id))
                setPendingDeleteSubject(null)
              }}
              onCancel={() => setPendingDeleteSubject(null)}
              onSessionExpired={onSessionExpired}
            />
          )}
        </section>
      </main>
  )
}
