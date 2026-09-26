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

export async function createLocation(accessToken: string, nombre: string, padreId?: number): Promise<Location> {
  const response = await apiFetch('/locations', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(padreId ? { nombre, padre_id: padreId } : { nombre }),
  })
  const location = await readApiJson<LocationApi>(response, 'No se pudo crear la ubicación')

  return mapLocation(location)
}

export async function renameLocation(accessToken: string, id: number, nombre: string): Promise<Location> {
  const response = await apiFetch(`/locations/${id}`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre }),
  })
  const location = await readApiJson<LocationApi>(response, 'No se pudo renombrar la ubicación')

  return mapLocation(location)
}

export async function generateCourses(accessToken: string, padreId: number): Promise<Location[]> {
  const response = await apiFetch('/locations/courses', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ padre_id: padreId }),
  })
  const locations = await readApiJson<LocationApi[]>(response, 'No se pudieron generar los cursos')

  return locations.map(mapLocation)
}

export async function deleteLocation(accessToken: string, id: number): Promise<void> {
  const response = await apiFetch(`/locations/${id}`, accessToken, { method: 'DELETE' })

  if (!response.ok) {
    await readApiJson<never>(response, 'No se pudo eliminar la ubicación')
  }
}
