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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import BillFormDialog from "./BillFormDialog"
import {
  Search, Plus, MoreHorizontal, Pencil, Trash2, CheckCircle2, ChevronLeft,
  ChevronRight, BarChart3, DollarSign, Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"

const statusMap = {
  paid: { variant: "success", label: "Paid" },
  unpaid: { variant: "warning", label: "Unpaid" },
  overdue: { variant: "destructive", label: "Overdue" },
  canceled: { variant: "secondary", label: "Canceled" },
  pending: { variant: "outline", label: "Pending" },
}

export default function BillsPage() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingBill, setDeletingBill] = useState(null)

  const perPage = 10

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bills", search, statusFilter, categoryFilter, page],
    queryFn: () =>
      api.get("/bills", {
        params: {
          search,
          status: statusFilter !== "all" ? statusFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          page,
          per_page: perPage,
        },
      }).then((r) => r.data),
  })

  const markAsPaidMutation = useMutation({
    mutationFn: (id) => api.post(`/bills/${id}/mark-paid`),
    onSuccess: () => {
      toast.success("Bill marked as paid")
      queryClient.invalidateQueries({ queryKey: ["bills"] })
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/bills/${id}`),
    onSuccess: () => {
      toast.success("Bill deleted")
      queryClient.invalidateQueries({ queryKey: ["bills"] })
      setDeleteDialogOpen(false)
      setDeletingBill(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed"),
  })

  const bills = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground">Track and manage billing records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/billing/analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
            </Link>
          </Button>
          <Button onClick={() => { setEditingBill(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Bill
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Bills", value: bills.length, icon: Receipt, color: "text-blue-600" },
          { label: "Pending", value: bills.filter((b) => b.status === "unpaid" || b.status === "pending").length, icon: DollarSign, color: "text-yellow-600" },
          { label: "Overdue", value: bills.filter((b) => b.status === "overdue").length, icon: DollarSign, color: "text-red-600" },
          { label: "Paid", value: bills.filter((b) => b.status === "paid").length, icon: CheckCircle2, color: "text-green-600" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bills..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Electricity">Electricity</SelectItem>
                <SelectItem value="Water">Water</SelectItem>
                <SelectItem value="Internet">Internet</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Hardware">Hardware</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">Failed to load bills.</div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No bills found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => {
                    const st = statusMap[bill.status] || statusMap.pending
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{bill.category?.name}</Badge>
                        </TableCell>
                        <TableCell>{bill.provider}</TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(bill.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {bill.due_date
                            ? format(new Date(bill.due_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => { setEditingBill(bill); setFormOpen(true) }}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {(bill.status === "unpaid" || bill.status === "pending" || bill.status === "overdue") && (
                                <DropdownMenuItem onClick={() => markAsPaidMutation.mutate(bill.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { setDeletingBill(bill); setDeleteDialogOpen(true) }}
                              >
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
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

      <BillFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingBill(null) }}
        bill={editingBill}
        onSuccess={() => { setEditingBill(null) }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingBill?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingBill?.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
