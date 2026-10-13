import { useCallback, useEffect, useState } from 'react'
import './styles/tokens.css'
import './styles/base.css'
import './styles/skeleton.css'
import './styles/login.css'
import './styles/not-found.css'
import './styles/layout.css'
import './styles/inventory.css'
import './styles/dialogs.css'
import './styles/support.css'
import './styles/print.css'
import './styles/responsive.css'
import { DashboardLayout } from './components/DashboardLayout'
import { ConfigurationPage } from './components/ConfigurationPage'
import { InboxPage } from './components/InboxPage'
import { InventoryPage } from './components/InventoryPage'
import { LoginForm } from './components/LoginForm'
import { NotFoundPage } from './components/NotFoundPage'
import { SoftwarePage } from './components/SoftwarePage'
import { SubjectsPage } from './components/SubjectsPage'
import { SupportPage } from './components/SupportPage'
import {
  canAccessRoute,
  defaultRouteForRole,
  normalizePath,
  routeFromPath,
  routePaths,
  routes,
  type RouteKey,
} from './routes'
import type { AuthUser } from './types/auth'

const LOGIN_TITLE = 'Iniciar sesión'
const NOT_FOUND_TITLE = 'Página no encontrada'

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

function titleForRoute(key: RouteKey): string {
  return routes.find((route) => route.key === key)?.title ?? NOT_FOUND_TITLE
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

  const navigateToRoute = useCallback(
    (key: RouteKey) => navigate(routePaths[key]),
    [navigate],
  )

  const activeRoute = routeFromPath(pathname)

  const pageTitle = !user
    ? pathname !== '/login' && !activeRoute ? NOT_FOUND_TITLE : LOGIN_TITLE
    : activeRoute && canAccessRoute(user.rol, activeRoute) ? titleForRoute(activeRoute) : NOT_FOUND_TITLE

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

  // Páginas ya visitadas: se mantienen montadas para no volver a cargar sus datos.
  const [visitedRoutes, setVisitedRoutes] = useState<RouteKey[]>([])

  if (user && activeRoute && canAccessRoute(user.rol, activeRoute) && !visitedRoutes.includes(activeRoute)) {
    setVisitedRoutes([...visitedRoutes, activeRoute])
  }

  function handleAuthenticated(authenticatedUser: AuthUser, token: string) {
    localStorage.setItem('access_token', token)
    localStorage.setItem('auth_user', JSON.stringify(authenticatedUser))
    setAccessToken(token)
    setUser(authenticatedUser)
    setVisitedRoutes([])
    navigate(routePaths[defaultRouteForRole(authenticatedUser.rol)])
  }

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('auth_user')
    setAccessToken('')
    setUser(null)
    setVisitedRoutes([])
    navigate('/login')
  }, [navigate])

  if (!user) {
    if (pathname !== '/login' && !activeRoute) {
      return <NotFoundPage onBack={() => navigate('/login')} />
    }

    return <LoginForm onAuthenticated={handleAuthenticated} />
  }

  if (!activeRoute || !canAccessRoute(user.rol, activeRoute)) {
    return <NotFoundPage onBack={() => navigate(routePaths[defaultRouteForRole(user.rol)])} />
  }

  function renderRoute(route: RouteKey, account: AuthUser, token: string, onSessionExpired: () => void) {
    if (route === 'support') {
      return <SupportPage accessToken={token} onSessionExpired={onSessionExpired} />
    }

    if (route === 'settings') {
      return <ConfigurationPage />
    }

    if (route === 'subjects') {
      return <SubjectsPage accessToken={token} onSessionExpired={onSessionExpired} />
    }

    if (route === 'software') {
      return <SoftwarePage accessToken={token} onSessionExpired={onSessionExpired} />
    }

    if (route === 'inbox') {
      return <InboxPage accessToken={token} onSessionExpired={onSessionExpired} />
    }

    return <InventoryPage user={account} accessToken={token} onSessionExpired={onSessionExpired} />
  }

  const routesToRender = visitedRoutes.includes(activeRoute)
    ? visitedRoutes
    : [...visitedRoutes, activeRoute]

  return (
    <DashboardLayout
      user={user}
      activeRoute={activeRoute}
      onNavigate={navigateToRoute}
      onLogout={handleLogout}
    >
      {routesToRender.map((route) => (
        <div key={route} hidden={route !== activeRoute}>
          {renderRoute(route, user, accessToken, handleLogout)}
        </div>
      ))}
    </DashboardLayout>
  )
}

export default App