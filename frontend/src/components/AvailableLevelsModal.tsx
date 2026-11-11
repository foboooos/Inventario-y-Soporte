import { useRef } from 'react'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import type { EducationalLevel } from '../types/academic'
import { PencilIcon, TrashIcon } from './ActionIcons'
import { useCustomScrollbar } from '../utils/useCustomScrollbar'

type AvailableLevelsModalProps = {
  levels: EducationalLevel[]
  onEdit: (level: EducationalLevel) => void
  onDelete: (level: EducationalLevel) => void
  onClose: () => void
}

export function AvailableLevelsModal({ levels, onEdit, onDelete, onClose }: AvailableLevelsModalProps) {
  const modalRef = useRef<ModalHandle>(null)
  const {
    scrollRef: levelsListRef,
    thumbRef: levelsThumbRef,
    barRef: levelsScrollbarRef,
    handlePointerDown: handleLevelsScrollbarPointerDown,
  } = useCustomScrollbar<HTMLUListElement>(levels.length)

  return (
    <Modal
      ref={modalRef}
      label="Niveles educativos disponibles"
      backdropClassName="device-modal-backdrop"
      cardClassName="create-device-card modal-card config-level-modal"
      onClose={onClose}
    >
      <div className="device-modal-body subjects-available-levels">
        {levels.length === 0 ? (
          <p className="subjects-state" role="status">Aún no hay niveles educativos registrados.</p>
        ) : (
          <div className="subjects-available-level-scroll">
            <ul className="subjects-available-level-list" ref={levelsListRef}>
              {levels.map((level) => (
                <li className="subjects-item" key={level.id}>
                  <span className="subjects-name">{level.nombre}</span>
                  <div className="subjects-actions">
                    <button
                      className="subjects-icon-button"
                      type="button"
                      aria-label={`Renombrar ${level.nombre}`}
                      title="Renombrar"
                      onClick={() => onEdit(level)}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      className="subjects-icon-button subjects-icon-button-danger"
                      type="button"
                      aria-label={`Eliminar ${level.nombre}`}
                      title="Eliminar"
                      onClick={() => onDelete(level)}
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
        <div className="device-form-actions subjects-available-level-actions">
          <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
