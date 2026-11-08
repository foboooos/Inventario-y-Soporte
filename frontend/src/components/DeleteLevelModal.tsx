import { useRef, useState } from 'react'
import { deleteLevel } from '../services/academics'
import { isSessionExpired } from '../services/http'
import type { EducationalLevel } from '../types/academic'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'

type DeleteLevelModalProps = {
  accessToken: string
  level: EducationalLevel
  onDeleted: (id: number) => void
  onCancel: () => void
  onSessionExpired: () => void
}

export function DeleteLevelModal({ accessToken, level, onDeleted, onCancel, onSessionExpired }: DeleteLevelModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  async function handleDelete() {
    setDeleting(true)
    setError('')

    try {
      await deleteLevel(accessToken, level.id)
      modalRef.current?.close(() => onDeleted(level.id))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo eliminar el nivel educativo')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      role="alertdialog"
      label={`Eliminar ${level.nombre}`}
      backdropClassName="device-modal-backdrop"
      cardClassName="create-device-card modal-card config-delete-modal"
      dismissible={!deleting}
      onClose={onCancel}
    >
      <div className="device-modal-body">
        <h2 className="config-dialog-title">Eliminar nivel educativo</h2>
        <p className="config-dialog-text">
          ¿Eliminar {level.nombre}? Esta acción no se puede deshacer.
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="device-form-actions device-delete-actions">
          <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()} disabled={deleting}>
            Cancelar
          </button>
          <button className="config-danger-button" type="button" onClick={() => { void handleDelete() }} disabled={deleting}>
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
