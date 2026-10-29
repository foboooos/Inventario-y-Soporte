import { useEffect, useMemo, useState } from 'react'
import { createTicket, getDeviceOptions } from '../services/tickets'
import { getLocations } from '../services/locations'
import { isSessionExpired } from '../services/http'
import { SelectMenu } from './SelectMenu'
import type { DeviceType } from '../types/inventory'
import type { Location } from '../types/location'
import type { DeviceOption } from '../types/ticket'

type CreateTicketFormProps = {
  accessToken: string
  onSessionExpired: () => void
  onTicketCreated: () => void
}

const typeLabels: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'Proyector',
  IMPRESORA: 'Impresora',
  RED: 'Equipo de red',
}

function formatDeviceLabel(device: DeviceOption): string {
  const type = device.tipo ? typeLabels[device.tipo] : ''
  const details = [device.marca, device.modelo].filter(Boolean).join(' ')
  const description = [type, details].filter(Boolean).join(' ')
  return description ? `${description} (${device.codigo_inventario})` : device.codigo_inventario
}

export function CreateTicketForm({ accessToken, onSessionExpired, onTicketCreated }: CreateTicketFormProps) {
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [location, setLocation] = useState('')
  const [subLocation, setSubLocation] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [symptom, setSymptom] = useState('')
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getDeviceOptions(accessToken)
      .then((options) => {
        if (active) setDevices(options)
      })
      .catch((exception: unknown) => {
        if (!active) return
        if (isSessionExpired(exception)) {
          onSessionExpired()
          return
        }
        setError(exception instanceof Error ? exception.message : 'No se pudieron cargar los equipos')
      })
      .finally(() => {
        if (active) setLoadingDevices(false)
      })

    return () => { active = false }
  }, [accessToken, onSessionExpired])

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

  const globalLocations = useMemo(
    () => locations
      .filter((item) => item.padreId === null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [locations],
  )

  const subLocations = useMemo(() => {
    const parent = locations.find((item) => item.padreId === null && item.nombre === location)
    return parent ? locations.filter((item) => item.padreId === parent.id) : []
  }, [locations, location])

  const allowedLocations = useMemo(() => {
    if (subLocation) return new Set([subLocation])
    return new Set([location, ...subLocations.map((item) => item.nombre)])
  }, [location, subLocation, subLocations])

  const locationDevices = useMemo(
    () => (location ? devices.filter((device) => allowedLocations.has(device.ubicacion)) : []),
    [devices, location, allowedLocations],
  )
  const effectiveDeviceId = locationDevices.some((device) => String(device.id_dispositivo) === deviceId)
    ? deviceId
    : ''

  const resolvedLocation = subLocation || location

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await createTicket(accessToken, {
        ubicacion: resolvedLocation,
        sintoma: symptom.trim(),
        ...(effectiveDeviceId ? { id_dispositivo: Number(effectiveDeviceId) } : {}),
      })
      setLocation('')
      setSubLocation('')
      setDeviceId('')
      setSymptom('')
      onTicketCreated()
    } catch (exception: unknown) {
      if (isSessionExpired(exception)) {
        onSessionExpired()
        return
      }
      setError(exception instanceof Error ? exception.message : 'No se pudo crear el ticket')
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <section className="support-card ticket-form-card" aria-labelledby="new-ticket-title">
      <div className="form-heading">
        <h2 id="new-ticket-title">Reportar un problema</h2>
      </div>
      <form className="ticket-form" onSubmit={handleSubmit}>
        <div className="ticket-field">
          <span>Ubicación</span>
          <SelectMenu
            id="ticket-location"
            ariaLabel="Ubicación"
            placeholder="Selecciona una ubicación"
            value={location}
            disabled={loadingLocations}
            onChange={(next) => { setLocation(next); setSubLocation(''); setDeviceId('') }}
            options={[
              { value: '', label: 'Selecciona una ubicación' },
              ...globalLocations.map((item) => ({ value: item.nombre, label: item.nombre })),
            ]}
          />
        </div>
        {subLocations.length > 0 && (
          <div className="ticket-field">
            <span>Curso / Sub-ubicación</span>
            <SelectMenu
              id="ticket-sublocation"
              ariaLabel="Curso o sub-ubicación"
              placeholder="Toda la ubicación"
              value={subLocation}
              onChange={(next) => { setSubLocation(next); setDeviceId('') }}
              options={[
                { value: '', label: 'Toda la ubicación' },
                ...subLocations.map((item) => ({ value: item.nombre, label: item.nombre })),
              ]}
            />
          </div>
        )}
        <div className="ticket-field">
          <span>Equipo afectado <em>(opcional)</em></span>
          <SelectMenu
            id="ticket-device"
            ariaLabel="Equipo afectado"
            placeholder="No corresponde o no lo sé"
            value={deviceId}
            disabled={loadingDevices || !location}
            onChange={setDeviceId}
            options={[
              { value: '', label: 'No corresponde o no lo sé' },
              ...locationDevices.map((device) => ({ value: String(device.id_dispositivo), label: formatDeviceLabel(device) })),
            ]}
          />
        </div>
        <label className="ticket-form-wide">
          <span>Describe el problema</span>
          <textarea value={symptom} onChange={(event) => setSymptom(event.target.value)} placeholder="Cuéntanos qué está ocurriendo…" maxLength={2000} rows={6} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary-action" type="submit" disabled={submitting || !resolvedLocation || !symptom.trim()}>{submitting ? 'Enviando…' : 'Enviar solicitud'}</button>
      </form>
    </section>
  )
}
