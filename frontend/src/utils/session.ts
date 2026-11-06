const TOKEN_KEY = 'access_token'
const USER_KEY = 'auth_user'

function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function readToken(): string {
  clearStoredUser()

  const rememberedToken = localStorage.getItem(TOKEN_KEY)

  if (rememberedToken) {
    sessionStorage.removeItem(TOKEN_KEY)
    return rememberedToken
  }

  return sessionStorage.getItem(TOKEN_KEY) ?? ''
}

export function saveToken(token: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
    sessionStorage.removeItem(TOKEN_KEY)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
  }

  clearStoredUser()
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  clearStoredUser()
}
