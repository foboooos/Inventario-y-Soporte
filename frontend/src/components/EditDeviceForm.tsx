import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { updateInventoryDevice, type UpdateDeviceInput } from '../services/inventory'
import { getLocations } from '../services/locations'
import { isSessionExpired } from '../services/http'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import type { Location } from '../types/location'

type EditDeviceFormProps = {
  accessToken: string
  device: Device
  onUpdated: (device: Device) => void
  onCancel: () => void
  onSessionExpired: () => void
}

function deviceToForm(device: Device): UpdateDeviceInput {
  return {
    codigo_inventario: device.code,
    tipo: device.type,
    marca: device.brand === 'Sin marca' ? '' : device.brand,
    modelo: device.model === 'Sin modelo' ? '' : device.model,
    ubicacion: device.location,
    estado: device.status,
  }
}

export function EditDeviceForm({ accessToken, device, onUpdated, onCancel, onSessionExpired }: EditDeviceFormProps) {
  const [form, setForm] = useState(() => deviceToForm(device))
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

  function updateField<K extends keyof UpdateDeviceInput>(field: K, value: UpdateDeviceInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const updatedDevice = await updateInventoryDevice(accessToken, device.id, form)
      onUpdated(updatedDevice)
    } catch (exception) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo actualizar el dispositivo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop device-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="create-device-card modal-card" role="dialog" aria-modal="true" aria-label={`Editar dispositivo ${device.code}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="device-modal-body">
          <form className="device-form" onSubmit={handleSubmit}>
            <label>
              <span>Código de inventario</span>
              <input value={form.codigo_inventario} onChange={(event) => updateField('codigo_inventario', event.target.value)} required maxLength={50} />
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
              <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
