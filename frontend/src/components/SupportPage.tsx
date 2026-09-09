import type { AuthUser } from '../types/auth'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type SupportPageProps = {
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

export function SupportPage({ user, activeRoute, onNavigate, onLogout }: SupportPageProps) {
  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-content" aria-labelledby="support-title">
        <span className="eyebrow">Soporte</span>
        <h1 id="support-title">Solicitar asistencia</h1>
        <p className="subtitle">Desde aquí podrás registrar y consultar tus solicitudes de soporte.</p>
        <div className="support-card">
          <strong>Módulo de tickets</strong>
          <p>El formulario para ingresar reclamos estará disponible en esta sección.</p>
        </div>
      </main>
    </DashboardLayout>
  )
}
