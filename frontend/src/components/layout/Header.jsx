import { useAuth } from "@/contexts/AuthContext"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import GlobalSearch from "./GlobalSearch"
import {
  Bell,
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from "lucide-react"

export default function Header({ toggleSidebar, menuButton, sidebarExpanded, sidebarControls, darkMode, toggleDarkMode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U"

  const { data: notifData } = useQuery({
    queryKey: ["header-notifications"],
    queryFn: () => api.get("/notifications", { params: { per_page: 5 } }).then(r => r.data),
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
  })

  const notifications = notifData?.data?.data || []
  const unreadCount = notifications.filter(n => !n.read_at).length

  const displayRole = user?.role?.name || "User"

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-1.5 border-b bg-background px-2 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:bg-gradient-to-r after:from-[#130a5c] after:via-[#ffcc0a] after:to-[#130a5c] after:opacity-70 sm:gap-2 sm:px-4">
      <Button ref={menuButton} variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={toggleSidebar}
        aria-label="Toggle navigation" aria-expanded={sidebarExpanded} aria-controls={sidebarControls}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center sm:justify-center sm:px-2">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle theme">
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-80" align="end">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <Link to="/notifications" className="text-xs text-primary hover:underline">View all</Link>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.slice(0, 5).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1 cursor-pointer"
                onClick={() => {
                  if (!n.read_at) markReadMutation.mutate(n.id)
                  navigate("/notifications")
                }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`text-sm font-medium flex-1 ${!n.read_at ? "" : "text-muted-foreground"}`}>
                    {n.title}
                  </span>
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                <span className="text-xs text-muted-foreground whitespace-normal break-words">{n.message}</span>
                <span className="text-xs text-muted-foreground">{n.created_at ? format(new Date(n.created_at), "MMM dd, h:mm a") : ""}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

        <div className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label="Account menu" className="flex h-10 items-center gap-2 rounded-full px-1 sm:px-2">
              <Avatar className="h-8 w-8 shrink-0 ring-2 ring-[#ffcc0a]/50">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden min-w-0 text-left lg:block">
                <span className="block max-w-[140px] truncate text-sm font-medium leading-tight">{user?.name || "User"}</span>
                <span className="block max-w-[140px] truncate text-xs leading-tight text-muted-foreground">{displayRole}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
