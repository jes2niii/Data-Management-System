import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FileText,
  FileSpreadsheet,
  DollarSign,
  Activity,
  BarChart3,
  Settings,
  Bell,
  User,
  ChevronLeft,
  ChevronDown,
  Building2,
  Mail,
  Tags,
  Shield,
  Package,
  ClipboardList,
  Beaker,
  Calendar,
} from "lucide-react"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { to: "/users", label: "Users", icon: Users, permission: "users.read" },
  { to: "/employees", label: "Employees", icon: UserCircle, permission: "employees.read" },
  { to: "/files", label: "Files", icon: FileText, permission: "documents.read" },
  { to: "/forms", label: "Forms", icon: FileSpreadsheet, permission: "forms.read" },
  { to: "/billing", label: "Billing", icon: DollarSign, permission: "bills.read" },
  { to: "/attendance", label: "Attendance", icon: Calendar, permission: null },
  { to: "/activity-logs", label: "Activity Logs", icon: Activity, permission: "activity_logs.read" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "reports.read" },
  { to: "/notifications", label: "Notifications", icon: Bell, permission: null },
  { to: "/profile", label: "Profile", icon: User, permission: null },
]

const settingsSubItems = [
  { to: "/settings?tab=general", label: "General", icon: Building2, permission: "settings.read" },
  { to: "/settings?tab=email", label: "Email SMTP", icon: Mail, permission: "settings.read" },
  { to: "/settings?tab=categories", label: "Categories", icon: Tags, permission: "settings.read" },
  { to: "/settings?tab=roles", label: "Roles & Permissions", icon: Shield, permission: "roles.read" },
]

const itemAnalysisSubItems = [
  { to: "/items?tab=survey", label: "Surveys", icon: ClipboardList, permission: "surveys" },
  { to: "/items?tab=test", label: "Test Items", icon: Beaker, permission: "surveys" },
]

function hasPermission(user, permission) {
  if (!permission) return true
  if (!user) return false
  if (user.role?.name === "Super Admin") return true
  const perms = user.permissions || user.role?.permissions || []
  const names = perms.map(p => typeof p === "object" ? p.name : p)
  return names.includes(permission)
}

export default function Sidebar({ isOpen }) {
  const location = useLocation()
  const { user } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [itemAnalysisOpen, setItemAnalysisOpen] = useState(false)
  const isSettingsActive = location.pathname.startsWith("/settings")
  const isItemsActive = location.pathname.startsWith("/items")

  const visibleItems = navItems.filter((item) => hasPermission(user, item.permission))
  const visibleSubItems = settingsSubItems.filter((item) => hasPermission(user, item.permission))
  const hasSettingsAccess = visibleSubItems.length > 0

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar-background transition-all duration-300",
        isOpen ? "w-64" : "w-0 overflow-hidden md:w-16"
      )}
    >
      <div className="flex h-14 items-center justify-center border-b px-4">
        <span className={cn("font-bold text-sidebar-foreground", !isOpen && "md:hidden")}>
          DMS
        </span>
        <span className={cn("hidden text-xs font-bold text-sidebar-foreground", !isOpen && "md:block")}>
          DMS
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/")
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "md:justify-center md:px-2"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={cn(!isOpen && "md:hidden")}>{item.label}</span>
            </NavLink>
          )
        })}

        <div>
          <button
            onClick={() => setItemAnalysisOpen(!itemAnalysisOpen)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
              isItemsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isOpen && "md:justify-center md:px-2"
            )}
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className={cn("flex-1 text-left", !isOpen && "md:hidden")}>Item Analysis</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", itemAnalysisOpen && "rotate-180", !isOpen && "md:hidden")} />
          </button>
          {itemAnalysisOpen && (
            <div className="ml-2 mt-1 space-y-1 border-l-2 border-muted pl-2">
              {itemAnalysisSubItems.map((sub) => {
                const SubIcon = sub.icon
                const subTab = new URLSearchParams(sub.to.split("?")[1]).get("tab")
                const currentTab = new URLSearchParams(location.search).get("tab") || "survey"
                const subActive = currentTab === subTab
                return (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                      subActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      !isOpen && "md:hidden"
                    )}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" />
                    <span>{sub.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>

        {hasSettingsAccess && (
        <div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
              isSettingsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isOpen && "md:justify-center md:px-2"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className={cn("flex-1 text-left", !isOpen && "md:hidden")}>Settings</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen && "rotate-180", !isOpen && "md:hidden")} />
          </button>
          {settingsOpen && (
            <div className="ml-2 mt-1 space-y-1 border-l-2 border-muted pl-2">
              {visibleSubItems.map((sub) => {
                const SubIcon = sub.icon
                const isSubActive = location.search === sub.to.split("?")[1]?.split("&")[0] || (location.pathname === "/settings" && sub.to.includes("tab=general") && !location.search.includes("tab="))
                // match tab param
                const params = new URLSearchParams(location.search)
                const currentTab = params.get("tab") || "general"
                const subTab = new URLSearchParams(sub.to.split("?")[1]).get("tab")
                const subActive = currentTab === subTab
                return (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                      subActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      !isOpen && "md:hidden"
                    )}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" />
                    <span>{sub.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>
        )}
      </nav>
    </aside>
  )
}
