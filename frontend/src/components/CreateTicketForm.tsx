import { useEffect, useMemo, useState } from 'react'
import { createTicket, getDeviceOptions } from '../services/tickets'
import { isSessionExpired } from '../services/http'
import type { DeviceOption } from '../types/ticket'

type CreateTicketFormProps = {
  accessToken: string
  onSessionExpired: () => void
  onTicketCreated: () => void
}

const OTHER_LOCATION = '__OTHER__'

export function CreateTicketForm({ accessToken, onSessionExpired, onTicketCreated }: CreateTicketFormProps) {
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [location, setLocation] = useState('')
  const [customLocation, setCustomLocation] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [symptom, setSymptom] = useState('')
  const [loadingDevices, setLoadingDevices] = useState(true)
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

  const locations = useMemo(() => [...new Set(devices.map((device) => device.ubicacion))].sort(), [devices])
  const resolvedLocation = location === OTHER_LOCATION ? customLocation.trim() : location
  const locationDevices = useMemo(
    () => resolvedLocation && location !== OTHER_LOCATION
      ? devices.filter((device) => device.ubicacion === resolvedLocation)
      : devices,
    [devices, location, resolvedLocation],
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
        ubicacion: resolvedLocation,
        sintoma: symptom.trim(),
        ...(effectiveDeviceId ? { id_dispositivo: Number(effectiveDeviceId) } : {}),
      })
      setLocation('')
      setCustomLocation('')
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
        </div>
      </div>
      <form className="ticket-form" onSubmit={handleSubmit}>
        <label>
          <span>Ubicación</span>
          <select value={location} onChange={(event) => { setLocation(event.target.value); setDeviceId('') }} required>
            <option value="">Selecciona una ubicación</option>
            {locations.map((option) => <option key={option} value={option}>{option}</option>)}
            <option value={OTHER_LOCATION}>Otra ubicación</option>
          </select>
        </label>
        {location === OTHER_LOCATION && (
          <label>
            <span>Indica la ubicación</span>
            <input value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} maxLength={100} required />
          </label>
        )}
        <label>
          <span>Equipo afectado <em>(opcional)</em></span>
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} disabled={loadingDevices}>
            <option value="">No corresponde o no lo sé</option>
            {locationDevices.map((device) => <option key={device.id_dispositivo} value={device.id_dispositivo}>{device.codigo_inventario} · {device.ubicacion}</option>)}
          </select>
        </label>
        <label className="ticket-form-wide">
          <span>Describe el síntoma</span>
          <textarea value={symptom} onChange={(event) => setSymptom(event.target.value)} placeholder="Cuéntanos qué está ocurriendo…" maxLength={2000} rows={6} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary-action" type="submit" disabled={submitting || !resolvedLocation || !symptom.trim()}>{submitting ? 'Enviando…' : 'Enviar solicitud'}</button>
      </form>
    </section>
  )
}
