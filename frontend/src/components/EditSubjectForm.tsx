import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { updateSubject } from '../services/academics'
import { isSessionExpired } from '../services/http'
import type { EducationalLevel, Subject } from '../types/academic'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'

type EditSubjectFormProps = {
  accessToken: string
  subject: Subject
  levels: EducationalLevel[]
  onUpdated: (subject: Subject) => void
  onCancel: () => void
  onSessionExpired: () => void
}

function toggleLevel(current: number[], id: number): number[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function EditSubjectForm({ accessToken, subject, levels, onUpdated, onCancel, onSessionExpired }: EditSubjectFormProps) {
  const [name, setName] = useState(subject.nombre)
  const [levelIds, setLevelIds] = useState<number[]>(subject.nivelIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = name.trim()
    if (!nombre) return

    setSaving(true)
    setError('')

    try {
      const updated = await updateSubject(accessToken, subject.id, { nombre, nivelIds: levelIds })
      modalRef.current?.close(() => onUpdated(updated))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo actualizar la asignatura')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      label={`Editar ${subject.nombre}`}
      dismissible={!saving}
      onClose={onCancel}
    >
        <div className="device-modal-body">
          <form className="device-form" onSubmit={handleSubmit}>
            <label className="device-form-wide">
              <span>Nombre</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
            </label>

            <div className="device-form-wide">
              {levels.length === 0 ? (
                <p className="subjects-hint">Crea primero un nivel educativo.</p>
              ) : (
                <div className="subjects-levels">
                  <div className="subjects-levels-head">
                    <span className="subjects-levels-title">Niveles educativos</span>
                    <span className="subjects-levels-meta">
                      {levelIds.length < levels.length && (
                        <button className="text-button subjects-levels-all" type="button" onClick={() => setLevelIds(levels.map((level) => level.id))}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                          Todos
                        </button>
                      )}
                      {levelIds.length > 0 && (
                        <button className="text-button subjects-levels-clear" type="button" onClick={() => setLevelIds([])}>
                          Limpiar
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="subjects-checklist">
                    {levels.map((level) => (
                      <label className="subjects-checkbox" key={level.id}>
                        <input
                          type="checkbox"
                          checked={levelIds.includes(level.id)}
                          onChange={() => setLevelIds((current) => toggleLevel(current, level.id))}
                        />
                        <span>{level.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="error device-form-wide" role="alert">{error}</p>}
            <div className="device-form-actions device-form-wide">
              <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()} disabled={saving}>Cancelar</button>
              <button className="primary-action primary-action-solid" type="submit" disabled={saving || !name.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  )
}
