import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PublicLayout } from '../components/layout/PublicLayout'
import {
  GuestRoute,
  PasswordChangedRoute,
  ProtectedRoute,
  RoleRoute,
} from '../features/auth/RouteGuards'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage'
import { ForbiddenPage } from '../pages/auth/ForbiddenPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { HomePage } from '../pages/HomePage'
import { NewReportPage } from '../pages/reports/NewReportPage'
import { ProtocolConsultPage } from '../pages/reports/ProtocolConsultPage'
import { ReportSuccessPage } from '../pages/reports/ReportSuccessPage'
import { ReportFlowLayout, ReportFlowShell } from '../features/reports/ReportFlowLayout'

export function AppRouter() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleUnauthorized = () => navigate('/login', { replace: true })
    const handleForbidden = () => navigate('/forbidden', { replace: true })

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    window.addEventListener('auth:forbidden', handleForbidden)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      window.removeEventListener('auth:forbidden', handleForbidden)
    }
  }, [navigate])

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ReportFlowLayout />}>
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={['EMPLOYEE']} />}>
            <Route element={<PasswordChangedRoute />}>
              <Route element={<ReportFlowShell />}>
                <Route path="/reports/new" element={<NewReportPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
        {/* Um comprovante em memória continua acessível se o upload expirar
            a sessão. A página bloqueia ADMIN e acesso sem comprovante. */}
        <Route element={<AppShell />}>
          <Route path="/reports/success" element={<ReportSuccessPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route element={<PasswordChangedRoute />}>
          <Route element={<RoleRoute allowedRoles={['EMPLOYEE']} />}>
            <Route path="/home" element={<HomePage />} />
          </Route>

          <Route element={<AppShell />}>
            <Route path="/forbidden" element={<ForbiddenPage />} />

            <Route element={<RoleRoute allowedRoles={['EMPLOYEE']} />}>
              <Route path="/reports/consult" element={<ProtocolConsultPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/*" element={<Navigate to="/admin/reports" replace />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
