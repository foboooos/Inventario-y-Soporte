export type SoftwareLicense = 'LIBRE' | 'GRATUITA' | 'COMERCIAL' | 'SUSCRIPCION' | 'FREEMIUM'

export type SoftwareProgram = {
  id: number
  nombre: string
  version: string
  licencia: SoftwareLicense
  asignaturaIds: number[]
}

export const SOFTWARE_LICENSES: { value: SoftwareLicense; label: string }[] = [
  { value: 'LIBRE', label: 'Libre / Open Source' },
  { value: 'GRATUITA', label: 'Gratuita' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'SUSCRIPCION', label: 'Suscripción' },
  { value: 'FREEMIUM', label: 'Freemium' },
]

export function softwareLicenseLabel(license: SoftwareLicense): string {
  return SOFTWARE_LICENSES.find((option) => option.value === license)?.label ?? license
}
