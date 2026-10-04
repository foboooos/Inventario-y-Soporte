export type RouteKey = 'support' | 'inventory' | 'inbox' | 'settings' | 'subjects' | 'software'

export type RouteDefinition = {
  key: RouteKey
  path: string
  label: string
  title: string
  roles: readonly string[]
}

export const routes: readonly RouteDefinition[] = [
  { key: 'support', path: '/soporte', label: 'Soporte', title: 'Soporte', roles: ['DOCENTE'] },
  { key: 'inventory', path: '/inventario', label: 'Inventario', title: 'Inventario', roles: ['ADMIN', 'TECNICO'] },
  { key: 'inbox', path: '/bandeja', label: 'Bandeja de entrada', title: 'Bandeja de entrada', roles: ['ADMIN', 'TECNICO'] },
  { key: 'settings', path: '/config', label: 'Configuración', title: 'Configuración', roles: ['ADMIN'] },
  { key: 'subjects', path: '/asignaturas', label: 'Asignaturas y niveles', title: 'Asignaturas y niveles educativos', roles: ['ADMIN'] },
  { key: 'software', path: '/software', label: 'Software educativo', title: 'Software educativo', roles: ['ADMIN'] },
]

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
  const route = routes.find((item) => item.path === pathname)
  return route ? route.key : null
}

export function defaultRouteForRole(role: string): RouteKey {
  const first = routesForRole(role)[0]
  return first ? first.key : 'support'
}

export function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '')
  return path || '/login'
}