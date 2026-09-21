import { useState } from 'react'
import type { FormEvent } from 'react'
import { login } from '../services/auth'
import type { AuthUser } from '../types/auth'


type LoginFormProps = {
  onAuthenticated: (user: AuthUser, accessToken: string) => void
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const session = await login({ usuario: usuario.trim().toLowerCase(), password })
      onAuthenticated(session.user, session.access_token)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="login-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" type="text" value={usuario} onChange={(event) => setUsuario(event.target.value)} required autoComplete="username" pattern="[a-z0-9._-]+\.[a-z0-9._-]+" title="Usa el formato nombre.apellido en minúsculas" />
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" />
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
      </section>
    </main>
  )
}
