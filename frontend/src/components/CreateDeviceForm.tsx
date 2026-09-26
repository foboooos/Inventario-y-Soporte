import { useEffect, useState } from 'react'
import { createInventoryDevice, type CreateDeviceInput } from '../services/inventory'
import { getLocations } from '../services/locations'
import { isSessionExpired } from '../services/http'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import type { Location } from '../types/location'

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
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, saving])

  useEffect(() => {
    let active = true

    getLocations(accessToken)
      .then((loaded) => {
        if (active) setLocations(loaded)
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setError(exception instanceof Error ? exception.message : 'No se pudieron cargar las ubicaciones')
      })
      .finally(() => {
        if (active) setLoadingLocations(false)
      })

    return () => { active = false }
  }, [accessToken, onSessionExpired])

  function updateField<K extends keyof CreateDeviceInput>(field: K, value: CreateDeviceInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const globalLocations = locations
    .filter((item) => item.padreId === null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  const currentLocation = locations.find((item) => item.nombre === form.ubicacion)
  const parentName = currentLocation && currentLocation.padreId !== null
    ? locations.find((item) => item.id === currentLocation.padreId)?.nombre ?? ''
    : form.ubicacion
  const subName = currentLocation && currentLocation.padreId !== null ? form.ubicacion : ''
  const subLocations = currentLocation && currentLocation.padreId !== null
    ? locations.filter((item) => item.padreId === currentLocation.padreId)
    : []

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
    <div className="modal-backdrop device-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="create-device-card modal-card" role="dialog" aria-modal="true" aria-label="Registrar nuevo dispositivo" onMouseDown={(event) => event.stopPropagation()}>
        <div className="device-modal-body">
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
            <label>
              <span>Ubicación</span>
              <select value={parentName} onChange={(event) => updateField('ubicacion', event.target.value)} disabled={loadingLocations} required>
                <option value="">Selecciona una ubicación</option>
                {parentName && !globalLocations.some((item) => item.nombre === parentName) && <option value={parentName}>{parentName}</option>}
                {globalLocations.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </label>
            {subLocations.length > 0 && (
              <label>
                <span>Curso / Sub-ubicación</span>
                <select value={subName} onChange={(event) => updateField('ubicacion', event.target.value || parentName)}>
                  <option value="">Toda la ubicación</option>
                  {subLocations.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
                </select>
              </label>
            )}
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
              <button className="primary-action" type="button" onClick={onCancel}>Cancelar</button>
              <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar dispositivo'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
