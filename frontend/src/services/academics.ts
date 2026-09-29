import type { EducationalLevel, Subject } from '../types/academic'
import { apiFetch, readApiJson } from './http'

type LevelApi = {
  id_nivel: number
  nombre: string
}

type SubjectApi = {
  id_asignatura: number
  nombre: string
  nivel_ids: number[]
}

function mapLevel(level: LevelApi): EducationalLevel {
  return {
    id: level.id_nivel,
    nombre: level.nombre,
  }
}

function mapSubject(subject: SubjectApi): Subject {
  return {
    id: subject.id_asignatura,
    nombre: subject.nombre,
    nivelIds: subject.nivel_ids,
  }
}

export async function getLevels(accessToken: string): Promise<EducationalLevel[]> {
  const response = await apiFetch('/levels', accessToken)
  const levels = await readApiJson<LevelApi[]>(response, 'No se pudieron cargar los niveles educativos')

  return levels.map(mapLevel)
}

export async function createLevel(accessToken: string, nombre: string): Promise<EducationalLevel> {
  const response = await apiFetch('/levels', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre }),
  })
  const level = await readApiJson<LevelApi>(response, 'No se pudo crear el nivel educativo')

  return mapLevel(level)
}

export async function renameLevel(accessToken: string, id: number, nombre: string): Promise<EducationalLevel> {
  const response = await apiFetch(`/levels/${id}`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre }),
  })
  const level = await readApiJson<LevelApi>(response, 'No se pudo renombrar el nivel educativo')

  return mapLevel(level)
}

export async function deleteLevel(accessToken: string, id: number): Promise<void> {
  const response = await apiFetch(`/levels/${id}`, accessToken, { method: 'DELETE' })

  if (!response.ok) {
    await readApiJson<never>(response, 'No se pudo eliminar el nivel educativo')
  }
}

export async function getSubjects(accessToken: string): Promise<Subject[]> {
  const response = await apiFetch('/subjects', accessToken)
  const subjects = await readApiJson<SubjectApi[]>(response, 'No se pudieron cargar las asignaturas')

  return subjects.map(mapSubject)
}

export async function createSubject(accessToken: string, nombre: string, nivelIds: number[]): Promise<Subject> {
  const response = await apiFetch('/subjects', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, nivel_ids: nivelIds }),
  })
  const subject = await readApiJson<SubjectApi>(response, 'No se pudo crear la asignatura')

  return mapSubject(subject)
}

export async function updateSubject(
  accessToken: string,
  id: number,
  changes: { nombre?: string; nivelIds?: number[] },
): Promise<Subject> {
  const body: { nombre?: string; nivel_ids?: number[] } = {}

  if (changes.nombre !== undefined) body.nombre = changes.nombre
  if (changes.nivelIds !== undefined) body.nivel_ids = changes.nivelIds

  const response = await apiFetch(`/subjects/${id}`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const subject = await readApiJson<SubjectApi>(response, 'No se pudo actualizar la asignatura')

  return mapSubject(subject)
}

export async function deleteSubject(accessToken: string, id: number): Promise<void> {
  const response = await apiFetch(`/subjects/${id}`, accessToken, { method: 'DELETE' })

  if (!response.ok) {
    await readApiJson<never>(response, 'No se pudo eliminar la asignatura')
  }
}
