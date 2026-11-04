import type { Location, LocationType } from '../types/location'
import { apiFetch, readApiJson } from './http'

type LocationApi = {
  id_ubicacion: number
  nombre: string
  sigla: string | null
  padre_id: number | null
  tipo: LocationType
}

function mapLocation(location: LocationApi): Location {
  return {
    id: location.id_ubicacion,
    nombre: location.nombre,
    sigla: location.sigla,
    padreId: location.padre_id,
    tipo: location.tipo,
  }
}

export async function getLocations(accessToken: string): Promise<Location[]> {
  const response = await apiFetch('/locations', accessToken)
  const locations = await readApiJson<LocationApi[]>(response, 'No se pudieron cargar las ubicaciones')

  return locations.map(mapLocation)
}

export async function createLocation(
  accessToken: string,
  input: { nombre: string; sigla: string; tipo: LocationType },
): Promise<Location> {
  const response = await apiFetch('/locations', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: input.nombre,
      sigla: input.sigla,
      tipo: input.tipo,
    }),
  })
  const location = await readApiJson<LocationApi>(response, 'No se pudo crear la ubicación')

  return mapLocation(location)
}

export async function renameLocation(
  accessToken: string,
  id: number,
  input: { nombre: string; sigla?: string },
): Promise<Location> {
  const response = await apiFetch(`/locations/${id}`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const location = await readApiJson<LocationApi>(response, 'No se pudo actualizar la ubicación')

  return mapLocation(location)
}
