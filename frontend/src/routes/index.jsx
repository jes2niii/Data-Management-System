import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/AuthContext"
import AppLayout from "@/components/layout/AppLayout"
import DashboardPage from "@/pages/dashboard/DashboardPage"
import LoginPage from "@/pages/auth/LoginPage"
import UsersPage from "@/pages/users/UsersPage"
import EmployeesPage from "@/pages/employees/EmployeesPage"
import EmployeeDetailPage from "@/pages/employees/EmployeeDetailPage"
import FilesPage from "@/pages/files/FilesPage"
import FormsPage from "@/pages/forms/FormsPage"
import BillsPage from "@/pages/billing/BillsPage"
import BillingAnalytics from "@/pages/billing/BillingAnalytics"
import ActivityLogsPage from "@/pages/activity-logs/ActivityLogsPage"
import ReportsPage from "@/pages/reports/ReportsPage"
import SettingsPage from "@/pages/settings/SettingsPage"
import NotificationsPage from "@/pages/notifications/NotificationsPage"
import ProfilePage from "@/pages/profile/ProfilePage"
import RolesPermissionsPage from "@/pages/roles/RolesPermissionsPage"
import ItemsPage from "@/pages/items/ItemsPage"
import AttendancePage from "@/pages/attendance/AttendancePage"
import { useAuth } from "@/contexts/AuthContext"

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
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

export const router = createBrowserRouter([
  {
    element: <Providers><Outlet /></Providers>,
    children: [
      {
        path: "/login",
        element: (
          <PublicRoute>
            <LoginPage />
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
          { path: "dashboard", element: <DashboardPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "employees", element: <EmployeesPage /> },
          { path: "employees/:id", element: <EmployeeDetailPage /> },
          { path: "files", element: <FilesPage /> },
          { path: "forms", element: <FormsPage /> },
          { path: "billing", element: <BillsPage /> },
          { path: "billing/analytics", element: <BillingAnalytics /> },
          { path: "activity-logs", element: <ActivityLogsPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "roles", element: <RolesPermissionsPage /> },
          { path: "items", element: <ItemsPage /> },
          { path: "attendance", element: <AttendancePage /> },
        ],
      },
    ],
  },
])
