import type { CreateTicketInput, DeviceOption, Ticket } from '../types/ticket'
import { apiFetch, readApiJson } from './http'

export async function getDeviceOptions(accessToken: string): Promise<DeviceOption[]> {
  const response = await apiFetch('/inventory/options', accessToken)
  return readApiJson<DeviceOption[]>(response, 'No se pudieron cargar los equipos')
}

export async function createTicket(accessToken: string, input: CreateTicketInput): Promise<Ticket> {
  const response = await apiFetch('/tickets', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readApiJson<Ticket>(response, 'No se pudo crear el ticket')
}
