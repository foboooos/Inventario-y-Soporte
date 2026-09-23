import { useCallback, useEffect, useState } from 'react'
import './styles/tokens.css'
import './styles/base.css'
import './styles/login.css'
import './styles/not-found.css'
import './styles/layout.css'
import './styles/inventory.css'
import './styles/dialogs.css'
import './styles/support.css'
import './styles/print.css'
import './styles/responsive.css'
import { ConfigurationPage } from './components/ConfigurationPage'
import { InboxPage } from './components/InboxPage'
import { InventoryPage } from './components/InventoryPage'
import { LoginForm } from './components/LoginForm'
import { NotFoundPage } from './components/NotFoundPage'
import { SupportPage } from './components/SupportPage'

import type { RouteKey } from './components/Sidebar'
import type { AuthUser } from './types/auth'

const routePaths: Record<RouteKey, string> = {
  support: '/soporte',

  inventory: '/inventario',
  inbox: '/bandeja',
  settings: '/config',
}

const routeTitles: Record<RouteKey, string> = {
  support: 'Soporte',
  inventory: 'Inventario',
  inbox: 'Bandeja de entrada',
  settings: 'Configuración',
}

const LOGIN_TITLE = 'Iniciar sesión'
const NOT_FOUND_TITLE = 'Página no encontrada'

function normalizePath(pathname: string) {
  const path = pathname.replace(/\/+$/, '')
  return path || '/login'
}

function routeFromPath(pathname: string): RouteKey | null {
  const entry = Object.entries(routePaths).find(([, path]) => path === pathname)
  return entry ? entry[0] as RouteKey : null
}

function defaultRouteForRole(role: string): RouteKey {
  return role === 'DOCENTE' ? 'support' : 'inventory'
}

function canAccessRoute(role: string, route: RouteKey) {
  if (route === 'support') return role === 'DOCENTE'

  if (route === 'inventory' || route === 'inbox') return role === 'ADMIN' || role === 'TECNICO'
  return role === 'ADMIN'
}

function getStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem('auth_user')

  if (!storedUser) return null

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    localStorage.removeItem('auth_user')
    return null
  }
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token') ?? '')
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    function handlePopState() {
      setPathname(normalizePath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const normalizedPath = normalizePath(path)
    setPathname((current) => {
      if (current === normalizedPath) return current
      if (options?.replace) {
        window.history.replaceState({}, '', normalizedPath)
      } else {
        window.history.pushState({}, '', normalizedPath)
      }
      return normalizedPath
    })
  }, [])

  const activeRoute = routeFromPath(pathname)

  let pageTitle = NOT_FOUND_TITLE
  if (!user) {
    pageTitle = pathname !== '/login' && !activeRoute ? NOT_FOUND_TITLE : LOGIN_TITLE
  } else if (activeRoute && canAccessRoute(user.rol, activeRoute)) {
    pageTitle = routeTitles[activeRoute]
  }

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  useEffect(() => {
    if (!user && pathname !== '/login' && activeRoute) {
      navigate('/login', { replace: true })
    } else if (user && pathname === '/login') {
      navigate(routePaths[defaultRouteForRole(user.rol)], { replace: true })
    }
  }, [activeRoute, navigate, pathname, user])

  function handleAuthenticated(authenticatedUser: AuthUser, token: string) {
    localStorage.setItem('access_token', token)
    localStorage.setItem('auth_user', JSON.stringify(authenticatedUser))
    setAccessToken(token)
    setUser(authenticatedUser)
    navigate(routePaths[defaultRouteForRole(authenticatedUser.rol)])
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('auth_user')
    setAccessToken('')
    setUser(null)
    navigate('/login')
  }

  if (!user) {
    if (pathname !== '/login' && !activeRoute) {
      return <NotFoundPage onBack={() => navigate('/login')} />
    }

    return <LoginForm onAuthenticated={handleAuthenticated} />
  }

  if (!activeRoute || !canAccessRoute(user.rol, activeRoute)) {
    return <NotFoundPage onBack={() => navigate(routePaths[defaultRouteForRole(user.rol)])} />
  }

  if (activeRoute === 'support') {
    return <SupportPage user={user} accessToken={accessToken} activeRoute={activeRoute} onNavigate={(route) => navigate(routePaths[route])} onLogout={handleLogout} />
  }


  if (activeRoute === 'settings') {
    return <ConfigurationPage user={user} activeRoute={activeRoute} onNavigate={(route) => navigate(routePaths[route])} onLogout={handleLogout} />
  }

  if (activeRoute === 'inbox') {
    return <InboxPage user={user} accessToken={accessToken} activeRoute={activeRoute} onNavigate={(route) => navigate(routePaths[route])} onLogout={handleLogout} />
  }

  return <InventoryPage user={user} accessToken={accessToken} activeRoute={activeRoute} onNavigate={(route) => navigate(routePaths[route])} onLogout={handleLogout} />
}

export default App
