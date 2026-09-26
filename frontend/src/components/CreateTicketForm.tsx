import { useEffect, useMemo, useState } from 'react'
import { createTicket, getDeviceOptions } from '../services/tickets'
import { getLocations } from '../services/locations'
import { isSessionExpired } from '../services/http'
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

  const locationDevices = useMemo(
    () => (location ? devices.filter((device) => device.ubicacion === location) : []),
    [devices, location],
  )
  const effectiveDeviceId = locationDevices.some((device) => String(device.id_dispositivo) === deviceId)
    ? deviceId
    : ''

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await createTicket(accessToken, {
        ubicacion: location,
        sintoma: symptom.trim(),
        ...(effectiveDeviceId ? { id_dispositivo: Number(effectiveDeviceId) } : {}),
      })
      setLocation('')
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
        <div>
          <h2 id="new-ticket-title">Reportar un problema</h2>
          <p>Cuéntanos qué está fallando y en qué equipo.</p>
        </div>
      </div>
      <form className="ticket-form" onSubmit={handleSubmit}>
        <label>
          <span>Ubicación</span>
          <select value={location} onChange={(event) => { setLocation(event.target.value); setDeviceId('') }} required disabled={loadingLocations}>
            <option value="">Selecciona una ubicación</option>
            {locations.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
          </select>
        </label>
        <label>
          <span>Equipo afectado <em>(opcional)</em></span>
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} disabled={loadingDevices || !location}>
            <option value="">No corresponde o no lo sé</option>
            {locationDevices.map((device) => <option key={device.id_dispositivo} value={device.id_dispositivo}>{formatDeviceLabel(device)}</option>)}
          </select>
        </label>
        <label className="ticket-form-wide">
          <span>Describe el síntoma</span>
          <textarea value={symptom} onChange={(event) => setSymptom(event.target.value)} placeholder="Cuéntanos qué está ocurriendo…" maxLength={2000} rows={6} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary-action" type="submit" disabled={submitting || !location || !symptom.trim()}>{submitting ? 'Enviando…' : 'Enviar solicitud'}</button>
      </form>
    </section>
  )
}
