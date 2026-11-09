import type { DeviceStatus, DeviceType } from '../types/inventory'

export const ticketLogDeviceLabels: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'Proyector',
  IMPRESORA: 'Impresora',
  RED: 'Red',
}

export const ticketLogStatusLabels: Record<DeviceStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  BAJA_TECNICA: 'Baja técnica',
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: false,
})

export function formatTicketLogDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return dateFormatter.format(date)
}

export function ticketLogSolutionSteps(solucion?: string | null) {
  return (solucion ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
