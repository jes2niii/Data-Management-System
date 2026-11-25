import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, Package, AlertTriangle, TrendingUp, Boxes, Warehouse, Factory, History, CalendarDays, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import InventoryFormDialog from "./InventoryFormDialog"
import SupplyChainTabs from "./SupplyChainTabs"

const statusMap = {
  in_stock: { variant: "success", label: "In Stock" },
  low_stock: { variant: "warning", label: "Low Stock" },
  out_of_stock: { variant: "destructive", label: "Out of Stock" },
  overstock: { variant: "secondary", label: "Overstock" },
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState(null)
  const [adjustType, setAdjustType] = useState("in")
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustRef, setAdjustRef] = useState("")
  const [adjustNotes, setAdjustNotes] = useState("")
  const [adjustPurchaseDate, setAdjustPurchaseDate] = useState("")
  const [adjustUnitCost, setAdjustUnitCost] = useState("")
  const [batchesOpen, setBatchesOpen] = useState(false)
  const [batchesItem, setBatchesItem] = useState(null)

  const perPage = 10

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["inventory-stats"],
    queryFn: () => api.get("/inventory/stats").then(r => r.data),
  })
  const stats = statsData?.data || {}
  const byCategory = stats.by_category || []
  const byStatus = stats.by_status || []
  const byLocation = stats.by_location || []
  const recentTransactions = stats.recent_transactions || []

  const { data: categoriesData } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => api.get("/inventory-categories").then(r => r.data),
  })
  const categories = categoriesData?.data || []

  const { data: suppliersData } = useQuery({
    queryKey: ["inventory-suppliers"],
    queryFn: () => api.get("/inventory-suppliers").then(r => r.data),
  })
  const suppliers = suppliersData?.data || []

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory", search, categoryFilter, statusFilter, supplierFilter, page],
    queryFn: () => api.get("/inventory", {
      params: {
        search: search || undefined,
        category_id: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        supplier_id: supplierFilter !== "all" ? supplierFilter : undefined,
        page,
        per_page: perPage,
      }
    }).then(r => r.data),
  })

  const items = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1
  const total = stats.total_items ?? items.length

  // Supply Inventory also available as merged view - for header, we keep general inventory as primary
  // But per user request, first inventory (general) is now considered merged with Supply Inventory
  // So we show a unified header that counts both
  const { data: supplyStats } = useQuery({
    queryKey: ["supply-inventories-stats"],
    queryFn: () => api.get("/supply-inventories", { params: { per_page: 1 } }).then(r => r.data),
  })
  const supplyTotal = supplyStats?.data?.total ?? 0

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      toast.success("Item deleted")
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] })
      setDeleteOpen(false)
    },
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, type, quantity, reference_number, notes, purchase_date, unit_cost }) => api.post(`/inventory/${id}/adjust`, { type, quantity, reference_number, notes, purchase_date, unit_cost }),
    onSuccess: () => {
      toast.success("Stock adjusted")
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-batches"] })
      setAdjustOpen(false)
      setAdjustQty("")
      setAdjustRef("")
      setAdjustNotes("")
      setAdjustPurchaseDate("")
      setAdjustUnitCost("")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Adjust failed"),
  })

  const handleAdjust = () => {
    if (!adjustQty || parseFloat(adjustQty) <= 0) { toast.error("Enter valid quantity"); return }
    adjustMutation.mutate({
      id: adjustItem.id,
      type: adjustType,
      quantity: adjustQty,
      reference_number: adjustRef || undefined,
      notes: adjustNotes || undefined,
      purchase_date: adjustPurchaseDate || undefined,
      unit_cost: adjustUnitCost ? parseFloat(adjustUnitCost) : undefined,
    })
  }

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ["inventory-batches", batchesItem?.id],
    queryFn: () => api.get(`/inventory/${batchesItem.id}/batches`).then(r => r.data),
    enabled: !!batchesItem?.id && batchesOpen,
  })
  const batches = batchesData?.data?.batches?.data || batchesData?.data?.batches || []
  const batchesSummary = batchesData?.data?.summary || {}

  const categoryColor = (idx) => {
    const colors = [
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300",
    ]
    return colors[idx % colors.length]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="h-8 w-8 text-primary" /> Inventory Monitoring
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Factory className="h-3 w-3" /> Supply Chain Management Department</Badge>
            <span className="text-xs">Main: <strong>Supply Inventory</strong> (merged with general) • All 5 types have Stock In/Out below</span>
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
      </div>

      {/* Header tally cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" /> Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsLoading ? <Skeleton className="h-8 w-20" /> : stats.total_items ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats.total_quantity ?? 0} total units • {formatCurrency(stats.total_value || 0)} value</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.low_stock ?? 0}</div>
            <p className="text-xs text-muted-foreground">Reorder point reached</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /> Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock ?? 0}</div>
            <p className="text-xs text-muted-foreground">Needs immediate restock</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{statsLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(stats.total_value || 0)}</div>
            <p className="text-xs text-muted-foreground">In stock value</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Status breakdown + Stock Movement Summary */}
          {!statsLoading && (byStatus.length > 0) && (
            <div className="grid gap-4 md:grid-cols-4">
              {byStatus.map(s => {
                const st = statusMap[s.status] || statusMap.in_stock
                return (
                  <Card key={s.status}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Badge variant={st.variant}>{st.label}</Badge></CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{s.count}</div>
                      <p className="text-xs text-muted-foreground">{s.total_qty} units • {formatCurrency(s.total_value)}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Stock Movement Overview - Monitor Everything */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Stock Movement — Monitor Everything (In / Out / Adjustments)</CardTitle>
              <CardDescription>Real-time tracking of all stock movements • Stock Out is fully monitored with FIFO, reason & reference</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><ArrowUpRight className="h-4 w-4" /> Stock In</div>
                  <div className="text-2xl font-bold text-emerald-700">{recentTransactions.filter(t => t.type === 'in').length} <span className="text-xs font-normal text-muted-foreground">recent</span></div>
                  <p className="text-xs text-muted-foreground">Purchases, restocks, batches with price per date</p>
                </div>
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"><ArrowDownRight className="h-4 w-4" /> Stock Out</div>
                  <div className="text-2xl font-bold text-amber-700">{recentTransactions.filter(t => t.type === 'out').length} <span className="text-xs font-normal text-muted-foreground">recent</span></div>
                  <p className="text-xs text-muted-foreground">Issues, consumption, sales • FIFO from batches</p>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300"><History className="h-4 w-4" /> Adjustments</div>
                  <div className="text-2xl font-bold text-blue-700">{recentTransactions.filter(t => t.type === 'adjustment').length} <span className="text-xs font-normal text-muted-foreground">recent</span></div>
                  <p className="text-xs text-muted-foreground">Corrections, stock takes, transfers</p>
                </div>
              </div>
              {recentTransactions.length > 0 && (
                <div className="mt-4 rounded-md border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium flex items-center gap-2"><Eye className="h-3 w-3" /> Recent Stock Movements — Monitor Everything</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.slice(0,5).map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs whitespace-nowrap">{tx.created_at ? format(new Date(tx.created_at), "MMM dd, HH:mm") : "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{tx.item?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'in' ? 'success' : tx.type === 'out' ? 'warning' : 'secondary'} className="capitalize gap-1">
                              {tx.type === 'in' ? <ArrowUpRight className="h-3 w-3" /> : tx.type === 'out' ? <ArrowDownRight className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{Number(tx.quantity).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{Number(tx.balance_after).toLocaleString()}</TableCell>
                          <TableCell className="text-xs truncate max-w-[120px]">{tx.reference_number || tx.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search item no., name..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                </div>
                <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={supplierFilter} onValueChange={v => { setSupplierFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(search || categoryFilter !== "all" || statusFilter !== "all" || supplierFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setSupplierFilter("all"); setPage(1) }}>Clear</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : isError ? (
                <div className="text-center py-12 text-destructive">Failed to load inventory.</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto opacity-20" />
                  <p>No inventory items found.</p>
                  <Button variant="outline" className="mt-3" onClick={()=>{setEditing(null);setFormOpen(true)}}><Plus className="mr-2 h-4 w-4" /> Add First Item</Button>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Item No.</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(item => {
                          const st = statusMap[item.status] || statusMap.in_stock
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-xs">{item.sku || "—"}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{item.description || ""}</div>
                              </TableCell>
                              <TableCell><Badge variant="outline">{item.category?.name || "—"}</Badge></TableCell>
                              <TableCell className="text-sm">{item.supplier?.name || "—"}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{Number(item.quantity).toLocaleString()} {item.unit}</TableCell>
                              <TableCell className="text-sm">{item.unit}</TableCell>
                              <TableCell className="text-sm"><Badge variant="secondary" className="gap-1"><Warehouse className="h-3 w-3" />{item.location || "—"}</Badge></TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(item.unit_cost)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.total_value)}</TableCell>
                              <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={()=>{setEditing(item); setFormOpen(true)}}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={()=>{setBatchesItem(item); setBatchesOpen(true)}}><History className="mr-2 h-4 w-4" /> View Batches ({item.batches_count ?? "?"}) • Price per date</DropdownMenuItem>
                                    <DropdownMenuItem onClick={()=>{setAdjustItem(item); setAdjustType("in"); setAdjustPurchaseDate(new Date().toISOString().slice(0,10)); setAdjustUnitCost(String(item.unit_cost)); setAdjustOpen(true)}}><TrendingUp className="mr-2 h-4 w-4" /> Stock In</DropdownMenuItem>
                                    <DropdownMenuItem onClick={()=>{setAdjustItem(item); setAdjustType("out"); setAdjustOpen(true)}}><TrendingUp className="mr-2 h-4 w-4 rotate-180" /> Stock Out</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={()=>{setDeleting(item); setDeleteOpen(true)}}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                      <p className="text-sm text-muted-foreground">Page {page} of {totalPages} • Total {total} items</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="h-4 w-4 mr-1" /> Prev</Button>
                        <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Category Tally */}
        <aside className="w-full lg:w-[360px] shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4 max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Factory className="h-5 w-5 text-primary" /> Stock by Category</CardTitle>
                <CardDescription className="flex items-center gap-2"><Badge variant="secondary">{byCategory.length} Categories</Badge><span className="text-xs">Supply Chain</span></CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : byCategory.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No categories</div>
                ) : (
                  <div className="space-y-3">
                    {byCategory.map((c, idx) => (
                      <Card key={c.category} className={cn("border", categoryColor(idx))}>
                        <CardHeader className="pb-2 pt-3 px-3">
                          <CardTitle className="text-xs font-semibold flex items-center justify-between gap-2">
                            <span className="truncate flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5" />{c.category}</span>
                            <Badge variant="outline" className="bg-white/60 text-xs">{c.count}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 pt-0 space-y-1">
                          <div className="flex justify-between text-xs"><span className="opacity-70">Units</span><span className="font-bold">{Number(c.total_qty).toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs"><span className="opacity-70">Value</span><span className="font-mono font-semibold">{formatCurrency(c.total_value)}</span></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">By Location</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byLocation.length === 0 ? <span className="text-sm text-muted-foreground">No data</span> : byLocation.slice(0,6).map(l=>(
                  <div key={l.location} className="flex justify-between text-sm border-b pb-1 last:border-0">
                    <span className="flex items-center gap-1"><Warehouse className="h-3 w-3" />{l.location}</span>
                    <span className="font-mono text-xs">{l.count} items • {Number(l.total_qty).toLocaleString()} units</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {stats.low_stock_items && stats.low_stock_items.length >0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> Low Stock Alert</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats.low_stock_items.map(item=>(
                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-amber-200/50 pb-2 last:border-0">
                      <div>
                        <div className="font-medium text-xs">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku} • {item.location}</div>
                      </div>
                      <Badge variant={item.status==='out_of_stock'?"destructive":"warning"}>{item.quantity} {item.unit}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">In Stock</span><Badge variant="success">{stats.in_stock ?? 0}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Overstock</span><Badge variant="secondary">{stats.overstock ?? 0}</Badge></div>
                <Separator />
                <div className="text-xs text-muted-foreground">Supply Chain Management Department • {total} items tracked</div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      <SupplyChainTabs />

      <InventoryFormDialog open={formOpen} onClose={()=>{setFormOpen(false); setEditing(null)}} item={editing} onSuccess={()=>setEditing(null)} categories={categories} suppliers={suppliers} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Item</DialogTitle><DialogDescription>Delete <strong>{deleting?.name}</strong> (Item No.: {deleting?.sku})? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={()=>deleteMutation.mutate(deleting?.id)}>{deleteMutation.isPending?"Deleting...":"Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {adjustItem?.name}</DialogTitle>
            <DialogDescription>Current: {adjustItem?.quantity} {adjustItem?.unit} • Status: {adjustItem?.status} • Same item, different price per purchase date</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={adjustType} onValueChange={setAdjustType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In (+)</SelectItem>
                    <SelectItem value="out">Stock Out (-)</SelectItem>
                    <SelectItem value="adjustment">Adjustment (set)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input type="number" step="0.01" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} placeholder={adjustType==='adjustment' ? "New total qty" : "Qty to add/remove"} />
              </div>
            </div>
            {adjustType === 'in' && (
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Purchase Date</label>
                  <Input type="date" value={adjustPurchaseDate} onChange={e=>setAdjustPurchaseDate(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Price varies by date — same item, different purchase price</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><DollarSign className="h-3 w-3" /> Unit Cost for this batch</label>
                  <Input type="number" step="0.01" value={adjustUnitCost} onChange={e=>setAdjustUnitCost(e.target.value)} placeholder={adjustItem?.unit_cost} />
                  <p className="text-xs text-muted-foreground">Current avg: {formatCurrency(adjustItem?.unit_cost)}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference #</label>
              <Input value={adjustRef} onChange={e=>setAdjustRef(e.target.value)} placeholder="PO-123, REF-001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={adjustNotes} onChange={e=>setAdjustNotes(e.target.value)} placeholder="Reason for adjustment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjustMutation.isPending || !adjustQty}>{adjustMutation.isPending ? "Saving..." : "Confirm Adjust"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchesOpen} onOpenChange={setBatchesOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Purchase History — {batchesItem?.name}</DialogTitle>
            <DialogDescription>Same item, different price per purchase date • FIFO deduction • Batches: {batchesSummary.total_batches ?? batches.length} • Total remaining: {batchesSummary.total_quantity ?? "—"} units • Value: {formatCurrency(batchesSummary.total_value || 0)} • Avg: {formatCurrency(batchesSummary.average_cost || 0)}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {batchesLoading ? (
              <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No batches — add Stock In with purchase date & price</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead className="text-right">Qty / Remaining</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map(b=>(
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap"><Badge variant="outline" className="gap-1"><CalendarDays className="h-3 w-3" />{b.purchase_date ? format(new Date(b.purchase_date), "MMM dd, yyyy") : "—"}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{b.batch_number || "—"}</TableCell>
                      <TableCell className="text-right font-mono"><span className={Number(b.remaining_quantity) < Number(b.quantity) ? "text-amber-600" : ""}>{Number(b.remaining_quantity).toLocaleString()} / {Number(b.quantity).toLocaleString()}</span></TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(b.unit_cost)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.total_cost)}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]" title={b.notes}>{b.reference_number || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setBatchesOpen(false)}>Close</Button>
            <Button onClick={()=>{setBatchesOpen(false); setAdjustItem(batchesItem); setAdjustType("in"); setAdjustPurchaseDate(new Date().toISOString().slice(0,10)); setAdjustUnitCost(""); setAdjustOpen(true)}}><Plus className="mr-2 h-4 w-4" /> Add Purchase Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
