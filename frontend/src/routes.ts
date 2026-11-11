export type RouteKey = 'support' | 'history' | 'inventory' | 'inbox' | 'settings' | 'subjects' | 'software'

export type ConfigSection = 'users' | 'locations'

export type RouteDefinition = {
  key: RouteKey
  path: string
  label: string
  title: string
  roles: readonly string[]
  mobileOnly?: boolean
}

export const routes: readonly RouteDefinition[] = [
  { key: 'support', path: '/soporte', label: 'Soporte', title: 'Soporte', roles: ['DOCENTE'] },
  { key: 'history', path: '/historial', label: 'Historial', title: 'Historial de tickets', roles: ['DOCENTE'], mobileOnly: true },
  { key: 'inbox', path: '/bandeja', label: 'Bandeja', title: 'Bandeja de entrada', roles: ['ADMIN', 'TECNICO'] },
  { key: 'inventory', path: '/inventario', label: 'Inventario', title: 'Inventario', roles: ['ADMIN', 'TECNICO'] },
  { key: 'subjects', path: '/asignaturas', label: 'Asignaturas', title: 'Asignaturas y niveles educativos', roles: ['ADMIN'] },
  { key: 'software', path: '/software', label: 'Software', title: 'Software educativo', roles: ['ADMIN'] },
  { key: 'settings', path: '/config', label: 'Configuración', title: 'Configuración', roles: ['ADMIN'] },
]

export const configSectionPaths: Record<ConfigSection, string> = {
  users: '/config/usuarios',
  locations: '/config/ubicaciones',
}

export const configSectionLabels: Record<ConfigSection, string> = {
  users: 'Usuarios',
  locations: 'Ubicaciones',
}

export const routePaths: Record<RouteKey, string> = Object.fromEntries(
  routes.map((route) => [route.key, route.path]),
) as Record<RouteKey, string>

export function routesForRole(role: string): RouteDefinition[] {
  return routes.filter((route) => route.roles.includes(role))
}

export function canAccessRoute(role: string, key: RouteKey): boolean {
  return routes.some((route) => route.key === key && route.roles.includes(role))
}

export function routeFromPath(pathname: string): RouteKey | null {
  const path = normalizePath(pathname)
  const route = routes.find((item) => item.path === path)
  if (route) return route.key
  return configSectionFromPath(path) ? 'settings' : null
}

export function configSectionFromPath(pathname: string): ConfigSection | null {
  const path = normalizePath(pathname)
  if (path === configSectionPaths.users) return 'users'
  if (path === configSectionPaths.locations) return 'locations'
  return null
}

export function defaultRouteForRole(role: string): RouteKey {
  const first = routesForRole(role)[0]
  return first ? first.key : 'support'
}

export function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '')
  return path || '/login'
}