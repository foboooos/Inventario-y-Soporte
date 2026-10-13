import type { CreateTicketInput, DeviceOption, ResolveTicketInput, Ticket, TicketBitacora, TicketPage, TicketStatus } from '../types/ticket'
import { apiFetch, readApiJson } from './http'

export type TicketPageQuery = {
  page?: number
  limit?: number
}

type TicketPageResponse = {
  data: Ticket[]
  total: number
  page: number
  limit: number
  total_pages: number
}

function toTicketPage(result: TicketPageResponse): TicketPage {
  return {
    tickets: result.data,
    total: result.total,
    page: result.page,
    totalPages: result.total_pages,
  }
}

export async function getDeviceOptions(accessToken: string): Promise<DeviceOption[]> {
  const response = await apiFetch('/inventory/options', accessToken)
  return readApiJson<DeviceOption[]>(response, 'No se pudieron cargar los equipos')
}

export async function getTickets(accessToken: string, query: TicketPageQuery = {}): Promise<TicketPage> {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))

  const qs = params.toString()
  const response = await apiFetch(`/tickets${qs ? `?${qs}` : ''}`, accessToken)
  const result = await readApiJson<TicketPageResponse>(response, 'No se pudo cargar el historial de tickets')
  return toTicketPage(result)
}

export type TicketInboxFilters = {
  estado?: string
  ubicacion?: string
  desde?: string
  hasta?: string
}

export async function getTicketInbox(accessToken: string, filters: TicketInboxFilters = {}, query: TicketPageQuery = {}): Promise<TicketPage> {
  const params = new URLSearchParams()
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.ubicacion) params.set('ubicacion', filters.ubicacion)
  if (filters.desde) params.set('desde', filters.desde)
  if (filters.hasta) params.set('hasta', filters.hasta)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))

  const queryString = params.toString()
  const response = await apiFetch(`/tickets/inbox${queryString ? `?${queryString}` : ''}`, accessToken)
  const result = await readApiJson<TicketPageResponse>(response, 'No se pudo cargar la bandeja de tickets')
  return toTicketPage(result)
}

export async function resolveTicket(accessToken: string, ticketId: number, input: ResolveTicketInput): Promise<Ticket> {
  const response = await apiFetch(`/tickets/${ticketId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return readApiJson<Ticket>(response, 'No se pudo guardar la resolución del ticket')
}

export async function updateTicketStatus(accessToken: string, ticketId: number, estado: TicketStatus): Promise<Ticket> {
  const response = await apiFetch(`/tickets/${ticketId}/status`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  })
  return readApiJson<Ticket>(response, 'No se pudo actualizar el estado del ticket')
}

export async function getTicketBitacora(accessToken: string, ticketId: number): Promise<TicketBitacora> {
  const response = await apiFetch(`/tickets/${ticketId}/bitacora`, accessToken)
  return readApiJson<TicketBitacora>(response, 'No se pudo cargar la bitácora del ticket')
}

export async function createTicket(accessToken: string, input: CreateTicketInput): Promise<Ticket> {
  const response = await apiFetch('/tickets', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readApiJson<Ticket>(response, 'No se pudo crear el ticket')
}
