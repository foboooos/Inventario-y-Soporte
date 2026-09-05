import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type LoginResponse = {
  access_token: string
  user: { id_usuario: number; nombre: string; email: string; rol: string }
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<LoginResponse['user'] | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json()) as LoginResponse | { message?: string }

      if (!response.ok) {
        throw new Error('message' in data && data.message ? data.message : 'No se pudo iniciar sesión')
      }

      const session = data as LoginResponse
      localStorage.setItem('access_token', session.access_token)
      setUser(session.user)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <main className="app-shell">
        <section className="welcome-card">
          <span className="eyebrow">Sistema de soporte</span>
          <h1>Bienvenido, {user.nombre}</h1>
          <p>Sesión iniciada como <strong>{user.rol}</strong>.</p>
          <button onClick={() => { localStorage.removeItem('access_token'); setUser(null) }}>Cerrar sesión</button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="login-card">
        <div className="brand-mark">DV</div>
        <span className="eyebrow">Sistema de soporte</span>
        <h1>Iniciar sesión</h1>
        <p className="subtitle">Accede para gestionar el inventario y los tickets.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" />
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
      </section>
    </main>
  )
}

export default App
