import type { Location } from '../types/location'
import { apiFetch, readApiJson } from './http'

type LocationApi = {
  id_ubicacion: number
  nombre: string
  padre_id: number | null
}

function mapLocation(location: LocationApi): Location {
  return {
    id: location.id_ubicacion,
    nombre: location.nombre,
    padreId: location.padre_id,
  }
}

export async function getLocations(accessToken: string): Promise<Location[]> {
  const response = await apiFetch('/locations', accessToken)
  const locations = await readApiJson<LocationApi[]>(response, 'No se pudieron cargar las ubicaciones')

  return locations.map(mapLocation)
}
