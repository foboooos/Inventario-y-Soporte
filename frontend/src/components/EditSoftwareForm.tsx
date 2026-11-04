import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { updateSoftware } from '../services/software'
import { isSessionExpired } from '../services/http'
import { SOFTWARE_LICENSES } from '../types/software'
import type { SoftwareLicense, SoftwareProgram } from '../types/software'
import type { Subject } from '../types/academic'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { SelectMenu } from './SelectMenu'

type EditSoftwareFormProps = {
  accessToken: string
  program: SoftwareProgram
  subjects: Subject[]
  onUpdated: (program: SoftwareProgram) => void
  onCancel: () => void
  onSessionExpired: () => void
}

function toggleId(current: number[], id: number): number[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function EditSoftwareForm({ accessToken, program, subjects, onUpdated, onCancel, onSessionExpired }: EditSoftwareFormProps) {
  const [name, setName] = useState(program.nombre)
  const [version, setVersion] = useState(program.version)
  const [license, setLicense] = useState<SoftwareLicense>(program.licencia)
  const [subjectIds, setSubjectIds] = useState<number[]>(program.asignaturaIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = name.trim()
    const versionValue = version.trim()
    if (!nombre || !versionValue) return

    setSaving(true)
    setError('')

    try {
      const updated = await updateSoftware(accessToken, program.id, {
        nombre,
        version: versionValue,
        licencia: license,
        asignaturaIds: subjectIds,
      })
      modalRef.current?.close(() => onUpdated(updated))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo actualizar el software')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      label={`Editar ${program.nombre}`}
      dismissible={!saving}
      onClose={onCancel}
    >
        <div className="device-modal-body">
          <form className="device-form software-edit-form" onSubmit={handleSubmit}>
            <label>
              <span>Programa</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={150} required />
            </label>
            <label>
              <span>Versión</span>
              <input value={version} onChange={(event) => setVersion(event.target.value)} maxLength={50} required />
            </label>
            <div className="device-field">
              <span>Licencia</span>
              <SelectMenu
                id="edit-software-license"
                ariaLabel="Licencia"
                value={license}
                onChange={(next) => setLicense(next as SoftwareLicense)}
                options={SOFTWARE_LICENSES}
                visibleItems={5}
              />
            </div>

            <div className="device-form-wide">
              {subjects.length === 0 ? (
                <p className="subjects-hint">Crea primero una asignatura.</p>
              ) : (
                <div className="subjects-levels">
                  <div className="subjects-levels-head">
                    <span className="subjects-levels-title">Asignaturas</span>
                    <span className="subjects-levels-meta">
                      <span className="subjects-levels-count">{subjectIds.length} de {subjects.length} seleccionadas</span>
                      {subjectIds.length < subjects.length && (
                        <button className="text-button" type="button" onClick={() => setSubjectIds(subjects.map((subject) => subject.id))}>
                          Todas
                        </button>
                      )}
                      {subjectIds.length > 0 && (
                        <button className="text-button" type="button" onClick={() => setSubjectIds([])}>
                          Limpiar
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="subjects-checklist">
                    {subjects.map((subject) => (
                      <label className="subjects-checkbox" key={subject.id}>
                        <input
                          type="checkbox"
                          checked={subjectIds.includes(subject.id)}
                          onChange={() => setSubjectIds((current) => toggleId(current, subject.id))}
                        />
                        <span>{subject.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="error device-form-wide" role="alert">{error}</p>}
            <div className="device-form-actions device-form-wide">
              <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()} disabled={saving}>Cancelar</button>
              <button className="primary-action primary-action-solid" type="submit" disabled={saving || !name.trim() || !version.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  )
}
