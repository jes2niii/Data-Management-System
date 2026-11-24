import { useState, useEffect } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/hooks/useBranding"
import { cn } from "@/lib/utils"
import { canOpenPage, canOpenSettingsTab, settingsTabFor } from "@/lib/access"
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
  ChevronDown,
  Building2,
  Mail,
  Tags,
  Shield,
  Package,
  ClipboardList,
  Beaker,
  Calendar,
  GraduationCap,
  Palette,
  Boxes,
  Library,
  X,
} from "lucide-react"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/employees", label: "Employees", icon: UserCircle },
  { to: "/files", label: "Files", icon: FileText },
  { to: "/forms", label: "Forms", icon: FileSpreadsheet },
  { to: "/billing", label: "Billing", icon: DollarSign },
  { to: "/attendance", label: "Attendance", icon: Calendar },
  { to: "/training", label: "Training Monitoring", icon: GraduationCap },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/books", label: "Book Inventory", icon: Library },
  { to: "/activity-logs", label: "Activity Logs", icon: Activity },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
]

const settingsSubItems = [
  { tab: "general", label: "General", icon: Building2 },
  { tab: "personalization", label: "Personalization", icon: Palette },
  { tab: "email", label: "Email SMTP", icon: Mail },
  { tab: "categories", label: "Categories", icon: Tags },
  { tab: "trainings", label: "Trainings", icon: GraduationCap },
  { tab: "roles", label: "Roles & Permissions", icon: Shield },
]

const itemAnalysisSubItems = [
  { tab: "survey", label: "Surveys", icon: ClipboardList },
  { tab: "test", label: "Test Items", icon: Beaker },
]
export default function Sidebar({ isOpen, onClose, onExpand, isMobile }) {
  const location = useLocation()
  const { user } = useAuth()
  const { companyName = "SEATECH", logoUrl = null } = useBranding()
  const isSeatech = String(companyName || "SEATECH").trim().toUpperCase() === "SEATECH"
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [itemAnalysisOpen, setItemAnalysisOpen] = useState(false)
  const isSettingsActive = location.pathname.startsWith("/settings")
  const isItemsActive = location.pathname.startsWith("/items")

  // Auto-expand the dropdown containing the current route (never auto-close).
  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true)
  }, [isSettingsActive])
  useEffect(() => {
    if (isItemsActive) setItemAnalysisOpen(true)
  }, [isItemsActive])

  const visibleItems = navItems.filter((item) => canOpenPage(user, item.to.slice(1)))
  const visibleSubItems = settingsSubItems.filter((item) => canOpenSettingsTab(user, item.tab))
  const visibleAnalysisItems = canOpenPage(user, "items") ? itemAnalysisSubItems : []
  const hasSettingsAccess = visibleSubItems.length > 0

  const closeOnMobile = () => {
    if (isMobile && onClose) onClose()
  }

  return (
    <aside
      id={isMobile ? undefined : "desktop-sidebar"}
      className={cn(
        "flex flex-col border-r bg-sidebar-background transition-all duration-300",
        isMobile ? "h-full w-full" : "hidden md:flex",
        !isMobile && (isOpen ? "w-64" : "w-16 overflow-hidden")
      )}
    >
      <div className="flex h-16 shrink-0 flex-col justify-center gap-1.5 border-b border-sidebar-border bg-sidebar-background px-4">
        <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5 shadow"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-black text-sidebar-primary-foreground shadow">
              {(companyName || "S").charAt(0).toUpperCase()}
            </div>
          )}
          <div className={cn("leading-none", !isOpen && "md:hidden")}>
            {isSeatech ? (
              <>
                <div className="text-[15px] font-black tracking-wide text-white">
                  SEA<span className="text-sidebar-primary">TECH</span>
                </div>
                <div className="mt-0.5 text-[9px] font-medium tracking-wider text-sidebar-foreground/70">
                  Maritime Training & Assessment
                </div>
              </>
            ) : (
              <div className="max-w-[180px] break-words text-sm font-black leading-tight tracking-wide text-white">
                {companyName}
              </div>
            )}
          </div>
          <div className={cn("hidden leading-none", !isOpen && "md:block")}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${companyName} logo`}
                className="h-8 w-8 rounded-md bg-white object-contain p-0.5"
              />
            ) : (
              <div className="text-xs font-black text-white">
                {(companyName || "S").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
          {isMobile && <button type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>}
        </div>
        <div className={cn("seatech-brand-bar w-full rounded-full", !isOpen && "md:hidden")} />
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-2 pb-6">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/")
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              onClick={closeOnMobile}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "md:min-h-0 md:justify-center md:px-2 md:py-2"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={cn("truncate", !isOpen && "md:hidden")}>{item.label}</span>
            </NavLink>
          )
        })}

        {visibleAnalysisItems.length > 0 && <div>
          <button
            onClick={() => { if (!isOpen) onExpand(); setItemAnalysisOpen(!isOpen || !itemAnalysisOpen) }}
            aria-label="Item Analysis"
            aria-expanded={isOpen && itemAnalysisOpen}
            className={cn(
              "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors w-full",
              isItemsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isOpen && "md:min-h-0 md:justify-center md:px-2 md:py-2"
            )}
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className={cn("flex-1 truncate text-left", !isOpen && "md:hidden")}>Item Analysis</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", itemAnalysisOpen && "rotate-180", !isOpen && "md:hidden")} />
          </button>
          {isOpen && itemAnalysisOpen && (
            <div className="ml-2 mt-1 space-y-1 border-l-2 border-muted pl-2">
              {visibleAnalysisItems.map((sub) => {
                const SubIcon = sub.icon
                 const currentTab = new URLSearchParams(location.search).get("tab") || "survey"
                 const subActive = isItemsActive && currentTab === sub.tab
                return (
                   <Link
                     key={sub.tab}
                     to={`/items?tab=${sub.tab}`}
                     aria-current={subActive ? "page" : undefined}
                    onClick={closeOnMobile}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      subActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      !isOpen && "md:hidden"
                    )}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{sub.label}</span>
                   </Link>
                )
              })}
            </div>
          )}
        </div>}

        {hasSettingsAccess && (
        <div>
          <button
            onClick={() => { if (!isOpen) onExpand(); setSettingsOpen(!isOpen || !settingsOpen) }}
            aria-label="Settings"
            aria-expanded={isOpen && settingsOpen}
            className={cn(
              "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors w-full",
              isSettingsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isOpen && "md:min-h-0 md:justify-center md:px-2 md:py-2"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className={cn("flex-1 truncate text-left", !isOpen && "md:hidden")}>Settings</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", settingsOpen && "rotate-180", !isOpen && "md:hidden")} />
          </button>
          {isOpen && settingsOpen && (
            <div className="ml-2 mt-1 space-y-1 border-l-2 border-muted pl-2">
              {visibleSubItems.map((sub) => {
                const SubIcon = sub.icon
                // match tab param — only when actually on a /settings route,
                // otherwise every expand would highlight the default tab.
                const params = new URLSearchParams(location.search)
                 const currentTab = settingsTabFor(user, params.get("tab"))
                 const subActive = isSettingsActive && currentTab === sub.tab
                return (
                   <Link
                     key={sub.tab}
                     to={`/settings?tab=${sub.tab}`}
                     aria-current={subActive ? "page" : undefined}
                    onClick={closeOnMobile}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      subActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      !isOpen && "md:hidden"
                    )}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{sub.label}</span>
                   </Link>
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
