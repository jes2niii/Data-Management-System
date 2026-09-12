import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/useDebounce"
import { usePersonalization } from "@/hooks/usePersonalization"
import { toast } from "sonner"
import { format } from "date-fns"
import api from "@/lib/api"
import { useCurrency } from "@/hooks/useCurrency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import TrainingFormDialog from "./TrainingFormDialog"
import {
  Search, Plus, MoreHorizontal, Pencil, Trash2, ChevronLeft,
  ChevronRight, GraduationCap, BookOpen, Users, Award, Download, Filter, Calendar, Building2, Printer, Wallet, Banknote
} from "lucide-react"
import { cn } from "@/lib/utils"

const fmtDate = (value) => {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return String(value).slice(0, 10) || "—"
    return format(d, "MMM dd, yyyy")
  } catch {
    return String(value).slice(0, 10)
  }
}

export default function TrainingMonitoringPage() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const { itemsPerPage: defaultPerPage } = usePersonalization()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [courseFilter, setCourseFilter] = useState("all")
  const [systemFilter, setSystemFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [mannerFilter, setMannerFilter] = useState("all")
  const [remarksFilter, setRemarksFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const perPage = defaultPerPage || 10

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["training-stats", debouncedSearch, courseFilter, systemFilter, statusFilter, mannerFilter, remarksFilter],
    queryFn: () =>
      api.get("/training-monitorings/stats", {
        params: {
          search: debouncedSearch || undefined,
          training_course: courseFilter !== "all" ? courseFilter : undefined,
          system_location: systemFilter !== "all" ? systemFilter : undefined,
          print_status: statusFilter !== "all" ? statusFilter : undefined,
          manner_of_conduct: mannerFilter !== "all" ? mannerFilter : undefined,
          remarks: remarksFilter !== "all" ? remarksFilter : undefined,
        },
      }).then((r) => r.data),
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trainings", debouncedSearch, courseFilter, systemFilter, statusFilter, mannerFilter, remarksFilter, page],
    queryFn: () =>
      api.get("/training-monitorings", {
        params: {
          search: debouncedSearch || undefined,
          training_course: courseFilter !== "all" ? courseFilter : undefined,
          system_location: systemFilter !== "all" ? systemFilter : undefined,
          print_status: statusFilter !== "all" ? statusFilter : undefined,
          manner_of_conduct: mannerFilter !== "all" ? mannerFilter : undefined,
          remarks: remarksFilter !== "all" ? remarksFilter : undefined,
          page,
          per_page: perPage,
        },
      }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/training-monitorings/${id}`),
    onSuccess: () => {
      toast.success("Training record deleted")
      queryClient.invalidateQueries({ queryKey: ["trainings"] })
      queryClient.invalidateQueries({ queryKey: ["training-stats"] })
      setDeleteDialogOpen(false)
      setDeleting(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed"),
  })

  const handleExport = async (fmt) => {
    try {
      const params = new URLSearchParams()
      if (courseFilter !== "all") params.append("training_course", courseFilter)
      if (systemFilter !== "all") params.append("system_location", systemFilter)
      if (statusFilter !== "all") params.append("print_status", statusFilter)
      if (remarksFilter !== "all") params.append("remarks", remarksFilter)
      if (mannerFilter !== "all") params.append("manner_of_conduct", mannerFilter)
      const url = `/training-monitorings/export/${fmt}?${params.toString()}`
      const res = await api.get(url, { responseType: "blob" })
      const blob = new Blob([res.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `training-monitoring.${fmt}`
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      toast.success(`Exported as ${fmt.toUpperCase()}`)
    } catch (e) {
      toast.error("Export failed")
    }
  }

  const records = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1
  const totalFromApi = data?.data?.total ?? records.length

  const stats = statsData?.data || {}
  const byCourse = stats.by_course || []
  const bySystem = stats.by_system || []
  const byPrint = stats.by_print_status || []
  const byRemarks = stats.by_remarks || []
  const total = stats.total ?? totalFromApi
  const totalFee = stats.total_fee ?? 0
  const totalDown = stats.total_downpayment ?? 0
  const totalBalance = stats.total_balance ?? 0

  // collect distinct courses for filter dropdown from stats
  const courseOptions = byCourse.map((c) => c.training_course).filter(Boolean)

  const courseColor = (idx) => {
    const colors = [
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
    ]
    return colors[idx % colors.length]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Training Monitoring
          </h1>
          <p className="text-muted-foreground">Track trainees, schedules, payments and print status</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Training
          </Button>
        </div>
      </div>

      {/* Header tally cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsLoading ? <Skeleton className="h-8 w-20" /> : total}</div>
            <p className="text-xs text-muted-foreground mt-1">All training entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" /> Total Training Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {statsLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totalFee)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sum of fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-600" /> Total Downpayment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {statsLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totalDown)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Collected downpayment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" /> Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {statsLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Extra breakdown by System and Print Status and Remarks */}
          {!statsLoading && (bySystem.length > 0 || byPrint.length > 0 || byRemarks.length > 0) && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> By System</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {bySystem.length === 0 ? <span className="text-sm text-muted-foreground">No data</span> : bySystem.map((s) => (
                    <Badge key={s.system_location || "unknown"} variant="outline" className="text-sm px-3 py-1">
                      {s.system_location || "Unknown"}: <span className="ml-1 font-bold">{s.count}</span>
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Printer className="h-4 w-4" /> By Print Status</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {byPrint.length === 0 ? <span className="text-sm text-muted-foreground">No data</span> : byPrint.map((p) => (
                    <Badge key={p.print_status} variant={p.print_status === "Printed" ? "success" : "warning"} className="text-sm px-3 py-1">
                      {p.print_status}: {p.count}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" /> By Remarks</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {byRemarks.length === 0 ? <span className="text-sm text-muted-foreground">No data</span> : byRemarks.map((r) => (
                    <Badge key={r.remarks} variant={r.remarks === "Full Payment" ? "success" : "warning"} className="text-sm px-3 py-1">
                      {r.remarks}: {r.count}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[220px] space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, course, assisted by..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Training Course</p>
              <Select value={courseFilter} onValueChange={(v) => { setCourseFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courseOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">System</p>
              <Select value={systemFilter} onValueChange={(v) => { setSystemFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Systems" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  <SelectItem value="Manila">Manila</SelectItem>
                  <SelectItem value="Naga">Naga</SelectItem>
                  <SelectItem value="Legazpi">Legazpi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Print Status</p>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="To Print">To Print</SelectItem>
                  <SelectItem value="Printed">Printed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Manner</p>
              <Select value={mannerFilter} onValueChange={(v) => { setMannerFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Manner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manner</SelectItem>
                  <SelectItem value="Face to Face">Face to Face</SelectItem>
                  <SelectItem value="CBT">CBT</SelectItem>
                  <SelectItem value="CBT/Face to Face">CBT/Face to Face</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Blended">Blended</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Remarks</p>
              <Select value={remarksFilter} onValueChange={(v) => { setRemarksFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Remarks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Remarks</SelectItem>
                  <SelectItem value="Full Payment">Full Payment</SelectItem>
                  <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(search || courseFilter !== "all" || systemFilter !== "all" || statusFilter !== "all" || mannerFilter !== "all" || remarksFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCourseFilter("all"); setSystemFilter("all"); setStatusFilter("all"); setMannerFilter("all"); setRemarksFilter("all"); setPage(1) }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">Failed to load training records.</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <GraduationCap className="h-12 w-12 mx-auto opacity-20" />
              <p>No training records found.</p>
              <Button variant="outline" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Add First Record</Button>
            </div>
          ) : (
            <>
              <div className="relative w-full overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[50px]">No</TableHead>
                      <TableHead className="min-w-[110px]"><Calendar className="h-3 w-3 inline mr-1" />Date</TableHead>
                      <TableHead className="min-w-[160px]">Name</TableHead>
                      <TableHead className="min-w-[160px]">Training Course</TableHead>
                      <TableHead className="min-w-[130px]">Manner</TableHead>
                      <TableHead className="min-w-[170px]">Schedule (CBT/Face to Face)</TableHead>
                      <TableHead className="min-w-[150px]">Schedule (Practical)</TableHead>
                      <TableHead className="min-w-[110px] text-right">Fee</TableHead>
                      <TableHead className="min-w-[110px] text-right">Downpayment</TableHead>
                      <TableHead className="min-w-[110px] text-right">Balance</TableHead>
                      <TableHead className="min-w-[150px]">Remarks</TableHead>
                      <TableHead className="min-w-[100px]">System</TableHead>
                      <TableHead className="min-w-[130px]">Assisted By</TableHead>
                      <TableHead className="min-w-[120px]">Note/Status</TableHead>
                      <TableHead className="w-[80px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r, i) => {
                      const rowNo = (page - 1) * perPage + i + 1
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{rowNo}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="whitespace-nowrap">{r.training_course}</Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.manner_of_conduct || "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.training_schedule_cbt || "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.training_schedule_practical || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">{formatCurrency(r.training_fee)}</TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">{formatCurrency(r.downpayment)}</TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            <span className={Number(r.balance) > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                              {formatCurrency(r.balance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {r.remarks === "Full Payment" ? (
                              <Badge variant="success" className="whitespace-nowrap">Full Payment</Badge>
                            ) : r.remarks === "Partial Payment" ? (
                              <Badge variant="warning" className="whitespace-nowrap">Partial Payment</Badge>
                            ) : (
                              <Badge variant="outline" className="whitespace-nowrap">{r.remarks || "—"}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.system_location ? <Badge variant={r.system_location === "Manila" ? "default" : r.system_location === "Naga" ? "secondary" : "outline"}>{r.system_location}</Badge> : "—"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.assisted_by || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={r.print_status === "Printed" ? "success" : "warning"} className="whitespace-nowrap">
                              {r.print_status || "To Print"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditing(r); setFormOpen(true) }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleting(r); setDeleteDialogOpen(true) }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} • Total {total} records
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

        </div>

        {/* Right Sidebar - Total Tally Per Training Course */}
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4 max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Total Tally Per Training Course
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary">{byCourse.length} Courses</Badge>
                  <span className="text-xs">Sidebar • live tally</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                  </div>
                ) : byCourse.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    No courses yet. Add records to see tallies.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {byCourse.map((c, idx) => (
                      <Card key={c.training_course} className={cn("border", courseColor(idx))}>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                            <span className="truncate flex items-center gap-1.5 text-xs">
                              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{c.training_course}</span>
                            </span>
                            <Badge variant="outline" className="bg-white/60 dark:bg-black/20 shrink-0 text-xs">{c.count}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0 space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs opacity-70">Trainees</span>
                            <span className="text-2xl font-bold">{c.count}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded bg-white/50 dark:bg-black/20 p-2">
                              <p className="opacity-60 text-[11px]">Fees</p>
                              <p className="font-mono font-semibold text-xs truncate">{formatCurrency(c.total_fee)}</p>
                            </div>
                            <div className="rounded bg-white/50 dark:bg-black/20 p-2">
                              <p className="opacity-60 text-[11px]">Balance</p>
                              <p className="font-mono font-semibold text-xs truncate">{formatCurrency(c.total_balance)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-1 justify-center truncate">
                              {formatCurrency(c.total_fee).slice(0,12)}
                            </Badge>
                            <Badge variant={Number(c.total_balance) > 0 ? "warning" : "success"} className="text-[10px] px-1.5 py-0">
                              {c.count} {c.count === 1 ? "trainee" : "trainees"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Records</span><span className="font-bold">{total}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Fees</span><span className="font-mono font-semibold text-emerald-600">{formatCurrency(totalFee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Balance</span><span className="font-mono font-semibold text-amber-600">{formatCurrency(totalBalance)}</span></div>
                <Separator className="my-2" />
                <div className="text-xs text-muted-foreground">Updates live with filters. Use filters on left to narrow tally.</div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      <TrainingFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        record={editing}
        onSuccess={() => { setEditing(null) }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete training record for <strong>{deleting?.name}</strong> ({deleting?.training_course})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleting?.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
