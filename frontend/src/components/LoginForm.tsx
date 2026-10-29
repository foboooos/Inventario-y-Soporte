import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { login } from '../services/auth'
import type { AuthUser } from '../types/auth'

const USUARIO_PATTERN = /^[a-z0-9._-]+\.[a-z0-9._-]+$/

type LoginFormProps = {
  onAuthenticated: (user: AuthUser, accessToken: string) => void
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState<'usuario' | 'password' | null>(null)
  const [loading, setLoading] = useState(false)
  const usuarioRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function fail(message: string, field: 'usuario' | 'password') {
    setError(message)
    setErrorField(field)
    const input = field === 'usuario' ? usuarioRef : passwordRef
    input.current?.focus()
    return false
  }

  function validate() {
    const usuarioNormalizado = usuario.trim().toLowerCase()
    const usuarioSinTildes = usuarioNormalizado.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    if (!usuarioNormalizado) return fail('Ingresa tu usuario.', 'usuario')

    if (!USUARIO_PATTERN.test(usuarioSinTildes)) return fail('Usa el formato nombre.apellido en minúsculas.', 'usuario')
    if (usuarioSinTildes !== usuarioNormalizado) return fail('El usuario no lleva tildes.', 'usuario')
    if (!password) return fail('Ingresa tu contraseña.', 'password')
    if (password.length < 8) return fail('La contraseña debe tener al menos 8 caracteres.', 'password')

    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setErrorField(null)

    if (!validate()) return

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

  const usuarioInvalido = error !== '' && errorField !== 'password'
  const passwordInvalida = error !== '' && errorField !== 'usuario'

  return (
    <main className="app-shell">
      <img className="login-logo" src="/logo-colegio.svg" alt="Logo del colegio" />
      <div className="login-stage">
        {error && (
          <p className="login-error" id="login-error" role="alert">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5" />
              <path d="M12 16.2h.01" />
            </svg>
            <span>{error}</span>
          </p>
        )}
        <section className="login-card">
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="usuario">Usuario</label>
            <input ref={usuarioRef} id="usuario" type="text" value={usuario} onChange={(event) => setUsuario(event.target.value)} required autoComplete="username" pattern="[a-z0-9._\-]+\.[a-z0-9._\-]+" aria-invalid={usuarioInvalido ? true : undefined} aria-describedby={error ? 'login-error' : undefined} />
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <input ref={passwordRef} id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" aria-invalid={passwordInvalida ? true : undefined} aria-describedby={error ? 'login-error' : undefined} />
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
            <button className="primary-action primary-action-solid" type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
          </form>
        </section>
      </div>
    </main>
  )
}
