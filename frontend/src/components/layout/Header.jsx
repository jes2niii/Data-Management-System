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
import { Input } from "@/components/ui/input"
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
  Settings,
} from "lucide-react"

export default function Header({ toggleSidebar, darkMode, toggleDarkMode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U"

  const userPerms = user?.permissions || user?.role?.permissions || []
  const permNames = userPerms.map(p => typeof p === "object" ? p.name : p)
  const canAccessSettings = user?.role?.name === "Super Admin" || permNames.includes("settings.read")

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

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-9 h-9" />
      </div>

      <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end">
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
                <span className="text-xs text-muted-foreground line-clamp-1">{n.message}</span>
                <span className="text-xs text-muted-foreground">{n.created_at ? format(new Date(n.created_at), "MMM dd, h:mm a") : ""}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
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
            <a href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </a>
          </DropdownMenuItem>
          {canAccessSettings && (
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
