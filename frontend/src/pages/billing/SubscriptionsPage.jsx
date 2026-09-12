import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import api from "@/lib/api"
import { useCurrency } from "@/hooks/useCurrency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Pause, Play, RefreshCw, Calendar, DollarSign, AlertTriangle, Clock, Repeat, CreditCard, BarChart3 } from "lucide-react"
import SubscriptionFormDialog from "./SubscriptionFormDialog"

const statusMap = {
  active: { variant: "success", label: "Active" },
  paused: { variant: "secondary", label: "Paused" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  expired: { variant: "outline", label: "Expired" },
  trial: { variant: "warning", label: "Trial" },
}

const cycleLabel = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [cycleFilter, setCycleFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const perPage = 10

  const { data: statsData } = useQuery({
    queryKey: ["subscriptions-stats"],
    queryFn: () => api.get("/subscriptions/stats").then(r => r.data),
  })
  const stats = statsData?.data || {}

  const { data, isLoading, isError } = useQuery({
    queryKey: ["subscriptions", search, statusFilter, cycleFilter, page],
    queryFn: () => api.get("/subscriptions", {
      params: {
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        billing_cycle: cycleFilter !== "all" ? cycleFilter : undefined,
        page,
        per_page: perPage,
      }
    }).then(r => r.data),
  })

  const subs = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => {
      toast.success("Subscription deleted")
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] })
      setDeleteOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed"),
  })

  const pauseMutation = useMutation({
    mutationFn: (id) => api.post(`/subscriptions/${id}/pause`),
    onSuccess: () => {
      toast.success("Subscription paused")
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: (id) => api.post(`/subscriptions/${id}/resume`),
    onSuccess: () => {
      toast.success("Subscription resumed")
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] })
    },
  })

  const renewMutation = useMutation({
    mutationFn: (id) => api.post(`/subscriptions/${id}/renew`),
    onSuccess: (res) => {
      toast.success(res.data.message || "Subscription renewed")
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] })
    },
  })

  const fmtDate = (v) => {
    if (!v) return "—"
    try { return format(new Date(v), "MMM dd, yyyy") } catch { return String(v).slice(0,10) }
  }

  const daysUntilBadge = (sub) => {
    const days = sub.days_until_next
    if (days == null) return null
    if (days < 0) return <Badge variant="destructive">{Math.abs(days)} days overdue</Badge>
    if (days <= 7) return <Badge variant="warning">{days}d left</Badge>
    if (days <= 30) return <Badge variant="outline">{days}d left</Badge>
    return <Badge variant="secondary">{days}d</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="h-7 w-7 text-primary" /> Subscriptions
          </h1>
          <p className="text-muted-foreground">Monitor recurring subscriptions • Auto-renew tracking • Upcoming renewals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/billing"><DollarSign className="mr-2 h-4 w-4" /> Bills</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/billing/analytics"><BarChart3 className="mr-2 h-4 w-4" /> Analytics</Link>
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="mr-2 h-4 w-4" /> Add Subscription</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Repeat className="h-4 w-4" /> Total Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active: {stats.active ?? 0} • Paused: {stats.paused ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-600" /> Monthly Equivalent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(stats.total_monthly_equivalent || 0)}/mo</div>
            <p className="text-xs text-muted-foreground">Recurring cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> Upcoming (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.upcoming_7 ?? 0}</div>
            <p className="text-xs text-muted-foreground">Due in 7 days • 30d: {stats.upcoming_30 ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /> Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue ?? 0}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Category / Cycle breakdown */}
      {(stats.by_category?.length > 0 || stats.by_cycle?.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(stats.by_category || []).map(c => (
                <Badge key={c.category} variant="outline" className="gap-1">{c.category} <span className="font-bold">{c.count}</span> • {formatCurrency(c.total)}</Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">By Billing Cycle</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(stats.by_cycle || []).map(c => (
                <Badge key={c.billing_cycle} variant="secondary" className="capitalize">{cycleLabel[c.billing_cycle] || c.billing_cycle} • {c.count}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search subscriptions..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cycleFilter} onValueChange={v => { setCycleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Cycles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">Failed to load subscriptions</div>
          ) : subs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No subscriptions found</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Auto Renew</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map(s => {
                      const st = statusMap[s.status] || statusMap.active
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" />{s.reference_number || "—"}</div>
                          </TableCell>
                          <TableCell>{s.provider || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{s.category?.name || "—"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono font-semibold">{formatCurrency(s.amount)}</div>
                            {s.is_variable_amount && <div className="text-xs flex items-center justify-end gap-1"><Badge variant="warning" className="text-[10px] px-1 py-0">Variable</Badge><span className="text-muted-foreground">est. {formatCurrency(s.estimated_amount || s.amount)}</span></div>}
                            {s.is_variable_amount && s.variable_notes && <div className="text-xs text-muted-foreground truncate max-w-[140px]" title={s.variable_notes}>{s.variable_notes}</div>}
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{cycleLabel[s.billing_cycle] || s.billing_cycle}{s.billing_frequency >1 ? ` ×${s.billing_frequency}`:""}</Badge></TableCell>
                          <TableCell>
                            <div className="text-sm whitespace-nowrap">{fmtDate(s.next_billing_date)}</div>
                            <div className="text-xs">{daysUntilBadge(s)}</div>
                          </TableCell>
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                          <TableCell className="text-center">{s.auto_renew ? <Badge variant="success">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditing(s); setFormOpen(true) }}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                {s.status === 'active' && <DropdownMenuItem onClick={() => pauseMutation.mutate(s.id)}><Pause className="mr-2 h-4 w-4" /> Pause</DropdownMenuItem>}
                                {s.status === 'paused' && <DropdownMenuItem onClick={() => resumeMutation.mutate(s.id)}><Play className="mr-2 h-4 w-4" /> Resume</DropdownMenuItem>}
                                <DropdownMenuItem onClick={() => renewMutation.mutate(s.id)}><RefreshCw className="mr-2 h-4 w-4" /> Renew (next cycle)</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleting(s); setDeleteOpen(true) }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><Calendar className="h-4 w-4 mr-1" /> Prev</Button>
                    <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next <Calendar className="h-4 w-4 ml-1" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <SubscriptionFormDialog open={formOpen} onClose={()=>{setFormOpen(false); setEditing(null)}} subscription={editing} onSuccess={()=>setEditing(null)} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={()=>deleteMutation.mutate(deleting?.id)}>{deleteMutation.isPending?"Deleting...":"Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
