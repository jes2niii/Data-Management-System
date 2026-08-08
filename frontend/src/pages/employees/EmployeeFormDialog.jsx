import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Camera } from "lucide-react"

const employeeSchema = z.object({
  employee_id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  department_id: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  date_hired: z.string().optional(),
  salary: z.string().optional(),
  status: z.string().default("active"),
  address: z.string().optional(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
})

export default function EmployeeFormDialog({ open, onClose, employee, onSuccess }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const isEditing = !!employee

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((r) => r.data),
  })

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {},
  })

  const { reset } = form

  useEffect(() => {
    if (employee) {
      const formatDate = (d) => {
        if (!d) return ""
        try { return format(new Date(d), "yyyy-MM-dd") } catch { return d }
      }
      reset({
        employee_id: employee.employee_id || "",
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        department_id: employee.department_id?.toString() || "",
        position: employee.position || "",
        date_hired: formatDate(employee.date_hired),
        salary: employee.salary || "",
        status: employee.status || "active",
        address: employee.address || "",
        birthdate: formatDate(employee.birthdate),
        gender: employee.gender || "",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_phone: employee.emergency_contact_phone || "",
        notes: employee.notes || "",
      })
      setPhotoPreview(employee.photo_url || null)
    } else {
      reset({})
      setPhotoPreview(null)
    }
    setPhoto(null)
  }, [employee, reset])

  const mutation = useMutation({
    mutationFn: (formData) => {
      if (isEditing) {
        formData.append("_method", "PUT")
        return api.post(`/employees/${employee.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }
      return api.post("/employees", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    },
    onSuccess: () => {
      toast.success(isEditing ? "Employee updated" : "Employee created")
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.message || "An error occurred"),
  })

  const onSubmit = (data) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value)
      }
    })
    if (photo) {
      formData.append("photo", photo)
    }
    mutation.mutate(formData)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const departments = Array.isArray(departmentsData) ? departmentsData : departmentsData?.data || []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update employee information." : "Enter employee details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={photoPreview || ""} />
                <AvatarFallback className="text-2xl">
                  {form.watch("first_name")?.[0]}{form.watch("last_name")?.[0]}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...form.register("first_name")} />
              {form.formState.errors.first_name && (
                <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...form.register("last_name")} />
              {form.formState.errors.last_name && (
                <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID</Label>
              <Input id="employee_id" {...form.register("employee_id")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={form.watch("gender")}
                onValueChange={(v) => form.setValue("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.department_id && (
                <p className="text-sm text-destructive">{form.formState.errors.department_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" {...form.register("position")} />
              {form.formState.errors.position && (
                <p className="text-sm text-destructive">{form.formState.errors.position.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
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
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_hired">Hire Date</Label>
              <Input id="date_hired" type="date" {...form.register("date_hired")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Date of Birth</Label>
              <Input id="birthdate" type="date" {...form.register("birthdate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary</Label>
              <Input id="salary" type="number" {...form.register("salary")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...form.register("address")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input id="emergency_contact_name" {...form.register("emergency_contact_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input id="emergency_contact_phone" {...form.register("emergency_contact_phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
