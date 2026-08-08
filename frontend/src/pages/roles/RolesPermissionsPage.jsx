import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pencil, Trash2, Plus, Save, Shield,
} from "lucide-react"

function ManageRolesTab() {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleName, setRoleName] = useState("")
  const [roleDescription, setRoleDescription] = useState("")

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["roles-list"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/roles", data),
    onSuccess: () => {
      toast.success("Role created")
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
      setCreateDialogOpen(false)
      setRoleName("")
      setRoleDescription("")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/roles/${id}`, data),
    onSuccess: () => {
      toast.success("Role updated")
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
      setEditDialogOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success("Role deleted")
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
      setDeleteDialogOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete"),
  })

  const roles = rolesData?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setRoleName(""); setRoleDescription(""); setCreateDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No roles defined.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-muted-foreground">{role.description || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{role.created_at || "-"}</TableCell>
                <TableCell className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedRole(role)
                      setRoleName(role.name)
                      setRoleDescription(role.description || "")
                      setEditDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setSelectedRole(role); setDeleteDialogOpen(true) }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>Define a new role for the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!roleName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: roleName, description: roleDescription })}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!roleName.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: selectedRole?.id, data: { name: roleName, description: roleDescription } })}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedRole?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(selectedRole?.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ManagePermissionsTab() {
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [permissions, setPermissions] = useState({})

  const { data: rolesData } = useQuery({
    queryKey: ["roles-for-perms"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  })

  const { data: modulesData, isLoading: modsLoading } = useQuery({
    queryKey: ["permission-modules"],
        queryFn: () => api.get("/permissions").then((r) => r.data),
  })

  const { data: rolePermissions, refetch } = useQuery({
    queryKey: ["role-permissions", selectedRoleId],
    enabled: !!selectedRoleId,
    queryFn: () => api.get(`/roles/${selectedRoleId}/permissions`).then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => api.post(`/roles/${selectedRoleId}/permissions`, data),
    onSuccess: () => {
      toast.success("Permissions saved")
      refetch()
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to save"),
  })

  const roles = rolesData?.data || []
  const groupedPerms = modulesData?.data || {}
  const modules = Object.keys(groupedPerms)

  const currentPerms = rolePermissions?.data || rolePermissions?.permissions || []
  const permSet = new Set(Array.isArray(currentPerms) ? currentPerms.map(p => typeof p === "object" ? p.name : p) : [])

  const handleToggle = (permissionKey) => {
    setPermissions((prev) => {
      const next = { ...prev }
      if (permSet.has(permissionKey) && !(permissionKey in prev)) {
        next[permissionKey] = false
      } else {
        next[permissionKey] = !(prev[permissionKey] ?? permSet.has(permissionKey))
      }
      return next
    })
  }

  const handleSave = () => {
    const toAdd = []
    const toRemove = []
    Object.entries(permissions).forEach(([key, checked]) => {
      if (checked && !permSet.has(key)) toAdd.push(key)
      if (!checked && permSet.has(key)) toRemove.push(key)
    })
    saveMutation.mutate({ attach: toAdd, detach: toRemove })
  }

  const actions = ["create", "read", "update", "delete", "export"]

  // check if a module has "approve" permission
  const moduleHasApprove = (mod) => {
    const perms = groupedPerms[mod] || []
    return perms.some(p => p.action === "approve")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">Select a role to manage its permissions:</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Button
                key={role.id}
                variant={selectedRoleId === role.id ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedRoleId(role.id); setPermissions({}) }}
              >
                {role.name}
              </Button>
            ))}
          </div>
        </div>
        {selectedRoleId && (
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Permissions"}
          </Button>
        )}
      </div>

      {!selectedRoleId ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
          Select a role to configure permissions
        </div>
      ) : modsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : modules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No modules available.</div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Module</TableHead>
                  {actions.map((action) => (
                    <TableHead key={action} className="capitalize text-center">
                      {action}
                    </TableHead>
                  ))}
                  <TableHead className="capitalize text-center">approve</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((mod) => (
                  <TableRow key={mod}>
                    <TableCell className="font-medium capitalize">{mod.replace(/_/g, " ")}</TableCell>
                    {actions.map((action) => {
                      const key = `${mod}.${action}`
                      const isAssigned = permSet.has(key)
                      const localChecked = permissions[key] !== undefined ? permissions[key] : isAssigned
                      return (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={localChecked}
                            onCheckedChange={() => handleToggle(key)}
                          />
                        </TableCell>
                      )
                    })}
                    {moduleHasApprove(mod) ? (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permSet.has(`${mod}.approve`) || permissions[`${mod}.approve`]}
                          onCheckedChange={() => handleToggle(`${mod}.approve`)}
                        />
                      </TableCell>
                    ) : (
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function RolesPermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">Manage system roles and access permissions</p>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <Card>
            <CardContent className="pt-6">
              <ManageRolesTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="permissions">
          <ManagePermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
