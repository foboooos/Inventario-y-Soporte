export function normalizeRut(rut: string): string {
  return rut.trim().replace(/-0$/, '-K');
}
