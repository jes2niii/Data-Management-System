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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera } from "lucide-react"

const employeeSchema = z.object({
  employee_id: z.string().optional(),
  employee_no: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  gender: z.string().optional(),
  civil_status: z.string().optional(),
  birthdate: z.string().optional(),
  place_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  mobile_number: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  present_address: z.string().optional(),
  permanent_address: z.string().optional(),
  emergency_contact_person: z.string().optional(),
  emergency_contact_number: z.string().optional(),
  emergency_relationship: z.string().optional(),
  department_id: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  employment_type: z.string().optional(),
  date_hired: z.string().min(1, "Date hired is required"),
  regularization_date: z.string().optional(),
  salary: z.string().optional(),
  payroll_type: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  sss_no: z.string().optional(),
  philhealth_no: z.string().optional(),
  pagibig_no: z.string().optional(),
  tin: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
})

const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

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

  const formatDate = (d) => {
    if (!d) return ""
    try { return format(new Date(d), "yyyy-MM-dd") } catch { return d }
  }

  const getDefaultValues = () => {
    if (!employee) return { nationality: "Filipino", status: "active", payroll_type: "Monthly" }
    return {
      employee_id: employee.employee_id || "",
      employee_no: employee.employee_no || "",
      first_name: employee.first_name || "",
      middle_name: employee.middle_name || "",
      last_name: employee.last_name || "",
      suffix: employee.suffix || "",
      gender: employee.gender || "",
      civil_status: employee.civil_status || "",
      birthdate: formatDate(employee.birthdate),
      place_of_birth: employee.place_of_birth || "",
      nationality: employee.nationality || "Filipino",
      mobile_number: employee.mobile_number || "",
      email: employee.email || "",
      phone: employee.phone || "",
      present_address: employee.present_address || "",
      permanent_address: employee.permanent_address || "",
      emergency_contact_person: employee.emergency_contact_person || "",
      emergency_contact_number: employee.emergency_contact_number || "",
      emergency_relationship: employee.emergency_relationship || "",
      department_id: employee.department_id?.toString() || "",
      position: employee.position || "",
      employment_type: employee.employment_type || "",
      date_hired: formatDate(employee.date_hired),
      regularization_date: formatDate(employee.regularization_date),
      salary: employee.salary || "",
      payroll_type: employee.payroll_type || "Monthly",
      status: employee.status || "active",
      notes: employee.notes || "",
      sss_no: employee.sss_no || "",
      philhealth_no: employee.philhealth_no || "",
      pagibig_no: employee.pagibig_no || "",
      tin: employee.tin || "",
      bank_name: employee.bank_name || "",
      bank_account: employee.bank_account || "",
    }
  }

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: getDefaultValues(),
  })

  const watchFirstName = form.watch("first_name")
  const watchMiddleName = form.watch("middle_name")
  const watchLastName = form.watch("last_name")
  const watchSuffix = form.watch("suffix")

  const fullNamePreview = [watchLastName, [watchFirstName, watchMiddleName, watchSuffix].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"

  useEffect(() => {
    setPhotoPreview(employee?.photo_url || null)
    setPhoto(null)
  }, [employee?.id])

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
    const givenName = [data.first_name, data.middle_name, data.suffix].filter(Boolean).join(" ")
    const fullName = [data.last_name, givenName].filter(Boolean).join(", ")

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value)
      }
    })
    formData.append("full_name", fullName)
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
                  {watchFirstName?.[0]}{watchLastName?.[0]}
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

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="contact">Contact Details</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="government">Government IDs</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_no">Employee No.</Label>
                  <Input id="employee_no" {...form.register("employee_no")} />
                </div>
                <div className="space-y-2" />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" {...form.register("first_name")} />
                  {form.formState.errors.first_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input id="middle_name" {...form.register("middle_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" {...form.register("last_name")} />
                  {form.formState.errors.last_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suffix">Suffix</Label>
                  <Input id="suffix" {...form.register("suffix")} placeholder="Jr., Sr., III" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullNamePreview} readOnly className="bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
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
                <div className="space-y-2">
                  <Label>Civil Status</Label>
                  <Select
                    value={form.watch("civil_status")}
                    onValueChange={(v) => form.setValue("civil_status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                      <SelectItem value="Separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Birthday</Label>
                  <Input id="birthdate" type="date" {...form.register("birthdate")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="place_of_birth">Place of Birth</Label>
                  <Input id="place_of_birth" {...form.register("place_of_birth")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" {...form.register("nationality")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile_number">Mobile Number</Label>
                  <Input id="mobile_number" {...form.register("mobile_number")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="present_address">Present Address</Label>
                <textarea id="present_address" className={textareaClass} rows={3} {...form.register("present_address")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="permanent_address">Permanent Address</Label>
                <textarea id="permanent_address" className={textareaClass} rows={3} {...form.register("permanent_address")} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_person">Emergency Contact Person</Label>
                  <Input id="emergency_contact_person" {...form.register("emergency_contact_person")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_number">Emergency Contact No.</Label>
                  <Input id="emergency_contact_number" {...form.register("emergency_contact_number")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_relationship">Relationship</Label>
                  <Input id="emergency_relationship" {...form.register("emergency_relationship")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select
                    value={form.watch("employment_type")}
                    onValueChange={(v) => form.setValue("employment_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Probationary">Probationary</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Contractual">Contractual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Employee Status *</Label>
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
                  {form.formState.errors.status && (
                    <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_hired">Date Hired *</Label>
                  <Input id="date_hired" type="date" {...form.register("date_hired")} />
                  {form.formState.errors.date_hired && (
                    <p className="text-sm text-destructive">{form.formState.errors.date_hired.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regularization_date">Regularization Date</Label>
                  <Input id="regularization_date" type="date" {...form.register("regularization_date")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Basic Salary</Label>
                  <Input id="salary" type="number" {...form.register("salary")} />
                </div>
                <div className="space-y-2">
                  <Label>Payroll Type</Label>
                  <Select
                    value={form.watch("payroll_type")}
                    onValueChange={(v) => form.setValue("payroll_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Semi-Monthly">Semi-Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" {...form.register("notes")} />
              </div>
            </TabsContent>

            <TabsContent value="government" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sss_no">SSS No.</Label>
                  <Input id="sss_no" {...form.register("sss_no")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="philhealth_no">PhilHealth No.</Label>
                  <Input id="philhealth_no" {...form.register("philhealth_no")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagibig_no">Pag-IBIG No.</Label>
                  <Input id="pagibig_no" {...form.register("pagibig_no")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tin">TIN</Label>
                  <Input id="tin" {...form.register("tin")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input id="bank_name" {...form.register("bank_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account</Label>
                  <Input id="bank_account" {...form.register("bank_account")} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
