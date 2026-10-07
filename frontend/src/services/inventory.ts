import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import { apiFetch, readApiJson } from './http'

export type CreateDeviceInput = {
  codigo_inventario: string
  tipo: DeviceType
  marca: string
  modelo: string
  ubicacion: string
  estado: DeviceStatus
}

export type UpdateDeviceInput = CreateDeviceInput

type InventoryApiDevice = {
  id_dispositivo: number
  codigo_inventario: string
  tipo: Device['type']
  marca: string | null
  modelo: string | null
  ubicacion: string
  estado: Device['status']
}

function mapApiDevice(device: InventoryApiDevice): Device {
  return {
    id: device.id_dispositivo,
    code: device.codigo_inventario,
    type: device.tipo,
    brand: device.marca ?? 'Sin marca',
    model: device.modelo ?? 'Sin modelo',
    location: device.ubicacion,
    status: device.estado,
  }
}

export async function createInventoryDevice(accessToken: string, input: CreateDeviceInput): Promise<Device> {
  const response = await apiFetch('/inventory', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const device = await readApiJson<InventoryApiDevice>(response, 'No se pudo registrar el dispositivo')

  return mapApiDevice(device)
}

export async function updateInventoryDevice(accessToken: string, id: number, input: UpdateDeviceInput): Promise<Device> {
  const response = await apiFetch(`/inventory/${id}`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const device = await readApiJson<InventoryApiDevice>(response, 'No se pudo actualizar el dispositivo')

  return mapApiDevice(device)
}

export type InventoryQuery = {
  search?: string
  estado?: DeviceStatus
  page?: number
  limit?: number
  sortBy?: 'code' | 'location' | 'status'
  sortDir?: 'asc' | 'desc'
}

export type InventorySummary = {
  total: number
  activo: number
  inactivo: number
  baja_tecnica: number
}

export type InventoryResult = {
  devices: Device[]
  total: number
  page: number
  totalPages: number
  summary: InventorySummary
}

type InventoryResponse = {
  data: InventoryApiDevice[]
  total: number
  page: number
  limit: number
  total_pages: number
  summary: InventorySummary
}

export async function getInventory(accessToken: string, query: InventoryQuery = {}): Promise<InventoryResult> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.estado) params.set('estado', query.estado)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)

  const qs = params.toString()
  const response = await apiFetch(`/inventory${qs ? `?${qs}` : ''}`, accessToken)
  const result = await readApiJson<InventoryResponse>(response, 'No se pudo cargar el inventario')

  return {
    devices: result.data.map(mapApiDevice),
    total: result.total,
    page: result.page,
    totalPages: result.total_pages,
    summary: result.summary,
  }
}
