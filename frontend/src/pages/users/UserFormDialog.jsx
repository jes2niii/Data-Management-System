import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role_id: z.string().min(1, "Role is required"),
  department_id: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  status: z.string().default("active"),
})

export default function UserFormDialog({ open, onClose, user, onSuccess }) {
  const queryClient = useQueryClient()
  const isEditing = !!user

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  })
  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((r) => r.data),
  })

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role_id: "",
      department_id: "",
      position: "",
      phone: "",
      address: "",
      gender: "",
      status: "active",
    },
  })

  const { reset } = form

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        password: "",
        role_id: user.role_id?.toString() || "",
        department_id: user.department_id?.toString() || "",
        position: user.position || "",
        phone: user.phone || "",
        address: user.address || "",
        gender: user.gender || "",
        status: user.status || "active",
      })
    } else {
      reset({
        name: "",
        username: "",
        email: "",
        password: "",
        role_id: "",
        department_id: "",
        position: "",
        phone: "",
        address: "",
        gender: "",
        status: "active",
      })
    }
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return api.put(`/users/${user.id}`, data)
      }
      return api.post("/users", data)
    },
    onSuccess: () => {
      toast.success(isEditing ? "User updated successfully" : "User created successfully")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "An error occurred")
    },
  })

  const onSubmit = (data) => {
    const payload = { ...data }
    if (isEditing && !payload.password) {
      delete payload.password
    }
    payload.role_id = Number(payload.role_id)
    payload.department_id = Number(payload.department_id)
    mutation.mutate(payload)
  }

  const roles = Array.isArray(rolesData) ? rolesData : rolesData?.data || []
  const departments = Array.isArray(departmentsData) ? departmentsData : departmentsData?.data || []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the user details below." : "Fill in the details to create a new user."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...form.register("name")} placeholder="Full name" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" {...form.register("username")} placeholder="Username" />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="Email address" />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} placeholder="Phone number" />
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" {...form.register("password")} placeholder="Password" />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={form.watch("role_id")}
                onValueChange={(v) => form.setValue("role_id", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.role_id && (
                <p className="text-sm text-destructive">{form.formState.errors.role_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select
                value={form.watch("department_id")}
                onValueChange={(v) => form.setValue("department_id", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.department_id && (
                <p className="text-sm text-destructive">{form.formState.errors.department_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" {...form.register("position")} placeholder="Position" />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.watch("gender")}
                onValueChange={(v) => form.setValue("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...form.register("address")} placeholder="Address" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
