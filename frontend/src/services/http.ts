const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class SessionExpiredError extends Error {
  constructor() {
    super('Sesión expirada. Vuelve a iniciar sesión.')
    this.name = 'SessionExpiredError'
  }
}

export function isSessionExpired(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError
}

type ApiErrorBody = { message?: string }

export async function apiFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.method && init.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 401) {
    throw new SessionExpiredError()
  }

  return response
}

export async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  let data: T | ApiErrorBody | null = null

  try {
    data = (await response.json()) as T | ApiErrorBody
  } catch {
    if (!response.ok) throw new Error(fallbackMessage)
    throw new Error(fallbackMessage)
  }

  if (!response.ok) {
    const message = data && typeof data === 'object' && 'message' in data && data.message
      ? data.message
      : fallbackMessage
    throw new Error(message)
  }

  return data as T
}

export { API_URL }
