import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/AuthContext"
import AppLayout from "@/components/layout/AppLayout"
import { lazy, Suspense } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"

const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"))
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"))
const UsersPage = lazy(() => import("@/pages/users/UsersPage"))
const EmployeesPage = lazy(() => import("@/pages/employees/EmployeesPage"))
const EmployeeDetailPage = lazy(() => import("@/pages/employees/EmployeeDetailPage"))
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
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function NotFound() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <a href="/dashboard" className="text-primary hover:underline">Go to Dashboard</a>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <Providers><Outlet /></Providers>,
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
          { path: "dashboard", element: <Suspense fallback={<SuspenseFallback />}><DashboardPage /></Suspense> },
          { path: "users", element: <Suspense fallback={<SuspenseFallback />}><UsersPage /></Suspense> },
          { path: "employees", element: <Suspense fallback={<SuspenseFallback />}><EmployeesPage /></Suspense> },
          { path: "employees/:id", element: <Suspense fallback={<SuspenseFallback />}><EmployeeDetailPage /></Suspense> },
          { path: "files", element: <Suspense fallback={<SuspenseFallback />}><FilesPage /></Suspense> },
          { path: "forms", element: <Suspense fallback={<SuspenseFallback />}><FormsPage /></Suspense> },
          { path: "billing", element: <Suspense fallback={<SuspenseFallback />}><BillsPage /></Suspense> },
          { path: "billing/analytics", element: <Suspense fallback={<SuspenseFallback />}><BillingAnalytics /></Suspense> },
          { path: "billing/subscriptions", element: <Suspense fallback={<SuspenseFallback />}><SubscriptionsPage /></Suspense> },
          { path: "activity-logs", element: <Suspense fallback={<SuspenseFallback />}><ActivityLogsPage /></Suspense> },
          { path: "reports", element: <Suspense fallback={<SuspenseFallback />}><ReportsPage /></Suspense> },
          { path: "settings", element: <Suspense fallback={<SuspenseFallback />}><SettingsPage /></Suspense> },
          { path: "notifications", element: <Suspense fallback={<SuspenseFallback />}><NotificationsPage /></Suspense> },
          { path: "profile", element: <Suspense fallback={<SuspenseFallback />}><ProfilePage /></Suspense> },
          { path: "roles", element: <Suspense fallback={<SuspenseFallback />}><RolesPermissionsPage /></Suspense> },
          { path: "items", element: <Suspense fallback={<SuspenseFallback />}><ItemsPage /></Suspense> },
          { path: "attendance", element: <Suspense fallback={<SuspenseFallback />}><AttendancePage /></Suspense> },
          { path: "training", element: <Suspense fallback={<SuspenseFallback />}><TrainingMonitoringPage /></Suspense> },
          { path: "training-monitoring", element: <Navigate to="/training" replace /> },
          { path: "inventory", element: <Suspense fallback={<SuspenseFallback />}><InventoryPage /></Suspense> },
          { path: "books", element: <Suspense fallback={<SuspenseFallback />}><BookInventoryPage /></Suspense> },
          { path: "*", element: <NotFound /> },
        ],
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
])
