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
import './styles/fields.css'
import './styles/print.css'
import './styles/responsive.css'
import { DashboardLayout } from './components/DashboardLayout'
import { ConfigurationPage } from './components/ConfigurationPage'
import { HistoryPage } from './components/HistoryPage'
import { InboxPage } from './components/InboxPage'
import { InventoryPage } from './components/InventoryPage'
import { LoginForm } from './components/LoginForm'
import { NotFoundPage } from './components/NotFoundPage'
import { SoftwarePage } from './components/SoftwarePage'
import { SubjectsPage } from './components/SubjectsPage'
import { SupportPage } from './components/SupportPage'
import { getCurrentUser } from './services/auth'
import { isSessionExpired } from './services/http'
import { clearToken, readToken, saveToken } from './utils/session'
import {
  canAccessRoute,
  configSectionFromPath,
  configSectionLabels,
  defaultRouteForRole,
  normalizePath,
  routeFromPath,
  routePaths,
  routes,
  type ConfigSection,
  type RouteKey,
} from './routes'
import type { AuthUser } from './types/auth'

const LOGIN_TITLE = 'Iniciar sesión'
const NOT_FOUND_TITLE = 'Página no encontrada'

function titleForRoute(key: RouteKey): string {
  return routes.find((route) => route.key === key)?.title ?? NOT_FOUND_TITLE
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState(() => readToken())
  const [authChecking, setAuthChecking] = useState(() => Boolean(readToken()))
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname))
  const [ticketsVersion, setTicketsVersion] = useState(0)
  const [configSection, setConfigSection] = useState<ConfigSection | null>(() => configSectionFromPath(window.location.pathname))

  useEffect(() => {
    const token = readToken()

    if (!token) {
      return
    }

    let active = true

    getCurrentUser(token)
      .then((currentUser) => {
        if (!active) return
        setUser(currentUser)
        setAccessToken(token)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (isSessionExpired(error)) {
          clearToken()
          setAccessToken('')
        }
        setUser(null)
      })
      .finally(() => {
        if (active) setAuthChecking(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handlePopState() {
      const nextPath = normalizePath(window.location.pathname)
      const section = configSectionFromPath(nextPath)
      if (section) setConfigSection(section)
      setPathname(nextPath)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const normalizedPath = normalizePath(path)
    const section = configSectionFromPath(normalizedPath)
    if (section) setConfigSection(section)
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
    : activeRoute && canAccessRoute(user.rol, activeRoute)
      ? configSection ? configSectionLabels[configSection] : titleForRoute(activeRoute)
      : NOT_FOUND_TITLE

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  useEffect(() => {
    const configActive = Boolean(user) && activeRoute === 'settings'
    document.body.classList.toggle('config-active', configActive)
    return () => document.body.classList.remove('config-active')
  }, [activeRoute, user])

  useEffect(() => {
    if (authChecking) return
    if (!user && pathname !== '/login' && activeRoute) {
      navigate('/login', { replace: true })
    } else if (user && pathname === '/login') {
      navigate(routePaths[defaultRouteForRole(user.rol)], { replace: true })
    }
  }, [activeRoute, authChecking, navigate, pathname, user])

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 700px)')

    function handleViewportChange() {
      if (mobileQuery.matches || !user || !activeRoute) return

      if (configSection && activeRoute === 'settings') {
        setConfigSection(null)
        navigate(routePaths.settings, { replace: true })
        return
      }

      if (!routes.find((route) => route.key === activeRoute)?.mobileOnly) return

      navigate(routePaths[defaultRouteForRole(user.rol)], { replace: true })
    }

    handleViewportChange()
    mobileQuery.addEventListener('change', handleViewportChange)

    return () => mobileQuery.removeEventListener('change', handleViewportChange)
  }, [activeRoute, configSection, navigate, user])

  // Páginas ya visitadas: se mantienen montadas para no volver a cargar sus datos.
  const [visitedRoutes, setVisitedRoutes] = useState<RouteKey[]>([])

  if (user && activeRoute && canAccessRoute(user.rol, activeRoute) && !visitedRoutes.includes(activeRoute)) {
    setVisitedRoutes([...visitedRoutes, activeRoute])
  }

  function handleAuthenticated(authenticatedUser: AuthUser, token: string, remember: boolean) {
    saveToken(token, remember)
    setAccessToken(token)
    setUser(authenticatedUser)
    setAuthChecking(false)
    setVisitedRoutes([])
    navigate(routePaths[defaultRouteForRole(authenticatedUser.rol)])
  }

  const handleLogout = useCallback(() => {
    clearToken()
    setAccessToken('')
    setUser(null)
    setVisitedRoutes([])
    navigate('/login')
  }, [navigate])

  if (authChecking) {
    return <div className="session-check" role="status">Validando sesión…</div>
  }

  if (!user) {
    if (pathname !== '/login' && !activeRoute) {
      return <NotFoundPage onBack={() => navigate('/login')} />
    }

    return <LoginForm onAuthenticated={handleAuthenticated} />
  }

  if (!activeRoute || !canAccessRoute(user.rol, activeRoute)) {
    return (
      <DashboardLayout
        user={user}
        activeRoute={activeRoute}
        onNavigate={navigateToRoute}
        onLogout={handleLogout}
      >
        <NotFoundPage onBack={() => navigate(routePaths[defaultRouteForRole(user.rol)])} />
      </DashboardLayout>
    )
  }

  function renderRoute(route: RouteKey, account: AuthUser, token: string, onSessionExpired: () => void) {
    if (route === 'support') {
      return <SupportPage accessToken={token} onSessionExpired={onSessionExpired} refreshKey={ticketsVersion} onTicketCreated={() => setTicketsVersion((version) => version + 1)} />
    }

    if (route === 'history') {
      return <HistoryPage accessToken={token} onSessionExpired={onSessionExpired} refreshKey={ticketsVersion} />
    }

    if (route === 'settings') {
      return (
        <ConfigurationPage
          accessToken={token}
          currentUserRut={account.rut}
          onSessionExpired={onSessionExpired}
          section={route === activeRoute ? configSection : null}
          onNavigate={navigate}
        />
      )
    }

    if (route === 'subjects') {
      return <SubjectsPage accessToken={token} onSessionExpired={onSessionExpired} />
    }

    if (route === 'software') {
      return <SoftwarePage accessToken={token} onSessionExpired={onSessionExpired} />
    }

    if (route === 'inbox') {
      return <InboxPage accessToken={token} onSessionExpired={onSessionExpired} isActive={route === activeRoute} />
    }

    return <InventoryPage user={account} accessToken={token} onSessionExpired={onSessionExpired} />
  }

  const routesToRender = visitedRoutes.includes(activeRoute)
    ? visitedRoutes
    : [...visitedRoutes, activeRoute]

  const headerAction = configSection
    ? {
        label: 'Salir de configuración',
        onClick: () => {
          setConfigSection(null)
          navigate(routePaths.settings)
        },
      }
    : undefined

  return (
    <DashboardLayout
      user={user}
      activeRoute={activeRoute}
      onNavigate={navigateToRoute}
      onLogout={handleLogout}
      headerAction={headerAction}
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