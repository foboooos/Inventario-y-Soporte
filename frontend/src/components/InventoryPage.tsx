import { useEffect, useMemo, useState } from 'react'
import { getInventory } from '../services/inventory'
import type { AuthUser } from '../types/auth'
import type { Device, DeviceStatus, DeviceType } from '../types/inventory'
import { CreateDeviceForm } from './CreateDeviceForm'
import { DashboardLayout } from './DashboardLayout'
import type { RouteKey } from './Sidebar'

type InventoryPageProps = {
  user: AuthUser
  accessToken: string
  onLogout: () => void
  activeRoute: RouteKey
  onNavigate: (route: RouteKey) => void
}

type TypeFilter = 'ALL' | DeviceType
type StatusFilter = 'ALL' | DeviceStatus

const statusLabels: Record<DeviceStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  BAJA_TECNICA: 'Baja técnica',
}

const typeLabels: Record<DeviceType, string> = {
  PC: 'PC',
  PROYECTOR: 'Proyector',
  IMPRESORA: 'Impresora',
  RED: 'Red',
}

export function InventoryPage({ user, accessToken, onLogout, activeRoute, onNavigate }: InventoryPageProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    let active = true

    getInventory(accessToken)
      .then((loadedDevices) => {
        if (active) setDevices(loadedDevices)
      })
      .catch((exception: unknown) => {
        if (active) setError(exception instanceof Error ? exception.message : 'No se pudo cargar el inventario')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const filteredDevices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return devices.filter((device) => {
      const matchesSearch = !normalizedSearch || [device.code, device.brand, device.model, device.location]
        .some((value) => value.toLowerCase().includes(normalizedSearch))
      const matchesType = typeFilter === 'ALL' || device.type === typeFilter
      const matchesStatus = statusFilter === 'ALL' || device.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [devices, search, typeFilter, statusFilter])

  return (
    <DashboardLayout user={user} activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="inventory-shell">
        <section className="inventory-content" aria-labelledby="inventory-title">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Inventario</span>
            <h1 id="inventory-title">Dispositivos</h1>
            <p className="subtitle">Consulta y administra los equipos registrados en el establecimiento.</p>
          </div>
          <div className="heading-actions">
            <div className="inventory-count" aria-label={`${filteredDevices.length} dispositivos visibles`}>
              <strong>{filteredDevices.length}</strong>
              <span>dispositivos</span>
            </div>
            {user.rol === 'ADMIN' && <button className="primary-action" type="button" onClick={() => setShowCreateForm(true)}>+ Nuevo dispositivo</button>}
          </div>
        </div>

        {showCreateForm && user.rol === 'ADMIN' && (
          <CreateDeviceForm
            accessToken={accessToken}
            onCancel={() => setShowCreateForm(false)}
            onCreated={(createdDevice) => {
              setDevices((current) => [...current, createdDevice])
              setShowCreateForm(false)
            }}
          />
        )}

        <div className="inventory-toolbar">
          <label className="search-field">
            <span>Buscar</span>
            <input type="search" placeholder="Código, marca o ubicación" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label>
            <span>Tipo</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
              <option value="ALL">Todos</option>
              <option value="PC">PC</option>
              <option value="PROYECTOR">Proyectores</option>
              <option value="IMPRESORA">Impresoras</option>
              <option value="RED">Red</option>
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="ALL">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="BAJA_TECNICA">Baja técnica</option>
            </select>
          </label>
        </div>

        <div className="table-card">
          {loading && <p className="empty-state">Cargando inventario…</p>}
          {!loading && error && <p className="error empty-state" role="alert">{error}</p>}
          {!loading && !error && (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Listado de dispositivos del inventario</caption>
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Marca y modelo</th>
                    <th scope="col">Ubicación</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device) => (
                    <tr key={device.id}>
                      <td className="device-code">{device.code}</td>
                      <td>{typeLabels[device.type]}</td>
                      <td><strong>{device.brand}</strong><span className="secondary-cell">{device.model}</span></td>
                      <td>{device.location}</td>
                      <td><span className={`status status-${device.status.toLowerCase()}`}>{statusLabels[device.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDevices.length === 0 && <p className="empty-state">No encontramos dispositivos con esos filtros.</p>}
            </div>
          )}
        </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
