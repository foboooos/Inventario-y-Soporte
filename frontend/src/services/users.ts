import type { CreatedUser, CreateUserInput, User } from '../types/user'
import { apiFetch, readApiJson } from './http'

export async function getUsers(accessToken: string): Promise<User[]> {
  const response = await apiFetch('/users', accessToken)

  return readApiJson<User[]>(response, 'No se pudieron cargar los usuarios')
}

export async function createUser(accessToken: string, input: CreateUserInput): Promise<CreatedUser> {
  const response = await apiFetch('/users', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return readApiJson<CreatedUser>(response, 'No se pudo crear el usuario')
}

export async function deleteUser(accessToken: string, rut: string): Promise<void> {
  const response = await apiFetch(`/users/${encodeURIComponent(rut)}`, accessToken, { method: 'DELETE' })

  if (!response.ok) {
    await readApiJson<never>(response, 'No se pudo eliminar el usuario')
  }
}
