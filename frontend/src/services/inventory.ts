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

export async function getInventory(accessToken: string): Promise<Device[]> {
  const response = await apiFetch('/inventory', accessToken)
  const devices = await readApiJson<InventoryApiDevice[]>(response, 'No se pudo cargar el inventario')

  return devices.map(mapApiDevice)
}
