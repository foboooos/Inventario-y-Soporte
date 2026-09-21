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
  const [showPassword, setShowPassword] = useState(false)
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
      <img className="login-logo" src="/logo-colegio.svg" alt="Logo del colegio" />
      <section className="login-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" type="text" value={usuario} onChange={(event) => setUsuario(event.target.value)} required autoComplete="username" pattern="[a-z0-9._-]+\.[a-z0-9._-]+" title="Usa el formato nombre.apellido en minúsculas" />
          <label htmlFor="password">Contraseña</label>
          <div className="password-field">
            <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3 3 18 18" />
                  <path d="M10.6 5.08A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.45 18.45 0 0 1-3.17 3.98M6.23 6.23C3.03 8.15 1 12 1 12s4 7 11 7a10.7 10.7 0 0 0 3.77-.68" />
                  <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
      </section>
    </main>
  )
}
