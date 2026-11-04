export type LocationType = 'PRINCIPAL' | 'SECUNDARIA' | 'TERCIARIA'

export type Location = {
  id: number
  nombre: string
  sigla: string | null
  padreId: number | null
  tipo: LocationType
}
