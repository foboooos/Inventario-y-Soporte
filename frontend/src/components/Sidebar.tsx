import type { AuthUser } from '../types/auth'

export type RouteKey = 'support' | 'inventory' | 'settings'

type SidebarProps = {
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

type RouteDefinition = {
  key: RouteKey
  label: string
  roles: string[]
}

const routes: RouteDefinition[] = [
  { key: 'support', label: 'Soporte', roles: ['DOCENTE'] },

  { key: 'inventory', label: 'Inventario', roles: ['ADMIN', 'TECNICO'] },
  { key: 'settings', label: 'Configuración', roles: ['ADMIN'] },
]

function RoleIcon({ role }: { role: string }) {
  if (role === 'DOCENTE') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h6a2 2 0 0 1 2 2v13c-.6-.7-1.4-1-2.5-1H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" /><path d="M13 6.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4c-1.1 0-1.9.3-2.5 1M6 8h4M6 11h4" /></svg>
  }

  if (role === 'TECNICO') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 6.3 3-3a4.2 4.2 0 0 0 1.3 4.1 4.2 4.2 0 0 0 4.1 1.3l-3 3-3.2-.8-5.8 5.8a2.1 2.1 0 0 1-3-3l5.8-5.8-.8-3.2 3-3Z" /><path d="m5 19 1.5-1.5" /></svg>
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 9-7 9-7-9 7-9Z" /></svg>
}

function RouteIcon({ route }: { route: RouteKey }) {
  if (route === 'support') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4.12A2.5 2.5 0 0 1 4 12.5v-7Z" /><path d="M8 8h8M8 11h5" /></svg>
  }

  if (route === 'inventory') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5M8 5.25l8 4.5" /></svg>
  }


  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a2 2 0 0 1 2 2v.38a6.8 6.8 0 0 1 1.55.9l.33-.19a2 2 0 1 1 2 3.46l-.33.19c.08.36.12.73.12 1.11s-.04.75-.12 1.11l.33.19a2 2 0 1 1-2 3.46l-.33-.19a6.8 6.8 0 0 1-1.55.9v.38a2 2 0 1 1-4 0v-.38a6.8 6.8 0 0 1-1.55-.9l-.33.19a2 2 0 1 1-2-3.46l.33-.19A5.7 5.7 0 0 1 6.33 12c0-.38.04-.75.12-1.11l-.33-.19a2 2 0 1 1 2-3.46l.33.19A6.8 6.8 0 0 1 10 5.88V5.5a2 2 0 0 1 2-2Z" /><circle cx="12" cy="11.35" r="2.5" /></svg>
}

export function Sidebar({ user, activeRoute, onNavigate, onLogout }: SidebarProps) {
  const visibleRoutes = routes.filter((route) => route.roles.includes(user.rol))
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    TECNICO: 'Técnico',
    DOCENTE: 'Docente',
  }
  const roleLabel = roleLabels[user.rol] ?? user.rol

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Navegación principal">
        {visibleRoutes.map((route) => (
          <button
            className={`sidebar-link${activeRoute === route.key ? ' active' : ''}`}
            key={route.key}
            type="button"
            aria-current={activeRoute === route.key ? 'page' : undefined}
            onClick={() => onNavigate(route.key)}
          >
            <RouteIcon route={route.key} />
            <span>{route.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-account">
        <div className="sidebar-user">
          <strong className="sidebar-user-name">
            <span className="sidebar-role-icon" role="img" aria-label={`Rol: ${roleLabel}`}>
              <RoleIcon role={user.rol} />
            </span>
            <span className="sidebar-user-name-text">{user.nombre}</span>
          </strong>
        </div>
        <button className="sidebar-logout" type="button" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </aside>
  )
}
