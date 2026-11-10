import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isSessionExpired } from '../services/http'
import { updateUser } from '../services/users'
import type { UpdateUserInput, User, UserRole } from '../types/user'
import { emailFromName, localPartOfEmail, USER_EMAIL_DOMAIN } from '../utils/email'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { SelectMenu } from './SelectMenu'

const roleOptions = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'ADMIN', label: 'Administrador' },
]

type EditUserFormState = Omit<UpdateUserInput, 'email'>

type EditUserFormProps = {
  accessToken: string
  user: User
  isSelf: boolean
  onUpdated: (user: User) => void
  onCancel: () => void
  onSessionExpired: () => void
}

export function EditUserForm({ accessToken, user, isSelf, onUpdated, onCancel, onSessionExpired }: EditUserFormProps) {
  const [form, setForm] = useState<EditUserFormState>({
    nombre: user.nombre,
    fecha_nacimiento: user.fecha_nacimiento ?? '',
    rol: user.rol,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  function updateField<K extends keyof EditUserFormState>(field: K, value: EditUserFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nombre = form.nombre.trim()
    const email = emailFromName(nombre)
    if (!nombre || !localPartOfEmail(email)) return

    setSaving(true)
    setError('')

    try {
      const updated = await updateUser(accessToken, user.rut, {
        nombre,
        email,
        rol: form.rol,
        ...(form.fecha_nacimiento ? { fecha_nacimiento: form.fecha_nacimiento } : {}),
      })
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
        <form className="device-form" onSubmit={handleSubmit}>
          <label className="field-float" htmlFor="edit-user-rut">
            <span>RUT</span>
            <input id="edit-user-rut" value={user.rut} readOnly />
          </label>
          <label className="field-float" htmlFor="edit-user-name">
            <span>Nombre</span>
            <input
              id="edit-user-name"
              value={form.nombre}
              onChange={(event) => updateField('nombre', event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label className="field-float" htmlFor="edit-user-email">
            <span>Email</span>
            <div className="email-input-group">
              <input
                id="edit-user-email"
                type="text"
                value={localPartOfEmail(emailFromName(form.nombre))}
                readOnly
                aria-label="Correo generado desde el nombre"
              />
              <span className="email-input-suffix">{USER_EMAIL_DOMAIN}</span>
            </div>
          </label>
          <label className="field-float" htmlFor="edit-user-birth-date">
            <span>Fecha de nacimiento</span>
            <input
              id="edit-user-birth-date"
              type="date"
              value={form.fecha_nacimiento ?? ''}
              onChange={(event) => updateField('fecha_nacimiento', event.target.value)}
            />
          </label>
          <div className="device-field field-float">
            <span>Rol</span>
            <SelectMenu
              id="edit-user-role"
              ariaLabel={isSelf ? 'Rol del usuario (no editable para tu propio usuario)' : 'Rol del usuario'}
              value={form.rol}
              onChange={(next) => updateField('rol', next as UserRole)}
              options={roleOptions}
              visibleItems={3}
              disabled={isSelf}
            />
            {isSelf && <span className="device-field-hint">No puedes modificar tu propio rol.</span>}
          </div>
          {error && <p className="error device-form-wide" role="alert">{error}</p>}
          <div className="device-form-actions device-form-wide">
            <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()} disabled={saving}>
              Cancelar
            </button>
            <button
              className="primary-action primary-action-solid"
              type="submit"
              disabled={saving || !form.nombre.trim() || !localPartOfEmail(emailFromName(form.nombre))}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
