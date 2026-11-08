import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createLevel, renameLevel } from '../services/academics'
import { isSessionExpired } from '../services/http'
import type { EducationalLevel } from '../types/academic'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'

type LevelFormModalProps = {
  accessToken: string
  level: EducationalLevel | null
  onSaved: (level: EducationalLevel) => void
  onCancel: () => void
  onSessionExpired: () => void
}

export function LevelFormModal({ accessToken, level, onSaved, onCancel, onSessionExpired }: LevelFormModalProps) {
  const [name, setName] = useState(level?.nombre ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)
  const isEditing = level !== null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = name.trim()
    if (!nombre) return

    setSaving(true)
    setError('')

    try {
      const saved = level
        ? await renameLevel(accessToken, level.id, nombre)
        : await createLevel(accessToken, nombre)
      modalRef.current?.close(() => onSaved(saved))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error
        ? exception.message
        : isEditing
          ? 'No se pudo renombrar el nivel educativo'
          : 'No se pudo crear el nivel educativo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      label={isEditing ? `Renombrar ${level.nombre}` : 'Nuevo nivel educativo'}
      backdropClassName="device-modal-backdrop"
      dismissible={!saving}
      onClose={onCancel}
    >
      <div className="device-modal-body">
        <h2 className="config-dialog-title level-modal-title">
          {isEditing ? 'Renombrar nivel educativo' : 'Nuevo nivel educativo'}
        </h2>
        <form className="device-form" onSubmit={handleSubmit}>
          <label className="device-form-wide">
            <span>Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: 5° Básico"
              maxLength={100}
              required
            />
          </label>
          {error && <p className="error device-form-wide" role="alert">{error}</p>}
          <div className="device-form-actions device-form-wide">
            <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()} disabled={saving}>
              Cancelar
            </button>
            <button className="primary-action primary-action-solid" type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Guardando…' : isEditing ? 'Guardar' : 'Crear nivel'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
