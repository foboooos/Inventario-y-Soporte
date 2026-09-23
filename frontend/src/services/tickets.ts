import type { CreateTicketInput, DeviceOption, ResolveTicketInput, Ticket } from '../types/ticket'
import { apiFetch, readApiJson } from './http'

export async function getDeviceOptions(accessToken: string): Promise<DeviceOption[]> {
  const response = await apiFetch('/inventory/options', accessToken)
  return readApiJson<DeviceOption[]>(response, 'No se pudieron cargar los equipos')
}

export async function getTickets(accessToken: string): Promise<Ticket[]> {
  const response = await apiFetch('/tickets', accessToken)
  return readApiJson<Ticket[]>(response, 'No se pudo cargar el historial de tickets')
}

export async function getTicketInbox(accessToken: string): Promise<Ticket[]> {
  const response = await apiFetch('/tickets/inbox', accessToken)
  return readApiJson<Ticket[]>(response, 'No se pudo cargar la bandeja de tickets')
}

export async function deleteTicket(accessToken: string, ticketId: number): Promise<void> {
  const response = await apiFetch(`/tickets/${ticketId}`, accessToken, { method: 'DELETE' })
  if (!response.ok) {
    await readApiJson<never>(response, 'No se pudo eliminar el ticket')
  }
}

export async function resolveTicket(accessToken: string, ticketId: number, input: ResolveTicketInput): Promise<Ticket> {
  const response = await apiFetch(`/tickets/${ticketId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return readApiJson<Ticket>(response, 'No se pudo guardar la resolución del ticket')
}

export async function createTicket(accessToken: string, input: CreateTicketInput): Promise<Ticket> {
  const response = await apiFetch('/tickets', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readApiJson<Ticket>(response, 'No se pudo crear el ticket')
}
