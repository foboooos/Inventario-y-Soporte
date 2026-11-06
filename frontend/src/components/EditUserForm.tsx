import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isSessionExpired } from '../services/http'
import { updateUser } from '../services/users'
import type { UpdateUserInput, User, UserRole } from '../types/user'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { SelectMenu } from './SelectMenu'

const roleOptions = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'ADMIN', label: 'Administrador' },
]

type EditUserFormProps = {
  accessToken: string
  user: User
  onUpdated: (user: User) => void
  onCancel: () => void
  onSessionExpired: () => void
}

export function EditUserForm({ accessToken, user, onUpdated, onCancel, onSessionExpired }: EditUserFormProps) {
  const [form, setForm] = useState<UpdateUserInput>({
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  function updateField<K extends keyof UpdateUserInput>(field: K, value: UpdateUserInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = form.nombre.trim()
    const email = form.email.trim()
    if (!nombre || !email) return

    setSaving(true)
    setError('')

    try {
      const updated = await updateUser(accessToken, user.rut, { nombre, email, rol: form.rol })
      modalRef.current?.close(() => onUpdated(updated))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo actualizar el usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      label={`Editar usuario ${user.nombre}`}
      backdropClassName="device-modal-backdrop"
      cardClassName="create-device-card modal-card create-user-modal"
      dismissible={!saving}
      onClose={onCancel}
    >
      <div className="device-modal-body">
        <h2 className="config-dialog-title">Editar usuario</h2>
        <form className="device-form" onSubmit={handleSubmit}>
          <label>
            <span>RUT</span>
            <input value={user.rut} readOnly />
          </label>
          <label>
            <span>Nombre</span>
            <input
              value={form.nombre}
              onChange={(event) => updateField('nombre', event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              maxLength={150}
              required
            />
          </label>
          <div className="device-field">
            <span>Rol</span>
            <SelectMenu
              id="edit-user-role"
              ariaLabel="Rol del usuario"
              value={form.rol}
              onChange={(next) => updateField('rol', next as UserRole)}
              options={roleOptions}
              visibleItems={3}
            />
          </div>
          {error && <p className="error device-form-wide" role="alert">{error}</p>}
          <div className="device-form-actions device-form-wide">
            <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()} disabled={saving}>
              Cancelar
            </button>
            <button
              className="primary-action primary-action-solid"
              type="submit"
              disabled={saving || !form.nombre.trim() || !form.email.trim()}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
