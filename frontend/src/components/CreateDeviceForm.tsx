import { useState } from 'react'
import { createInventoryDevice, type CreateDeviceInput } from '../services/inventory'
import { isSessionExpired } from '../services/http'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'

type CreateDeviceFormProps = {
  accessToken: string
  onCreated: (device: Device) => void
  onCancel: () => void
  onSessionExpired: () => void
}

const initialForm: CreateDeviceInput = {
  codigo_inventario: '',
  tipo: 'PC',
  marca: '',
  modelo: '',
  ubicacion: '',
  estado: 'ACTIVO',
}

export function CreateDeviceForm({ accessToken, onCreated, onCancel, onSessionExpired }: CreateDeviceFormProps) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof CreateDeviceInput>(field: K, value: CreateDeviceInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const createdDevice = await createInventoryDevice(accessToken, form)
      onCreated(createdDevice)
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo registrar el dispositivo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="create-device-card modal-card" role="dialog" aria-modal="true" aria-labelledby="create-device-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="form-heading">
        <div>
          <span className="eyebrow">Administración</span>
          <h2 id="create-device-title">Registrar nuevo dispositivo</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Cerrar formulario" onClick={onCancel}>×</button>
      </div>

      <form className="device-form" onSubmit={handleSubmit}>
        <label>
          <span>Código de inventario</span>
          <input value={form.codigo_inventario} onChange={(event) => updateField('codigo_inventario', event.target.value)} placeholder="DV-PC-004" required maxLength={50} />
        </label>
        <label>
          <span>Tipo</span>
          <select value={form.tipo} onChange={(event) => updateField('tipo', event.target.value as DeviceType)}>
            <option value="PC">PC</option>
            <option value="PROYECTOR">Proyector</option>
            <option value="IMPRESORA">Impresora</option>
            <option value="RED">Red</option>
          </select>
        </label>
        <label>
          <span>Marca</span>
          <input value={form.marca} onChange={(event) => updateField('marca', event.target.value)} maxLength={50} />
        </label>
        <label>
          <span>Modelo</span>
          <input value={form.modelo} onChange={(event) => updateField('modelo', event.target.value)} maxLength={50} />
        </label>
        <label className="device-form-wide">
          <span>Ubicación</span>
          <input value={form.ubicacion} onChange={(event) => updateField('ubicacion', event.target.value)} placeholder="Laboratorio 1" required maxLength={100} />
        </label>
        <label>
          <span>Estado</span>
          <select value={form.estado} onChange={(event) => updateField('estado', event.target.value as DeviceStatus)}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="BAJA_TECNICA">Baja técnica</option>
          </select>
        </label>
        {error && <p className="error device-form-wide" role="alert">{error}</p>}
        <div className="device-form-actions device-form-wide">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar dispositivo'}</button>
        </div>
        </form>
      </section>
    </div>
  )
}
