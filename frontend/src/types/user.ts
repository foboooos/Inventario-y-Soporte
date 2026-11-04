export type UserRole = 'ADMIN' | 'TECNICO' | 'DOCENTE'

export type CreateUserInput = {
  rut: string
  nombre: string
  email: string
  rol: UserRole
}

export type User = {
  rut: string
  nombre: string
  email: string
  rol: UserRole
}

export type CreatedUser = User
