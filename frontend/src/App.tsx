import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
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
import { TicketCreatedToast } from './components/TicketCreatedToast'
import { getCurrentUser } from './services/auth'
import { isSessionExpired } from './services/http'
import { listenForTicketEvents } from './services/tickets'
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
  const [ticketToFocus, setTicketToFocus] = useState<string | null>(null)
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

    if (normalizePath(window.location.pathname) !== normalizedPath) {
      if (options?.replace) window.history.replaceState({}, '', normalizedPath)
      else window.history.pushState({}, '', normalizedPath)
    }

    setPathname(normalizedPath)
  }, [])

  const navigateToRoute = useCallback(
    (key: RouteKey) => navigate(routePaths[key]),
    [navigate],
  )
  const handleTicketFocusHandled = useCallback(() => setTicketToFocus(null), [])

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

  useEffect(() => {
    if (!accessToken || (user?.rol !== 'ADMIN' && user?.rol !== 'TECNICO')) return

    const controller = new AbortController()
    void listenForTicketEvents(accessToken, (ticketCode) => {
      setTicketsVersion((version) => version + 1)
      if (ticketCode) {
        let toastId = ''
        const openInbox = () => {
          toast.dismiss(toastId)
          setTicketToFocus(ticketCode)
          if (routeFromPath(window.location.pathname) !== 'inbox') {
            navigate(routePaths.inbox)
          }
        }
        toastId = toast.success(
          <TicketCreatedToast
            ticketCode={ticketCode}
            onClose={() => toast.dismiss(toastId)}
            onOpenInbox={openInbox}
          />,
          {
            duration: 10000,
            position: 'top-right',
            icon: (
              <span>
                <svg className="ticket-toast-symbol" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6V7Z" />
                  <path d="M13 6v2m0 3v2m0 3v2" />
                </svg>
              </span>
            ),
          },
        )
      }
    }, handleLogout, controller.signal)

    return () => controller.abort()
  }, [accessToken, handleLogout, navigate, user?.rol])

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
      return (
        <InboxPage
          accessToken={token}
          onSessionExpired={onSessionExpired}
          isActive={route === activeRoute}
          refreshKey={ticketsVersion}
          targetTicketCode={ticketToFocus}
          onTargetTicketFocused={handleTicketFocusHandled}
        />
      )
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
