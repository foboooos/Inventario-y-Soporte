import { useState } from 'react'
import './App.css'

import { ConfigurationPage } from './components/ConfigurationPage'
import { InventoryPage } from './components/InventoryPage'
import { LoginForm } from './components/LoginForm'
import { SupportPage } from './components/SupportPage'
import type { RouteKey } from './components/Sidebar'
import type { AuthUser } from './types/auth'

function defaultRouteForRole(role: string): RouteKey {
  return role === 'DOCENTE' ? 'support' : 'inventory'
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [activeRoute, setActiveRoute] = useState<RouteKey>('inventory')

  function handleAuthenticated(authenticatedUser: AuthUser, token: string) {
    localStorage.setItem('access_token', token)
    setAccessToken(token)
    setUser(authenticatedUser)
    setActiveRoute(defaultRouteForRole(authenticatedUser.rol))
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    setAccessToken('')
    setUser(null)
    setActiveRoute('inventory')
  }

  if (!user) {
    return <LoginForm onAuthenticated={handleAuthenticated} />
  }

  if (activeRoute === 'support' && (user.rol === 'DOCENTE' || user.rol === 'ADMIN')) {
    return <SupportPage user={user} activeRoute={activeRoute} onNavigate={setActiveRoute} onLogout={handleLogout} />
  }


  if (activeRoute === 'settings' && user.rol === 'ADMIN') {
    return <ConfigurationPage user={user} activeRoute={activeRoute} onNavigate={setActiveRoute} onLogout={handleLogout} />
  }

  return <InventoryPage user={user} accessToken={accessToken} activeRoute="inventory" onNavigate={setActiveRoute} onLogout={handleLogout} />
}

export default App
