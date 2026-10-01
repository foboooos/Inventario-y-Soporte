import type { SoftwareLicense, SoftwareProgram } from '../types/software'
import { apiFetch, readApiJson } from './http'

type SoftwareApi = {
  id_software: number
  nombre: string
  version: string
  licencia: SoftwareLicense
  asignatura_ids: number[]
}

type SoftwareInput = {
  nombre: string
  version: string
  licencia: SoftwareLicense
  asignaturaIds: number[]
}

type SoftwareChanges = {
  nombre?: string
  version?: string
  licencia?: SoftwareLicense
  asignaturaIds?: number[]
}

function mapSoftware(program: SoftwareApi): SoftwareProgram {
  return {
    id: program.id_software,
    nombre: program.nombre,
    version: program.version,
    licencia: program.licencia,
    asignaturaIds: program.asignatura_ids,
  }
}

export async function getSoftware(accessToken: string): Promise<SoftwareProgram[]> {
  const response = await apiFetch('/software', accessToken)
  const programs = await readApiJson<SoftwareApi[]>(response, 'No se pudo cargar el software educativo')

  return programs.map(mapSoftware)
}

export async function createSoftware(accessToken: string, input: SoftwareInput): Promise<SoftwareProgram> {
  const response = await apiFetch('/software', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: input.nombre,
      version: input.version,
      licencia: input.licencia,
      asignatura_ids: input.asignaturaIds,
    }),
  })
  const program = await readApiJson<SoftwareApi>(response, 'No se pudo registrar el software')

  return mapSoftware(program)
}

export async function updateSoftware(
  accessToken: string,
  id: number,
  changes: SoftwareChanges,
): Promise<SoftwareProgram> {
  const body: { nombre?: string; version?: string; licencia?: SoftwareLicense; asignatura_ids?: number[] } = {}

  if (changes.nombre !== undefined) body.nombre = changes.nombre
  if (changes.version !== undefined) body.version = changes.version
  if (changes.licencia !== undefined) body.licencia = changes.licencia
  if (changes.asignaturaIds !== undefined) body.asignatura_ids = changes.asignaturaIds

  const response = await apiFetch(`/software/${id}`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const program = await readApiJson<SoftwareApi>(response, 'No se pudo actualizar el software')

  return mapSoftware(program)
}

export async function deleteSoftware(accessToken: string, id: number): Promise<void> {
  const response = await apiFetch(`/software/${id}`, accessToken, { method: 'DELETE' })

  if (!response.ok) {
    await readApiJson<never>(response, 'No se pudo eliminar el software')
  }
}
