import type { LoginCredentials, LoginResponse } from '../types/auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  const data = (await response.json()) as LoginResponse | { message?: string }

  if (!response.ok) {
    throw new Error('message' in data && data.message ? data.message : 'No se pudo iniciar sesión')
  }

  return data as LoginResponse
}
