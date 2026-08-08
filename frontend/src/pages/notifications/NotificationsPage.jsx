import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format, isToday, isYesterday } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Bell, Mail, CheckCheck, Calendar, UserPlus,
  FileText, AlertCircle, DollarSign, Settings,
} from "lucide-react"

const iconMap = {
  message: Mail,
  calendar: Calendar,
  user: UserPlus,
  file: FileText,
  alert: AlertCircle,
  billing: DollarSign,
  system: Settings,
  default: Bell,
}

function getGroupLabel(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMMM dd, yyyy")
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post("/notifications/mark-all-read"),
    onSuccess: () => {
      toast.success("All notifications marked as read")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const notifications = data?.data?.data || (Array.isArray(data?.data) ? data.data : [])
  const unreadCount = notifications.filter((n) => !n.read_at && !n.is_read).length

  const grouped = notifications.reduce((acc, n) => {
    const dateKey = n.created_at ? format(new Date(n.created_at), "yyyy-MM-dd") : "Unknown"
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(n)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            disabled={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {markAllReadMutation.isPending ? "Marking..." : "Mark All as Read"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive">Failed to load notifications.</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-30" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              <p className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1 z-10">
                {getGroupLabel(dateKey)}
              </p>
              <div className="space-y-2">
                {items.map((notification) => {
                  const Icon = iconMap[notification.type] || iconMap.default
                  const isUnread = !notification.read_at && !notification.is_read
                  return (
                    <Card
                      key={notification.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        isUnread && "border-l-4 border-l-primary bg-primary/5"
                      )}
                      onClick={() => {
                        if (isUnread) {
                          markAsReadMutation.mutate(notification.id)
                        }
                      }}
                    >
                      <CardContent className="flex items-start gap-4 py-4">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-sm", isUnread && "font-semibold")}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              {isUnread && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {notification.created_at &&
                                  format(new Date(notification.created_at), "h:mm a")}
                              </span>
                            </div>
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
