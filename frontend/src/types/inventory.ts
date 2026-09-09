export type DeviceType = 'PC' | 'PROYECTOR' | 'IMPRESORA' | 'RED'
export type DeviceStatus = 'ACTIVO' | 'INACTIVO' | 'BAJA_TECNICA'

export type Device = {
  id: number
  code: string
  type: DeviceType
  brand: string
  model: string
  location: string
  status: DeviceStatus
}
