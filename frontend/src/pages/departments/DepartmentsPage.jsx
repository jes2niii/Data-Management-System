import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2, Plus, Search } from "lucide-react"

const emptyForm = { name: "", code: "", description: "", head_id: "", is_active: true }

export default function DepartmentsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canCreate = hasPermission(user, "departments.create")
  const canUpdate = hasPermission(user, "departments.update")
  const canDelete = hasPermission(user, "departments.delete")
  const canReadUsers = hasPermission(user, "users.read")

  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: departments, isLoading, isError, refetch } = useQuery({
    queryKey: ["departments", search, activeFilter],
    queryFn: () => api.get("/departments", {
      params: {
        search: search || undefined,
        is_active: activeFilter === "all" ? undefined : activeFilter === "active" ? 1 : 0,
      },
    }).then((r) => r.data.data),
  })

  const { data: users } = useQuery({
    queryKey: ["department-heads"],
    queryFn: () => api.get("/users", { params: { per_page: 100 } }).then((r) => r.data.data?.data || []),
    enabled: canReadUsers,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["departments"] })

  const saveMutation = useMutation({
    mutationFn: (payload) => editing
      ? api.put(`/departments/${editing.id}`, payload)
      : api.post("/departments", payload),
    onSuccess: () => {
      toast.success(editing ? "Department updated" : "Department created")
      refresh()
      setDialogOpen(false)
      setEditing(null)
      setForm(emptyForm)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to save department"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success("Department deleted")
      refresh()
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete department"),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (department) => {
    setEditing(department)
    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
      head_id: department.head_id ? String(department.head_id) : "",
      is_active: department.is_active !== false,
    })
    setDialogOpen(true)
  }

  const submit = () => {
    saveMutation.mutate({
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description || null,
      head_id: form.head_id ? Number(form.head_id) : null,
      is_active: form.is_active,
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Department Management</CardTitle>
            <CardDescription>Maintain departments, their codes, and department heads.</CardDescription>
          </div>
          {canCreate && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Department</Button>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search departments"
              />
            </div>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-40" aria-label="Status filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <p role="alert">Could not load departments. <Button variant="outline" onClick={() => refetch()}>Retry</Button></p>
          ) : (departments || []).length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No departments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    {(canUpdate || canDelete) && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-mono text-xs">{department.code || "-"}</TableCell>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>{department.head?.name || "-"}</TableCell>
                      <TableCell>{department.employees_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={department.is_active ? "success" : "secondary"}>
                          {department.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canUpdate && (
                              <Button variant="ghost" size="icon" onClick={() => openEdit(department)} aria-label={`Edit ${department.name}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(department)} aria-label={`Delete ${department.name}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>Code must be unique. Reassign users and employees before deleting a department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="departmentName">Name</Label>
              <Input id="departmentName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentCode">Code</Label>
              <Input id="departmentCode" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentDescription">Description</Label>
              <Input id="departmentDescription" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentHead">Department Head</Label>
              {canReadUsers ? (
                <Select
                  value={form.head_id || "none"}
                  onValueChange={(value) => setForm({ ...form, head_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="departmentHead"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No head assigned</SelectItem>
                    {(users || []).map((candidate) => (
                      <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="departmentHead"
                  type="number"
                  min="1"
                  placeholder="User ID"
                  value={form.head_id}
                  onChange={(e) => setForm({ ...form, head_id: e.target.value })}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="departmentActive" checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label htmlFor="departmentActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || !form.code.trim() || saveMutation.isPending} onClick={submit}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete department?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name} will be removed. Reassign users and employees first — soft-deleted records also count, because deleting a department permanently removes its members.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
