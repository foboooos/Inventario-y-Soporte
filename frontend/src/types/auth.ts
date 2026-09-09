export type AuthUser = {
  rut: string
  nombre: string
  email: string
  rol: string
}

export type LoginResponse = {
  access_token: string
  user: AuthUser
}

export type LoginCredentials = {
  usuario: string
  password: string
}
