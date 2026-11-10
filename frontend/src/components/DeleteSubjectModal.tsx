import { useRef, useState } from 'react'
import { deleteSubject } from '../services/academics'
import { isSessionExpired } from '../services/http'
import type { Subject } from '../types/academic'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'

type DeleteSubjectModalProps = {
  accessToken: string
  subject: Subject
  onDeleted: (id: number) => void
  onCancel: () => void
  onSessionExpired: () => void
}

export function DeleteSubjectModal({ accessToken, subject, onDeleted, onCancel, onSessionExpired }: DeleteSubjectModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  async function handleDelete() {
    setDeleting(true)
    setError('')

    try {
      await deleteSubject(accessToken, subject.id)
      modalRef.current?.close(() => onDeleted(subject.id))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo eliminar la asignatura')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      role="alertdialog"
      label={`Eliminar ${subject.nombre}`}
      backdropClassName="device-modal-backdrop"
      cardClassName="create-device-card modal-card config-delete-modal"
      dismissible={!deleting}
      onClose={onCancel}
    >
      <div className="device-modal-body">
        <p className="config-dialog-text">
          ¿Eliminar {subject.nombre}? Esta acción no se puede deshacer.
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
