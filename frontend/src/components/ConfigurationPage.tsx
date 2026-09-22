import type { AuthUser } from '../types/auth'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type ConfigurationPageProps = {
  user: AuthUser
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
}

export function ConfigurationPage({ user, activeRoute, onNavigate, onLogout }: ConfigurationPageProps) {
  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="support-shell">
        <section className="support-content" aria-labelledby="configuration-title">
          <header className="page-heading support-page-heading">
            <div>
              <h1 id="configuration-title">Configuración</h1>
            </div>
          </header>
          <div className="support-card">
            <strong>Panel administrativo</strong>
            <p>Las herramientas para crear usuarios y administrar el sistema estarán disponibles en esta sección.</p>
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
