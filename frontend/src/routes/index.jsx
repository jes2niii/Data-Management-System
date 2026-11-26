import { createBrowserRouter, Navigate, Outlet, useRouteError } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/AuthContext"
import AppLayout from "@/components/layout/AppLayout"
import { lazy, Suspense } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import AccessMessage from "@/components/layout/AccessMessage"
import { canOpenPage } from "@/lib/access"

const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"))
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"))
const UsersPage = lazy(() => import("@/pages/users/UsersPage"))
const EmployeesPage = lazy(() => import("@/pages/employees/EmployeesPage"))
const EmployeeDetailPage = lazy(() => import("@/pages/employees/EmployeeDetailPage"))
const DepartmentsPage = lazy(() => import("@/pages/departments/DepartmentsPage"))
const FilesPage = lazy(() => import("@/pages/files/FilesPage"))
const FormsPage = lazy(() => import("@/pages/forms/FormsPage"))
const BillsPage = lazy(() => import("@/pages/billing/BillsPage"))
const BillingAnalytics = lazy(() => import("@/pages/billing/BillingAnalytics"))
const SubscriptionsPage = lazy(() => import("@/pages/billing/SubscriptionsPage"))
const ActivityLogsPage = lazy(() => import("@/pages/activity-logs/ActivityLogsPage"))
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"))
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"))
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"))
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"))
const RolesPermissionsPage = lazy(() => import("@/pages/roles/RolesPermissionsPage"))
const ItemsPage = lazy(() => import("@/pages/items/ItemsPage"))
const AttendancePage = lazy(() => import("@/pages/attendance/AttendancePage"))
const TrainingMonitoringPage = lazy(() => import("@/pages/training/TrainingMonitoringPage"))
const InventoryPage = lazy(() => import("@/pages/inventory/InventoryPage"))
const BookInventoryPage = lazy(() => import("@/pages/books/BookInventoryPage"))
const IncidentReportsPage = lazy(() => import("@/pages/incident-reports/IncidentReportsPage"))

function SuspenseFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function Providers({ children }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </AuthProvider>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, sessionError } = useAuth()
  if (loading || sessionError) return <SessionStatus />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading, sessionError } = useAuth()
  if (loading || sessionError) return <SessionStatus />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function SessionStatus() {
  const { loading, retrySession } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4 text-center">
      {loading ? <p role="status">Checking your session…</p> : <>
        <p role="alert">Could not verify your session. Check your connection and try again.</p>
        <Button onClick={retrySession}>Retry</Button>
      </>}
    </div>
  )
}

function RouteError() {
  const error = useRouteError()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-2xl font-semibold">Could not load this page</h1>
      <p role="alert" className="max-w-lg text-sm text-muted-foreground">
        {error?.message || "The page module could not be fetched. Reload to try again."}
      </p>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
    </div>
  )
}

function ModuleRoute({ page, children }) {
  const { user } = useAuth()
  if (!canOpenPage(user, page)) return <AccessMessage />
  return <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <Providers><Outlet /></Providers>,
    errorElement: <RouteError />,
    children: [
      {
        path: "/login",
        element: (
          <PublicRoute>
            <Suspense fallback={<SuspenseFallback />}><LoginPage /></Suspense>
          </PublicRoute>
        ),
      },
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <ModuleRoute page="dashboard"><DashboardPage /></ModuleRoute> },
          { path: "users", element: <ModuleRoute page="users"><UsersPage /></ModuleRoute> },
          { path: "employees", element: <ModuleRoute page="employees"><EmployeesPage /></ModuleRoute> },
          { path: "employees/:id", element: <ModuleRoute page="employees"><EmployeeDetailPage /></ModuleRoute> },
          { path: "departments", element: <ModuleRoute page="departments"><DepartmentsPage /></ModuleRoute> },
          { path: "files", element: <ModuleRoute page="files"><FilesPage /></ModuleRoute> },
          { path: "forms", element: <ModuleRoute page="forms"><FormsPage /></ModuleRoute> },
          { path: "billing", element: <ModuleRoute page="billing"><BillsPage /></ModuleRoute> },
          { path: "billing/analytics", element: <ModuleRoute page="billing"><BillingAnalytics /></ModuleRoute> },
          { path: "billing/subscriptions", element: <ModuleRoute page="billing"><SubscriptionsPage /></ModuleRoute> },
          { path: "activity-logs", element: <ModuleRoute page="activity-logs"><ActivityLogsPage /></ModuleRoute> },
          { path: "reports", element: <ModuleRoute page="reports"><ReportsPage /></ModuleRoute> },
          { path: "settings", element: <Suspense fallback={<SuspenseFallback />}><SettingsPage /></Suspense> },
          { path: "notifications", element: <ModuleRoute page="notifications"><NotificationsPage /></ModuleRoute> },
          { path: "profile", element: <ModuleRoute page="profile"><ProfilePage /></ModuleRoute> },
          { path: "roles", element: <ModuleRoute page="roles"><RolesPermissionsPage /></ModuleRoute> },
          { path: "items", element: <ModuleRoute page="items"><ItemsPage /></ModuleRoute> },
          { path: "attendance", element: <ModuleRoute page="attendance"><AttendancePage /></ModuleRoute> },
          { path: "training", element: <ModuleRoute page="training"><TrainingMonitoringPage /></ModuleRoute> },
          { path: "training-monitoring", element: <Navigate to="/training" replace /> },
          { path: "inventory", element: <ModuleRoute page="inventory"><InventoryPage /></ModuleRoute> },
          { path: "books", element: <ModuleRoute page="books"><BookInventoryPage /></ModuleRoute> },
          { path: "incident-reports", element: <ModuleRoute page="incident-reports"><IncidentReportsPage /></ModuleRoute> },
          { path: "incident-reports/create", element: <ModuleRoute page="incident-reports"><IncidentReportsPage /></ModuleRoute> },
          { path: "incident-reports/:id/edit", element: <ModuleRoute page="incident-reports"><IncidentReportsPage /></ModuleRoute> },
          { path: "incident-reports/:id", element: <ModuleRoute page="incident-reports"><IncidentReportsPage /></ModuleRoute> },
          { path: "*", element: <AccessMessage missing /> },
        ],
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
])
