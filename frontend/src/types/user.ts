export type UserRole = 'ADMIN' | 'TECNICO' | 'DOCENTE'

export type CreateUserInput = {
  rut: string
  nombre: string
  email: string
  fecha_nacimiento: string
  rol: UserRole
}

export type UpdateUserInput = {
  nombre: string
  email: string
  rol: UserRole
  fecha_nacimiento?: string
}

export type User = {
  rut: string
  nombre: string
  email: string
  rol: UserRole
  login_id?: string
  fecha_nacimiento_configurada?: boolean
}

export type CreatedUser = User
