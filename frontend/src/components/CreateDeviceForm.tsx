import { useEffect, useRef, useState } from 'react'
import { createInventoryDevice, getNextDeviceCode, type CreateDeviceInput } from '../services/inventory'
import { getLocations } from '../services/locations'
import { isSessionExpired } from '../services/http'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import type { Location } from '../types/location'
import { Modal } from './Modal'
import type { ModalHandle } from './Modal'
import { SelectMenu } from './SelectMenu'

type CreateDeviceFormProps = {
  accessToken: string
  onCreated: (device: Device) => void
  onCancel: () => void
  onSessionExpired: () => void
}

const initialForm: CreateDeviceInput = {
  tipo: 'PC',
  marca: '',
  modelo: '',
  ubicacion: '',
  estado: 'ACTIVO',
}

const DEVICE_TYPE_SIGLAS: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'PRY',
  IMPRESORA: 'IMP',
  RED: 'RED',
}

export function CreateDeviceForm({ accessToken, onCreated, onCancel, onSessionExpired }: CreateDeviceFormProps) {
  const [form, setForm] = useState(initialForm)
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nextCode, setNextCode] = useState('')
  const [nextCodeError, setNextCodeError] = useState('')
  const modalRef = useRef<ModalHandle>(null)

  useEffect(() => {
    if (!form.ubicacion) return

    let active = true

    getNextDeviceCode(accessToken, form.tipo, form.ubicacion)
      .then((codigo) => {
        if (!active) return
        setNextCode(codigo)
        setNextCodeError('')
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setNextCode('')
        setNextCodeError(exception instanceof Error ? exception.message : 'No se pudo calcular el código')
      })

    return () => {
      active = false
    }
  }, [accessToken, form.tipo, form.ubicacion, onSessionExpired])

  const displayedCode = form.ubicacion ? nextCode : ''
  const displayedCodeError = form.ubicacion ? nextCodeError : ''
  const codePreview = `${DEVICE_TYPE_SIGLAS[form.tipo]}-XXX-0000`

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
  const parentLocation = currentLocation && currentLocation.padreId !== null
    ? locations.find((item) => item.id === currentLocation.padreId)
    : currentLocation
  const parentName = parentLocation?.nombre ?? form.ubicacion
  const subName = currentLocation && currentLocation.padreId !== null ? form.ubicacion : ''
  const subLocations = parentLocation
    ? locations.filter((item) => item.padreId === parentLocation.id)
    : []

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!form.ubicacion) {
      setError('Selecciona una ubicación')
      return
    }

    if (nextCodeError) {
      setError(nextCodeError)
      return
    }
    setSaving(true)

    try {
      const createdDevice = await createInventoryDevice(accessToken, form)
      modalRef.current?.close(() => onCreated(createdDevice))
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
    <Modal
      ref={modalRef}
      label="Registrar nuevo dispositivo"
      backdropClassName="device-modal-backdrop"
      dismissible={!saving}
      onClose={onCancel}
    >
        <div className="device-modal-body">
          <form className="device-form create-device-form" onSubmit={handleSubmit}>
            <label className="field-float">
              <span>Código</span>
              <input
                className="code-preview-input"
                value={displayedCode}
                readOnly
                placeholder={codePreview}
                title="Se genera automáticamente"
                aria-describedby={displayedCodeError ? 'device-code-error' : undefined}
              />
            </label>
            {displayedCodeError && (
              <p className="error device-form-wide" id="device-code-error" role="status">{displayedCodeError}</p>
            )}
            <div className="device-field field-float">
              <span>Tipo</span>
              <SelectMenu
                id="device-type"
                ariaLabel="Tipo"
                value={form.tipo}
                onChange={(next) => {
                  setNextCodeError('')
                  updateField('tipo', next as DeviceType)
                }}
                options={[
                  { value: 'PC', label: 'PC' },
                  { value: 'PROYECTOR', label: 'Proyector' },
                  { value: 'IMPRESORA', label: 'Impresora' },
                  { value: 'RED', label: 'Red' },
                ]}
              />
            </div>
            <label className="field-float">
              <span>Marca</span>
              <input value={form.marca} onChange={(event) => updateField('marca', event.target.value)} maxLength={50} />
            </label>
            <label className="field-float">
              <span>Modelo</span>
              <input value={form.modelo} onChange={(event) => updateField('modelo', event.target.value)} maxLength={50} />
            </label>
            <div className="device-field device-field-wide field-float">
              <span>Ubicación</span>
              <SelectMenu
                id="device-location"
                ariaLabel="Ubicación"
                placeholder="Selecciona una ubicación"
                value={parentName}
                disabled={loadingLocations}
                onChange={(next) => {
                  setNextCodeError('')
                  updateField('ubicacion', next)
                }}
                options={[
                  { value: '', label: 'Selecciona una ubicación' },
                  ...(parentName && !globalLocations.some((item) => item.nombre === parentName) ? [{ value: parentName, label: parentName }] : []),
                  ...globalLocations.map((item) => ({ value: item.nombre, label: item.nombre })),
                ]}
                fixedList
              />
            </div>
            <div className="device-field device-field-wide field-float">
              <span>Estado</span>
              <SelectMenu
                id="device-status"
                ariaLabel="Estado"
                value={form.estado}
                onChange={(next) => updateField('estado', next as DeviceStatus)}
                options={[
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'INACTIVO', label: 'Inactivo' },
                  { value: 'BAJA_TECNICA', label: 'Baja técnica' },
                ]}
              />
            </div>
            {subLocations.length > 0 && (
              <div className="device-field field-float">
                <span>Curso / Sub-ubicación</span>
                <SelectMenu
                  id="device-sublocation"
                  ariaLabel="Curso o sub-ubicación"
                  placeholder="Toda la ubicación"
                  value={subName}
                  onChange={(next) => {
                    setNextCodeError('')
                    updateField('ubicacion', next || parentName)
                  }}
                  options={[
                    { value: '', label: 'Toda la ubicación' },
                    ...subLocations.map((item) => ({ value: item.nombre, label: item.nombre })),
                  ]}
                />
              </div>
            )}
            {error && <p className="error device-form-wide" role="alert">{error}</p>}
            <div className="device-form-actions device-form-wide">
              <button className="secondary-button" type="button" onClick={() => modalRef.current?.close()}>Cancelar</button>
              <button className="primary-action primary-action-solid" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar dispositivo'}</button>
            </div>
          </form>
        </div>
    </Modal>
  )
}
