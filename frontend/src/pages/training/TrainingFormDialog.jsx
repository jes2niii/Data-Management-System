import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { useCurrency } from "@/hooks/useCurrency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const trainingSchema = z.object({
  date: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  training_id: z.string().optional(),
  training_course: z.string().min(1, "Training Course is required"),
  manner_of_conduct: z.string().optional(),
  training_schedule_cbt: z.string().optional(),
  training_schedule_practical: z.string().optional(),
  training_fee: z.string().min(1, "Training Fee is required"),
  downpayment: z.string().optional(),
  // remarks is auto-computed from fee/downpayment, not user input
  remarks: z.string().optional(),
  system_location: z.string().optional(),
  assisted_by: z.string().optional(),
  print_status: z.string().optional(),
})

const mannerOptions = [
  "Face to Face",
  "CBT",
  "Online",
  "Blended",
  "Hybrid",
  "Practical",
  "CBT/Face to Face",
]

const systemOptions = ["Manila", "Naga", "Legazpi"]
const printStatusOptions = ["To Print", "Printed"]

export default function TrainingFormDialog({ open, onClose, record, onSuccess }) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const isEditing = !!record

  const { data: trainingsData } = useQuery({
    queryKey: ["trainings-all-form"],
    queryFn: () => api.get("/trainings", { params: { per_page: 100 } }).then(r => r.data),
    enabled: open,
  })
  const trainings = useMemo(() => trainingsData?.data?.data || trainingsData?.data || [], [trainingsData])

  const form = useForm({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      date: "",
      name: "",
      training_id: "",
      training_course: "",
      manner_of_conduct: "",
      training_schedule_cbt: "",
      training_schedule_practical: "",
      training_fee: "",
      downpayment: "",
      remarks: "Partial Payment",
      system_location: "",
      assisted_by: "",
      print_status: "To Print",
    },
  })

  const { reset, watch, setValue } = form
  const trainingFee = watch("training_fee")
  const downpayment = watch("downpayment")
  const balancePreview = (() => {
    const fee = parseFloat(trainingFee) || 0
    const down = parseFloat(downpayment) || 0
    return (fee - down).toFixed(2)
  })()
  const remarksPreview = (() => {
    const bal = parseFloat(balancePreview) || 0
    return Math.abs(bal) < 0.01 ? "Full Payment" : "Partial Payment"
  })()

  // When trainings load, try to auto-match course to training_id for editing
  const findTrainingIdByCourse = (courseName) => {
    if (!courseName || trainings.length === 0) return ""
    const found = trainings.find(t => (t.title || t.name) === courseName || t.name === courseName || t.code === courseName)
    return found ? String(found.id) : ""
  }

  useEffect(() => {
    if (!open) return
    if (record) {
      // Use stored training_id directly; don't depend on trainings to avoid loop.
      // The Select's display will fallback to findTrainingIdByCourse for visual selection.
      const tid = record.training_id ? String(record.training_id) : ""
      reset({
        date: record.date ? String(record.date).slice(0, 10) : "",
        name: record.name || "",
        training_id: tid,
        training_course: record.training_course || "",
        manner_of_conduct: record.manner_of_conduct || "",
        training_schedule_cbt: record.training_schedule_cbt || "",
        training_schedule_practical: record.training_schedule_practical || "",
        training_fee: record.training_fee != null ? String(record.training_fee) : "",
        downpayment: record.downpayment != null ? String(record.downpayment) : "",
        remarks: record.remarks || "Partial Payment",
        system_location: record.system_location || "",
        assisted_by: record.assisted_by || "",
        print_status: record.print_status || "To Print",
      })
    } else {
      reset({
        date: "",
        name: "",
        training_id: "",
        training_course: "",
        manner_of_conduct: "",
        training_schedule_cbt: "",
        training_schedule_practical: "",
        training_fee: "",
        downpayment: "",
        remarks: "Partial Payment",
        system_location: "",
        assisted_by: "",
        print_status: "To Print",
      })
    }
  }, [record, reset, open])

  const mutation = useMutation({
    mutationFn: (payload) => {
      if (isEditing) {
        return api.put(`/training-monitorings/${record.id}`, payload)
      }
      return api.post("/training-monitorings", payload)
    },
    onSuccess: () => {
      toast.success(isEditing ? "Training record updated" : "Training record created")
      queryClient.invalidateQueries({ queryKey: ["trainings"] })
      queryClient.invalidateQueries({ queryKey: ["training-stats"] })
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "An error occurred"
      const errors = err.response?.data?.errors
      if (errors) {
        const first = Object.values(errors)[0]?.[0]
        toast.error(first || msg)
      } else {
        toast.error(msg)
      }
    },
  })

  const handleTrainingSelect = (value) => {
    setValue("training_id", value, { shouldValidate: true })
    const selected = trainings.find(t => String(t.id) === value)
    if (selected) {
      const displayName = selected.title || selected.name
      const effectiveFee = selected.fee ?? selected.price ?? 0
      setValue("training_course", displayName, { shouldValidate: true })
      setValue("training_fee", String(effectiveFee), { shouldValidate: true })
    }
  }

  const onSubmit = (data) => {
    // Derive training_id from course name if not explicitly selected (for back-compat with old records)
    let effectiveTrainingId = data.training_id
    if (!effectiveTrainingId && data.training_course) {
      const derived = findTrainingIdByCourse(data.training_course)
      if (derived) effectiveTrainingId = derived
    }
    const payload = {
      date: data.date || null,
      name: data.name,
      training_id: effectiveTrainingId ? parseInt(effectiveTrainingId) : null,
      training_course: data.training_course,
      manner_of_conduct: data.manner_of_conduct || null,
      training_schedule_cbt: data.training_schedule_cbt || null,
      training_schedule_practical: data.training_schedule_practical || null,
      training_fee: parseFloat(data.training_fee) || 0,
      downpayment: parseFloat(data.downpayment) || 0,
      remarks: remarksPreview,
      system_location: data.system_location || null,
      assisted_by: data.assisted_by || null,
      print_status: data.print_status || "To Print",
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Training Record" : "Add Training Record"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the training monitoring details." : "Enter the new training monitoring details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Trainee full name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Training Course *</Label>
              <Select
                value={watch("training_id") || findTrainingIdByCourse(watch("training_course"))}
                onValueChange={handleTrainingSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select training from catalog" />
                </SelectTrigger>
                <SelectContent>
                  {trainings.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No trainings — add in Settings → Trainings</div>
                  ) : (
                    trainings.filter(t => t.is_active).map(t => {
                      const displayName = t.title || t.name
                      const effectiveFee = t.fee ?? t.price ?? 0
                      return (
                        <SelectItem key={t.id} value={String(t.id)}>{displayName} — {formatCurrency(effectiveFee)} {t.code ? `(${t.code})` : ""}</SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
              <Input
                id="training_course"
                placeholder="e.g., Medical First Aid (MEFA), Ship Security Officer (SSO)"
                {...form.register("training_course")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground">Selecting from catalog auto-fills fee (e.g., MEFA ₱1700, MECA ₱2800, SSO ₱1100); price logs keep history for backtracking.</p>
              {form.formState.errors.training_course && (
                <p className="text-sm text-destructive">{form.formState.errors.training_course.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Manner of Conduct</Label>
              <Select
                value={watch("manner_of_conduct")}
                onValueChange={(v) => setValue("manner_of_conduct", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manner" />
                </SelectTrigger>
                <SelectContent>
                  {mannerOptions.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training_schedule_cbt">Training Schedule (CBT/Face to Face)</Label>
              <Input id="training_schedule_cbt" placeholder="e.g., 2026-09-15 or Sep 10-15" {...form.register("training_schedule_cbt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_schedule_practical">Training Schedule (Practical)</Label>
              <Input id="training_schedule_practical" placeholder="e.g., 2026-09-20 or Sep 20-22" {...form.register("training_schedule_practical")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training_fee">Training Fee *</Label>
              <Input id="training_fee" type="number" step="0.01" placeholder="0.00" {...form.register("training_fee")} />
              {form.formState.errors.training_fee && (
                <p className="text-sm text-destructive">{form.formState.errors.training_fee.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="downpayment">Downpayment</Label>
              <Input id="downpayment" type="number" step="0.01" placeholder="0.00" {...form.register("downpayment")} />
            </div>
            <div className="space-y-2">
              <Label>Balance (auto)</Label>
              <Input value={balancePreview} disabled className="bg-muted font-mono" />
              <p className="text-xs text-muted-foreground">Fee - Downpayment</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks (auto)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-medium">
              <span className={remarksPreview === "Full Payment" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
                {remarksPreview}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">— auto from Fee & Downpayment</span>
            </div>
            <p className="text-xs text-muted-foreground">Full Payment when Balance = 0, else Partial Payment</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>System (Manila/Naga/Legazpi)</Label>
              <Select
                value={watch("system_location")}
                onValueChange={(v) => setValue("system_location", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  {systemOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assisted_by">Assisted By</Label>
              <Input id="assisted_by" placeholder="Staff name" {...form.register("assisted_by")} />
            </div>
            <div className="space-y-2">
              <Label>Note/Status</Label>
              <Select
                value={watch("print_status")}
                onValueChange={(v) => setValue("print_status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {printStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
