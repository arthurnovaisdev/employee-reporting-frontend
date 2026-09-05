import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PublicLayout } from '../components/layout/PublicLayout'
import { ProtectedRoute, RoleRoute } from '../features/auth/RouteGuards'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { HomePage } from '../pages/HomePage'
import { NewReportPage } from '../pages/reports/NewReportPage'
import { ProtocolConsultPage } from '../pages/reports/ProtocolConsultPage'
import { ReportSuccessPage } from '../pages/reports/ReportSuccessPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/reports/new" element={<NewReportPage />} />
          <Route path="/reports/success" element={<ReportSuccessPage />} />
          <Route path="/reports/consult" element={<ProtocolConsultPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
