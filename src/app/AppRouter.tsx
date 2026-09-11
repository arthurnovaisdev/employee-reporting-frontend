import { Box, CircularProgress, Typography } from '@mui/material'
import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PublicLayout } from '../components/layout/PublicLayout'
import {
  GuestRoute,
  PasswordChangedRoute,
  ProtectedRoute,
  RoleRoute,
} from '../features/auth/RouteGuards'
import { ReportFlowLayout, ReportFlowShell } from '../features/reports/ReportFlowLayout'
import { useAuth } from '../features/auth/AuthContext'

const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })))
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })))
const ForbiddenPage = lazy(() => import('../pages/auth/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const HomePage = lazy(() => import('../pages/HomePage').then((module) => ({ default: module.HomePage })))
const NewReportPage = lazy(() => import('../pages/reports/NewReportPage').then((module) => ({ default: module.NewReportPage })))
const ProtocolConsultPage = lazy(() => import('../pages/reports/ProtocolConsultPage').then((module) => ({ default: module.ProtocolConsultPage })))
const ReportSuccessPage = lazy(() => import('../pages/reports/ReportSuccessPage').then((module) => ({ default: module.ReportSuccessPage })))

function RouteLoading() {
  return (
    <Box role="status" aria-live="polite" sx={{ minHeight: 240, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 1.5 }}>
      <CircularProgress size={30} aria-hidden="true" />
      <Typography color="text.secondary">Carregando página…</Typography>
    </Box>
  )
}

export function AppRouter() {
  const navigate = useNavigate()
  const { session } = useAuth()

  useEffect(() => {
    const eventMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: unknown }>).detail
      return typeof detail?.message === 'string' ? detail.message : undefined
    }
    const handleUnauthorized = (event: Event) => navigate('/login', {
      replace: true,
      state: { authMessage: eventMessage(event) ?? 'Sua sessão expirou. Faça login novamente.' },
    })
    const handleForbidden = (event: Event) => {
      if (session?.passwordChanged === false) {
        navigate('/change-password', { replace: true })
        return
      }

      navigate('/forbidden', {
        replace: true,
        state: { accessMessage: eventMessage(event) },
      })
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    window.addEventListener('auth:forbidden', handleForbidden)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      window.removeEventListener('auth:forbidden', handleForbidden)
    }
  }, [navigate, session?.passwordChanged])

  return (
    <Suspense fallback={<RouteLoading />}>
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
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/*" element={<Navigate to="/admin/reports" replace />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
