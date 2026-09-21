export type DeviceOption = {
  id_dispositivo: number
  codigo_inventario: string
  ubicacion: string
}

export type CreateTicketInput = {
  ubicacion: string
  sintoma: string
  id_dispositivo?: number
}

export type Ticket = {
  id_ticket: number
  codigo_ticket: string
  estado: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO'
  ubicacion: string
  sintoma: string
}
