import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Role } from './auth.types'

export function ProtectedRoute() {
  const { isAuthenticated, session } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!session.passwordChanged && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}

interface RoleRouteProps {
  allowedRoles: Role[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { session } = useAuth()

  if (!session || !allowedRoles.includes(session.role)) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
