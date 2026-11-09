import type { AuthUser, LoginCredentials, LoginOption, LoginResponse } from '../types/auth'
import { apiFetch, isTimeoutError, readApiJson, REQUEST_TIMEOUT_MS } from './http'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await apiFetch('/auth/me', accessToken)
  return readApiJson<AuthUser>(response, 'No se pudo validar la sesión')
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const data = (await response.json()) as LoginResponse | { message?: string }

    if (!response.ok) {
      throw new Error('message' in data && data.message ? data.message : 'No se pudo iniciar sesión')
    }

    return data as LoginResponse
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error('La solicitud tardó demasiado. Intenta nuevamente.')
    }
    throw error
  }
}

export async function getLoginUsers(): Promise<LoginOption[]> {
  try {
    const response = await fetch(`${API_URL}/auth/users`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    return readApiJson<LoginOption[]>(response, 'No se pudo cargar la lista de usuarios')
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error('La solicitud tardó demasiado. Intenta nuevamente.')
    }
    throw error
  }
}
