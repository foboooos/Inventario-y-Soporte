export type EducationalLevel = {
  id: number
  nombre: string
}

export type Subject = {
  id: number
  nombre: string
  nivelIds: number[]
}
