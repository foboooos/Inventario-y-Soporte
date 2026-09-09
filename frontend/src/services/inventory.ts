import type { Device, DeviceStatus, DeviceType } from '../types/inventory'

export type CreateDeviceInput = {
  codigo_inventario: string
  tipo: DeviceType
  marca: string
  modelo: string
  ubicacion: string
  estado: DeviceStatus
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type InventoryApiDevice = {
  id_dispositivo: number
  codigo_inventario: string
  tipo: Device['type']
  marca: string | null
  modelo: string | null
  ubicacion: string
  estado: Device['status']
}

export async function createInventoryDevice(accessToken: string, input: CreateDeviceInput): Promise<Device> {
  const response = await fetch(`${API_URL}/inventory`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const data = await response.json() as {
    id_dispositivo?: number
    codigo_inventario?: string
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message ?? 'No se pudo registrar el dispositivo')
  }

  return {
    id: data.id_dispositivo!,
    code: data.codigo_inventario!,
    type: input.tipo,
    brand: input.marca || 'Sin marca',
    model: input.modelo || 'Sin modelo',
    location: input.ubicacion,
    status: input.estado,
  }
}

export async function getInventory(accessToken: string): Promise<Device[]> {
  const response = await fetch(`${API_URL}/inventory`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await response.json()) as InventoryApiDevice[] | { message?: string }

  if (!response.ok) {
    throw new Error('message' in data && data.message ? data.message : 'No se pudo cargar el inventario')
  }

  return (data as InventoryApiDevice[]).map((device) => ({
    id: device.id_dispositivo,
    code: device.codigo_inventario,
    type: device.tipo,
    brand: device.marca ?? 'Sin marca',
    model: device.modelo ?? 'Sin modelo',
    location: device.ubicacion,
    status: device.estado,
  }))
}
