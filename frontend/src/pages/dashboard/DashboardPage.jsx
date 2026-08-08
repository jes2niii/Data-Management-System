import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/hooks/useCurrency"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import {
  Users,
  UserCircle,
  FileText,
  DollarSign,
  Activity,
  File,
  Clock,
} from "lucide-react"

function formatFileSize(bytes) {
  if (!bytes) return "-"
  const num = Number(bytes)
  if (num < 1024) return num + " B"
  if (num < 1024 * 1024) return (num / 1024).toFixed(1) + " KB"
  return (num / (1024 * 1024)).toFixed(1) + " MB"
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(0) + "K"
  return String(n)
}

export default function DashboardPage() {
  const { symbol, format: formatCurrency } = useCurrency()
  const { user } = useAuth()
  const roleName = user?.role?.name || ""

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then((r) => r.data),
    refetchInterval: 60000,
  })

  const dashboard = data?.data || {}

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Dashboard</h1></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  const isAdmin = roleName === "Super Admin" || roleName === "Administrator"
  const isHR = roleName === "HR"
  const isFinance = roleName === "Finance"

  const allStatsCards = [
    { key: "employees", title: "Total Employees", value: dashboard.total_employees || 0, icon: UserCircle, color: "text-blue-600 dark:text-blue-400", show: isAdmin || isHR },
    { key: "users", title: "Active Users", value: dashboard.active_users || 0, icon: Users, color: "text-green-600 dark:text-green-400", show: isAdmin },
    { key: "documents", title: "Total Documents", value: dashboard.total_documents || 0, icon: FileText, color: "text-purple-600 dark:text-purple-400", show: isAdmin || isHR },
    { key: "bills", title: "Monthly Bills", value: formatCurrency(dashboard.total_monthly_bills || 0), icon: DollarSign, color: "text-orange-600 dark:text-orange-400", show: isAdmin || isFinance },
  ]
  const statsCards = allStatsCards.filter(s => s.show)

  const billingData = (dashboard.monthly_billing_data || []).map((item) => ({
    month: item.month ? format(new Date(item.month + "-01"), "MMM") : "-",
    amount: Number(item.total || 0),
  }))

  const uploadData = (dashboard.document_upload_data || []).map((item) => ({
    month: item.month ? format(new Date(item.month + "-01"), "MMM") : "-",
    documents: Number(item.count || 0),
  }))

  const recentActivities = (dashboard.recent_activities || []).map((log) => ({
    user: log.user?.name || "System",
    action: log.action,
    module: log.module,
    file: log.description,
    time: log.created_at ? format(new Date(log.created_at), "MMM dd, h:mm a") : "-",
  }))

  const latestFiles = (dashboard.latest_files || []).map((doc) => ({
    name: doc.original_name || doc.name,
    size: formatFileSize(doc.file_size),
    uploadedBy: doc.creator?.name || "-",
    date: doc.created_at ? format(new Date(doc.created_at), "yyyy-MM-dd") : "-",
  }))

  const totalStorage = dashboard.storage_usage || 0
  const storageGB = (totalStorage / (1024 * 1024 * 1024)).toFixed(1)
  const storagePercent = Math.min(Math.round((totalStorage / (10 * 1024 * 1024 * 1024)) * 100), 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your data management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(isAdmin || isFinance || isHR) && (
      <div className="grid gap-4 md:grid-cols-2">
        {(isAdmin || isFinance) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Monthly Billing</CardTitle>
          </CardHeader>
          <CardContent>
            {billingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={billingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value) => [`${symbol}${Number(value).toLocaleString()}`, "Amount"]}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No billing data</div>
            )}
          </CardContent>
        </Card>
        )}

        {(isAdmin || isHR) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Document Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={uploadData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="documents" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No upload data</div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent activity</div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.user}{" "}
                        <span className="text-muted-foreground font-normal">
                          {activity.action} {activity.module && `in ${activity.module}`}
                        </span>
                      </p>
                      {activity.file && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <File className="h-3 w-3" />
                          {activity.file}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{storagePercent}%</p>
              <p className="text-xs text-muted-foreground">{storageGB} GB used</p>
            </div>
            <Progress value={storagePercent} className="h-2" />
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Total Documents: {dashboard.total_documents || 0}</p>
              <p>Total Files: {dashboard.total_files || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Latest Files</CardTitle>
        </CardHeader>
        <CardContent>
          {latestFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No files uploaded yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestFiles.map((file, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        {file.name}
                      </div>
                    </TableCell>
                    <TableCell>{file.size}</TableCell>
                    <TableCell>{file.uploadedBy}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.date}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
