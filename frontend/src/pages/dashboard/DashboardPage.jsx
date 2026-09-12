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
  GraduationCap,
  Wallet,
  Banknote,
  TrendingUp,
  Boxes,
  AlertTriangle,
  Package,
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

  const trainingStats = dashboard.training_stats || {}
  const trainingByCourse = trainingStats.by_course || []
  const trainingMonthly = (trainingStats.monthly_revenue || []).map((item) => ({
    month: item.month ? format(new Date(item.month + "-01"), "MMM") : "-",
    revenue: Number(item.revenue || 0),
    collected: Number(item.collected || 0),
    outstanding: Number(item.outstanding || 0),
    count: Number(item.count || 0),
    rawMonth: item.month,
  }))
  const trainingBySystem = trainingStats.by_system || []
  const trainingByCategory = trainingStats.by_category || []
  const trainingByRemarks = trainingStats.by_remarks || []
  const inventoryStats = dashboard.inventory_stats || {}
  const inventoryByCategory = inventoryStats.by_category || []
  const inventoryByStatus = inventoryStats.by_status || []
  const monthlyEnrollments = (trainingStats.monthly_enrollments || []).map((item) => ({
    month: item.month ? format(new Date(item.month + "-01"), "MMM") : "-",
    count: Number(item.count || 0),
    rawMonth: item.month,
  }))
  const monthlyCourseSummaryRaw = trainingStats.monthly_course_summary || []
  const monthlyCourseCourses = trainingStats.monthly_course_summary_courses || []
  const monthlyCourseFull = trainingStats.monthly_course_summary_full || []
  const monthlyCourseSummary = monthlyCourseSummaryRaw.map((item) => ({
    month: item.month ? format(new Date(item.month + "-01"), "MMM") : "-",
    rawMonth: item.month,
    total: Number(item.total || 0),
    ...Object.fromEntries(monthlyCourseCourses.map((short) => [short, Number(item[short] || 0)])),
  }))
  const courseStackColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"]

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

      {/* Training Revenue Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Training Revenue</h2>
          <Badge variant="outline" className="ml-2">{trainingStats.total_count || 0} records</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" /> Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(trainingStats.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">Sum of training fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Banknote className="h-4 w-4 text-blue-600" /> Collected (Downpayment)</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(trainingStats.total_collected || 0)}</div>
              <p className="text-xs text-muted-foreground">{trainingStats.total_count ? `${((trainingStats.total_collected / (trainingStats.total_revenue || 1)) * 100).toFixed(0)}% of revenue` : "No data"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><DollarSign className="h-4 w-4 text-amber-600" /> Outstanding Balance</CardTitle>
              <Activity className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(trainingStats.total_outstanding || 0)}</div>
              <p className="text-xs text-muted-foreground">Full: {trainingByRemarks.find(r => r.remarks === 'Full Payment')?.count || 0} • Partial: {trainingByRemarks.find(r => r.remarks === 'Partial Payment')?.count || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><GraduationCap className="h-4 w-4 text-purple-600" /> Avg Fee / Trainings</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(trainingStats.avg_fee || 0)}</div>
              <p className="text-xs text-muted-foreground">{trainingByCourse.length} courses • {trainingStats.total_count || 0} trainees</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Training revenue charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Monthly Training Revenue</CardTitle>
            <p className="text-xs text-muted-foreground">Revenue vs Collected vs Outstanding (last 12 months)</p>
          </CardHeader>
          <CardContent>
            {trainingMonthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trainingMonthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${symbol}${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value, name) => [`${symbol}${Number(value).toLocaleString()}`, name === 'revenue' ? 'Revenue' : name === 'collected' ? 'Collected' : 'Outstanding']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" name="revenue" radius={[4,4,0,0]} />
                  <Bar dataKey="collected" fill="#3b82f6" name="collected" radius={[4,4,0,0]} />
                  <Bar dataKey="outstanding" fill="#f59e0b" name="outstanding" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No training revenue yet — add records in Training Monitoring</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Revenue by Training Course (Top 10)</CardTitle>
            <p className="text-xs text-muted-foreground">Sorted by revenue</p>
          </CardHeader>
          <CardContent>
            {trainingByCourse.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trainingByCourse.map(c => ({ name: c.training_course.length > 18 ? c.training_course.slice(0,18)+'…' : c.training_course, revenue: Number(c.revenue), course: c.training_course }))} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `${symbol}${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={110} className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value, name, props) => [`${symbol}${Number(value).toLocaleString()}`, props.payload.course]}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No per-course data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Course Summary - Enrollments per Course per Month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Monthly Course Summary — Enrollments</CardTitle>
          <p className="text-xs text-muted-foreground">Enrollments per course per month (last 6 months, top 5 courses) • Total enrollments line</p>
        </CardHeader>
        <CardContent>
          {monthlyCourseSummary.length > 0 && monthlyCourseCourses.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={monthlyCourseSummary}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value, name) => {
                    const idx = monthlyCourseCourses.indexOf(name)
                    const full = idx >= 0 ? monthlyCourseFull[idx] : name
                    return [value, full || name]
                  }}
                />
                {monthlyCourseCourses.map((short, idx) => (
                  <Bar key={short} dataKey={short} stackId="a" fill={courseStackColors[idx % courseStackColors.length]} radius={idx === monthlyCourseCourses.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : monthlyEnrollments.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyEnrollments}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="count" fill="#10b981" name="Enrollments" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No enrollment data yet — add records in Training Monitoring</div>
          )}
          {monthlyCourseCourses.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {monthlyCourseCourses.map((short, idx) => (
                <Badge key={short} variant="outline" className="text-xs flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: courseStackColors[idx % courseStackColors.length] }} />
                  {monthlyCourseFull[idx] || short}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly total enrollments simple bar (if course summary empty, already handled) */}
      {monthlyEnrollments.length > 0 && monthlyCourseCourses.length === 0 && null}

      {/* Training by system/category table */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by System</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingBySystem.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No data</div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>System</TableHead><TableHead className="text-center">Count</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {trainingBySystem.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant={s.system==='Manila'?'default':s.system==='Naga'?'secondary':'outline'}>{s.system || 'Unknown'}</Badge></TableCell>
                      <TableCell className="text-center">{s.count}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(s.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No data</div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-center">Count</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {trainingByCategory.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                      <TableCell className="text-center">{c.count}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(c.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Training Courses — Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {trainingByCourse.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No training courses yet</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Course</TableHead><TableHead className="text-center">Trainees</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Collected</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Avg Fee</TableHead></TableRow></TableHeader>
              <TableBody>
                {trainingByCourse.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.training_course}</TableCell>
                    <TableCell className="text-center">{c.count}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(c.revenue)}</TableCell>
                    <TableCell className="text-right font-mono text-blue-600">{formatCurrency(c.collected)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{formatCurrency(c.outstanding)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(c.avg_fee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inventory Monitoring - Supply Chain Management Department */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Boxes className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Inventory — Supply Chain Management</h2>
          <Badge variant="outline" className="ml-2">{inventoryStats.total_items || 0} items</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Package className="h-4 w-4" /> Total Items</CardTitle>
              <Boxes className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryStats.total_items || 0}</div>
              <p className="text-xs text-muted-foreground">{inventoryStats.total_quantity || 0} units • {formatCurrency(inventoryStats.total_value || 0)} value</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{inventoryStats.low_stock ?? 0}</div>
              <p className="text-xs text-muted-foreground">Reorder point reached</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-600" /> Out of Stock</CardTitle>
              <Package className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{inventoryStats.out_of_stock ?? 0}</div>
              <p className="text-xs text-muted-foreground">Needs restock</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4 text-emerald-600" /> Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(inventoryStats.total_value || 0)}</div>
              <p className="text-xs text-muted-foreground">{inventoryStats.total_quantity || 0} units in stock</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4" /> Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No data</div>
            ) : (
              <div className="space-y-2">
                {inventoryByCategory.map((c, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{c.category}</div>
                      <div className="text-xs text-muted-foreground">{c.count} items • {Number(c.total_qty).toLocaleString()} units</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold">{formatCurrency(c.total_value)}</div>
                      <Badge variant="outline" className="text-xs">{c.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Stock by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryByStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No data</div>
            ) : (
              <div className="space-y-2">
                {inventoryByStatus.map((s, i) => {
                  const variant = s.status === 'in_stock' ? 'success' : s.status === 'low_stock' ? 'warning' : s.status === 'out_of_stock' ? 'destructive' : 'secondary'
                  return (
                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <Badge variant={variant} className="capitalize">{s.status.replace('_',' ')}</Badge>
                      <div className="text-right">
                        <div className="text-sm font-bold">{s.count}</div>
                        <div className="text-xs text-muted-foreground">{Number(s.total_qty).toLocaleString()} units</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
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
