import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api, { downloadAttachment } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission } from "@/lib/access"
import { printIncidentReport } from "@/lib/incident-report-print"
import { useBranding } from "@/hooks/useBranding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { chartTooltipContentStyle, chartTooltipLabelStyle, chartTooltipItemStyle, chartBarCursor } from "@/lib/chart-theme"
import { formatIncidentDate } from "@/lib/incident-report-format"
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Printer, Download } from "lucide-react"
import IncidentReportForm from "./IncidentReportForm"
import IncidentReportView from "./IncidentReportView"

const INCIDENT_TYPES = ["Lost", "Damaged", "Stolen"]
const typeVariants = { Lost: "destructive", Damaged: "warning", Stolen: "secondary" }
const typeVariantsColors = { Lost: "#dc2626", Damaged: "#f59e0b", Stolen: "#6b7280" }

const sortColumns = [
  ["ir_number", "IR #"], ["filer_name", "Filer's Name"], ["date_reported", "Date Reported"],
  ["item", "Item"], ["property_code", "Property Code"], ["date_of_incident", "Date of Incident"],
  ["place_of_incident", "Place of Incident"], ["detailed_narration", "Detailed Narration"],
  ["remarks", "Remarks"], ["jo_number", "JO #"], ["incident_type", "Type"],
]

export default function IncidentReportsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const { user } = useAuth()
  const { companyName } = useBranding()

  const canCreate = hasPermission(user, "incident_reports.create")
  const canUpdate = hasPermission(user, "incident_reports.update")
  const canDelete = hasPermission(user, "incident_reports.delete")
  const canExport = hasPermission(user, "incident_reports.export")

  const [tab, setTab] = useState("dashboard")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateReportedFrom, setDateReportedFrom] = useState("")
  const [dateReportedTo, setDateReportedTo] = useState("")
  const [dateIncidentFrom, setDateIncidentFrom] = useState("")
  const [dateIncidentTo, setDateIncidentTo] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortDir, setSortDir] = useState("desc")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filters = {
    search: search || undefined,
    incident_type: typeFilter !== "all" ? typeFilter : undefined,
    date_reported_from: dateReportedFrom || undefined,
    date_reported_to: dateReportedTo || undefined,
    date_of_incident_from: dateIncidentFrom || undefined,
    date_of_incident_to: dateIncidentTo || undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    per_page: 15,
  }

  const { data, isLoading } = useQuery({
    queryKey: ["incident-reports", filters],
    queryFn: () => api.get("/incident-reports", { params: filters }).then((r) => r.data),
  })
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["incident-reports-stats"],
    queryFn: () => api.get("/incident-reports/stats").then((r) => r.data.data),
  })
  const { data: detailData } = useQuery({
    queryKey: ["incident-report", viewId || editingReport?.id],
    enabled: Boolean(viewId || editingReport?.id),
    queryFn: () => api.get(`/incident-reports/${viewId || editingReport.id}`).then((r) => r.data.data),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["incident-reports"] })
    queryClient.invalidateQueries({ queryKey: ["incident-reports-stats"] })
    queryClient.invalidateQueries({ queryKey: ["incident-report"] })
  }

  const saveMutation = useMutation({
    mutationFn: (values) => editingReport
      ? api.put(`/incident-reports/${editingReport.id}`, values)
      : api.post("/incident-reports", values),
    onSuccess: () => {
      toast.success(editingReport ? "Incident report updated" : "Incident report created")
      refresh()
      setFormOpen(false)
      setEditingReport(null)
      if (location.pathname !== "/incident-reports") navigate("/incident-reports")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to save report"),
  })

  const deleteMutation = useMutation({
    mutationFn: (reportId) => api.delete(`/incident-reports/${reportId}`),
    onSuccess: () => { toast.success("Incident report deleted"); refresh(); setDeleteTarget(null) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete report"),
  })

  useEffect(() => {
    const path = location.pathname
    if (!path.startsWith("/incident-reports")) return
    if (path.endsWith("/create")) {
      setEditingReport(null)
      setFormOpen(true)
      setTab("list")
    } else if (path.endsWith("/edit") && id) {
      setViewId(null)
      setEditingReport({ id: Number(id) })
      setFormOpen(true)
      setTab("list")
    } else if (id) {
      setViewId(Number(id))
      setTab("list")
    }
  }, [location.pathname, id])

  const openCreate = () => { setEditingReport(null); setFormOpen(true) }
  const openEdit = (report) => { setViewId(null); setEditingReport(report); setFormOpen(true) }
  const closeDialogs = () => {
    setFormOpen(false)
    setEditingReport(null)
    setViewId(null)
    if (location.pathname !== "/incident-reports") navigate("/incident-reports")
  }

  const toggleSort = (column) => {
    if (sortBy === column) setSortDir((value) => value === "asc" ? "desc" : "asc")
    else { setSortBy(column); setSortDir("asc") }
  }

  const reports = data?.data?.data || []
  const total = data?.data?.total || 0
  const totalPages = data?.data?.last_page || 1
  const stats = statsData || {}
  const byType = stats.by_type || []
  const monthly = stats.monthly || []
  const yearly = stats.yearly || []
  const viewReport = detailData && viewId ? detailData : null
  const editingDetail = detailData && editingReport?.id ? detailData : null

  const statCards = [
    { label: "Total Reports", value: stats.total || 0, color: "text-primary" },
    { label: "Lost", value: stats.lost || 0, color: "text-red-600" },
    { label: "Damaged", value: stats.damaged || 0, color: "text-amber-600" },
    { label: "Stolen", value: stats.stolen || 0, color: "text-gray-600" },
    { label: "This Month", value: stats.this_month || 0, color: "text-blue-600" },
    { label: "This Year", value: stats.this_year || 0, color: "text-emerald-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incident Reports</h1>
          <p className="text-muted-foreground">Lost, damaged and stolen company property incidents</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport && <Button variant="outline" onClick={() => downloadAttachment("/incident-reports/export/csv", "incident-reports.csv", filters)}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>}
          {canCreate && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Report</Button>}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="list">Reports ({total})</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 pt-4">
          {statsLoading ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {statCards.map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{card.label}</CardTitle></CardHeader>
                  <CardContent><div className={`text-2xl font-bold ${card.color}`}>{card.value}</div></CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Incidents by Type</CardTitle></CardHeader>
              <CardContent>
                {byType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                        {byType.map((entry) => <Cell key={entry.type} fill={typeVariantsColors[entry.type] || "#130a5c"} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipContentStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted-foreground">No incidents recorded yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Incident Reports</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip contentStyle={chartTooltipContentStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={chartBarCursor} />
                    <Bar dataKey="count" fill="#130a5c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Yearly Incident Trends</CardTitle></CardHeader>
            <CardContent>
              {yearly.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={yearly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="year" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip contentStyle={chartTooltipContentStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={chartBarCursor} />
                    <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-16 text-center text-sm text-muted-foreground">No yearly data yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search IR #, filer, item, property code" value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
                </div>
                <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1) }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {INCIDENT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" className="w-40" value={dateReportedFrom} onChange={(e) => { setDateReportedFrom(e.target.value); setPage(1) }} aria-label="Date reported from" />
                <Input type="date" className="w-40" value={dateReportedTo} onChange={(e) => { setDateReportedTo(e.target.value); setPage(1) }} aria-label="Date reported to" />
                <Input type="date" className="w-40" value={dateIncidentFrom} onChange={(e) => { setDateIncidentFrom(e.target.value); setPage(1) }} aria-label="Date of incident from" />
                <Input type="date" className="w-40" value={dateIncidentTo} onChange={(e) => { setDateIncidentTo(e.target.value); setPage(1) }} aria-label="Date of incident to" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{total} record{total === 1 ? "" : "s"}</span>
                <span>Page {page} of {totalPages}</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : reports.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No incident reports found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {sortColumns.map(([key, label]) => (
                          <TableHead key={key}>
                            <button className="hover:underline" onClick={() => toggleSort(key)}>
                              {label}{sortBy === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                            </button>
                          </TableHead>
                        ))}
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-mono text-xs">{report.ir_number}</TableCell>
                          <TableCell>{report.filer_name}</TableCell>
                          <TableCell>{formatIncidentDate(report.date_reported)}</TableCell>
                          <TableCell>{report.item}</TableCell>
                          <TableCell className="text-xs">{report.property_code || "—"}</TableCell>
                          <TableCell>{formatIncidentDate(report.date_of_incident)}</TableCell>
                          <TableCell className="max-w-[180px] truncate" title={report.place_of_incident}>{report.place_of_incident}</TableCell>
                          <TableCell className="max-w-[220px] truncate" title={report.detailed_narration}>{report.detailed_narration}</TableCell>
                          <TableCell className="text-xs">{report.remarks || "—"}</TableCell>
                          <TableCell className="text-xs">{report.jo_number || "—"}</TableCell>
                          <TableCell><Badge variant={typeVariants[report.incident_type] || "outline"}>{report.incident_type}</Badge></TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setViewId(report.id)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                                {canUpdate && <DropdownMenuItem onSelect={() => openEdit(report)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => printIncidentReport(report, companyName)}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                                {canDelete && <DropdownMenuSeparator />}
                                {canDelete && <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(report)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <IncidentReportForm
        open={formOpen}
        onClose={closeDialogs}
        report={editingDetail}
        onSubmit={(values) => saveMutation.mutate(values)}
        isPending={saveMutation.isPending}
      />

      {viewReport && <IncidentReportView report={viewReport} onClose={closeDialogs} />}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete incident report?</DialogTitle>
            <DialogDescription>{deleteTarget?.ir_number} will be moved to trash. This action can be reversed by an administrator.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
