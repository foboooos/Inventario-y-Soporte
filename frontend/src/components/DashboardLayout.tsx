import { isValidElement, useState, type ReactNode } from 'react'
import { ToastBar, Toaster } from 'react-hot-toast'
import type { AuthUser } from '../types/auth'
import { Sidebar } from './Sidebar'
import type { RouteKey } from '../routes'

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed'

type TicketToastMessageProps = {
  ticketCode?: string
  onOpenInbox?: () => void
}

type DashboardLayoutProps = {
  children: ReactNode
  user: AuthUser
  activeRoute: RouteKey | null
  onNavigate: (route: RouteKey) => void
  onLogout: () => void
  headerAction?: { label: string; onClick: () => void }
}

export function DashboardLayout({ children, user, activeRoute, onNavigate, onLogout, headerAction }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleNavigate(route: RouteKey) {
    setMobileOpen(false)
    onNavigate(route)
  }

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div
      className={`dashboard-layout${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}
      data-route={activeRoute ?? undefined}
    >
      <Sidebar
        user={user}
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((current) => !current)}
        headerAction={headerAction}
      />
      <button
        className="sidebar-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        aria-expanded={!collapsed}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {collapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
        </svg>
      </button>
      <div className="dashboard-main">{children}</div>
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{ top: 12, right: 12 }}
        toastOptions={{
          duration: 10000,
          ariaProps: { role: 'status', 'aria-live': 'polite' },
        }}
      >
        {(ticketToast) => {
          const toastMessage = isValidElement<TicketToastMessageProps>(ticketToast.message)
            ? ticketToast.message
            : null
          const onOpenInbox = toastMessage?.props.onOpenInbox

          return (
            <div
              className="ticket-toast-clickable"
              role={onOpenInbox ? 'link' : undefined}
              tabIndex={onOpenInbox ? 0 : undefined}
              aria-label={toastMessage?.props.ticketCode ? `Abrir ${toastMessage.props.ticketCode} en la bandeja` : undefined}
              onClick={onOpenInbox}
              onKeyDown={(event) => {
                if (!onOpenInbox || event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenInbox()
                }
              }}
            >
              <ToastBar
                toast={ticketToast}
                style={{
                  ...ticketToast.style,
                  alignItems: 'flex-start',
                  width: 'min(250px, calc(100vw - 24px))',
                  minWidth: 'min(230px, calc(100vw - 24px))',
                  maxWidth: 'calc(100vw - 24px)',
                  boxSizing: 'border-box',
                }}
              >
                {({ icon, message }) => (
                  <>
                    <span className="ticket-toast-icon-offset">{icon}</span>
                    {message}
                  </>
                )}
              </ToastBar>
            </div>
          )
        }}
      </Toaster>
    </div>
  )
}
