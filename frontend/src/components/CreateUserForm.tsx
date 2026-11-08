import { useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { isSessionExpired } from '../services/http'
import { createUser } from '../services/users'
import type { User, UserRole } from '../types/user'
import { buildUserEmail, USER_EMAIL_DOMAIN } from '../utils/email'
import { formatRut, rutCaretPosition } from '../utils/rut'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { SelectMenu } from './SelectMenu'

const roleOptions = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'ADMIN', label: 'Administrador' },
]

const initialForm = {
  rut: '',
  nombre: '',
  email: '',
  rol: 'DOCENTE' as UserRole,
}

type CreateUserFormProps = {
  accessToken: string
  onClose: () => void
  onCreated: (user: User) => void
  onSessionExpired: () => void
}

export function CreateUserForm({ accessToken, onClose, onCreated, onSessionExpired }: CreateUserFormProps) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const rutInputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)
  const modalRef = useRef<ModalHandle>(null)

  useLayoutEffect(() => {
    if (caretRef.current === null) return
    rutInputRef.current?.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [form.rut])

  function updateField<K extends keyof typeof initialForm>(field: K, value: (typeof initialForm)[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleRutChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const caret = input.selectionStart ?? input.value.length
    const digitsBefore = input.value.slice(0, caret).replace(/[^0-9kK]/g, '').length
    const formatted = formatRut(input.value)

    if (formatted === form.rut) {
      input.value = formatted
      const position = rutCaretPosition(formatted, digitsBefore)
      input.setSelectionRange(position, position)
      return
    }

    caretRef.current = rutCaretPosition(formatted, digitsBefore)
    updateField('rut', formatted)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const rut = form.rut.trim()
    const nombre = form.nombre.trim()
    const email = buildUserEmail(form.email)
    if (!rut || !nombre || !form.email.trim()) return

    setSaving(true)
    setError('')

    try {
      const created = await createUser(accessToken, { rut, nombre, email, rol: form.rol })
      modalRef.current?.close(() => onCreated(created))
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo crear el usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      ref={modalRef}
      label="Crear usuario"
      backdropClassName="device-modal-backdrop"
      cardClassName="create-device-card modal-card create-user-modal"
      dismissible={!saving}
      onClose={onClose}
    >
        <div className="device-modal-body">
          <form className="device-form" onSubmit={handleSubmit}>
            <label>
              <span>RUT</span>
              <input
                ref={rutInputRef}
                value={form.rut}
                onChange={handleRutChange}
                placeholder="12.345.678-9"
                maxLength={12}
                required
              />
            </label>
            <label>
              <span>Nombre</span>
              <input
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                placeholder="Nombre y apellido"
                maxLength={100}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <div className="email-input-group">
                <input
                  type="text"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value.replace(/@.*$/, ''))}
                  placeholder="nombre.apellido"
                  maxLength={150 - USER_EMAIL_DOMAIN.length}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
                <span className="email-input-suffix">{USER_EMAIL_DOMAIN}</span>
              </div>
            </label>
            <div className="device-field">
              <span>Rol</span>
              <SelectMenu
                id="config-user-role"
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
                disabled={saving || !form.rut.trim() || !form.nombre.trim() || !form.email.trim()}
              >
                {saving ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  )
}
