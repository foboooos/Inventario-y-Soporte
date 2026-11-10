import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getLoginUsers, login } from '../services/auth'
import type { AuthUser, LoginOption } from '../types/auth'
import { SelectMenu } from './SelectMenu'

type LoginFormProps = {
  onAuthenticated: (user: AuthUser, accessToken: string, remember: boolean) => void
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [usuario, setUsuario] = useState('')
  const [usuarios, setUsuarios] = useState<LoginOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState<'usuario' | 'password' | null>(null)
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const usuarioOptions = usuarios.map((option) => ({ value: option.id, label: option.nombre }))

  useEffect(() => {
    let active = true
    getLoginUsers()
      .then((loaded) => {
        if (active) setUsuarios(loaded)
      })
      .catch((exception: unknown) => {
        if (active) setUsersError(exception instanceof Error ? exception.message : 'No se pudo cargar la lista de usuarios')
      })
      .finally(() => {
        if (active) setLoadingUsers(false)
      })
    return () => { active = false }
  }, [])

  function fail(message: string, field: 'usuario' | 'password') {
    setError(message)
    setErrorField(field)
    if (field === 'usuario') document.getElementById('usuario')?.focus()
    else passwordRef.current?.focus()
    return false
  }

  function validate() {
    if (!usuario) return fail('Selecciona tu nombre de usuario.', 'usuario')
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
      const session = await login({ usuario, password, remember })
      onAuthenticated(session.user, session.access_token, remember)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const passwordInvalida = error !== '' && errorField !== 'usuario'

  return (
    <main className="app-shell">
      <img className="login-logo" src="/logo-colegio.svg" alt="Logo del colegio" />
      <div className="login-stage">
      {(error || usersError) && (
          <p className="login-error" id="login-error" role="alert">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5" />
              <path d="M12 16.2h.01" />
            </svg>
            <span>{error || usersError}</span>
          </p>
        )}
        <section className="login-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="field-float">
              <span>Usuario</span>
              <SelectMenu
                id="usuario"
                value={usuario}
                onChange={setUsuario}
                options={usuarioOptions}
                ariaLabel="Usuario"
                placeholder={loadingUsers ? 'Cargando usuarios…' : 'Selecciona tu nombre'}
                disabled={loadingUsers || usuarios.length === 0}
                searchable
              />
            </div>
            <label className="field-float" htmlFor="password">
              <span>Contraseña</span>
              <div className="password-field">
                <input ref={passwordRef} id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" aria-invalid={passwordInvalida ? true : undefined} aria-describedby={error || usersError ? 'login-error' : undefined} />
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
            </label>
            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>Recordar usuario</span>
            </label>
            <button className="primary-action primary-action-solid" type="submit" disabled={loading || loadingUsers || usuarios.length === 0}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
          </form>
        </section>
      </div>
    </main>
  )
}
