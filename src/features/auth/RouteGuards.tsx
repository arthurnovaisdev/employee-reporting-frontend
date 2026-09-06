import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Role } from './auth.types'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function PasswordChangedRoute() {
  const { session } = useAuth()

  if (!session?.passwordChanged) {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { session } = useAuth()

  if (!session) {
    return <Outlet />
  }

  if (!session.passwordChanged) {
    return <Navigate to="/change-password" replace />
  }

  return <Navigate to={session.role === 'ADMIN' ? '/admin/reports' : '/home'} replace />
}

interface RoleRouteProps {
  allowedRoles: Role[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { session } = useAuth()

  if (!session || !allowedRoles.includes(session.role)) {
    return <Navigate to={session?.role === 'ADMIN' ? '/admin/reports' : '/forbidden'} replace />
  }

  return <Outlet />
}
