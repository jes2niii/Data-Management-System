import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
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
import { Upload } from "lucide-react"

const billSchema = z.object({
  name: z.string().min(1, "Bill name is required"),
  bill_category_id: z.string().min(1, "Category is required"),
  provider: z.string().min(1, "Provider is required"),
  reference_number: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  billing_date: z.string().optional(),
  due_date: z.string().optional(),
  payment_date: z.string().optional(),
  payment_method: z.string().optional(),
  status: z.string().default("pending"),
  notes: z.string().optional(),
})

const paymentMethods = [
  "Bank Transfer",
  "Credit Card",
  "Cash",
  "Check",
  "Online Payment",
  "Direct Debit",
]

const statuses = ["pending", "paid", "overdue", "cancelled"]

export default function BillFormDialog({ open, onClose, bill, onSuccess }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [attachment, setAttachment] = useState(null)
  const isEditing = !!bill

  const { data: categoriesData } = useQuery({
    queryKey: ["bill-categories"],
    queryFn: () => api.get("/bill-categories").then((r) => r.data),
    enabled: open,
  })

  const categories = categoriesData?.data?.data || categoriesData?.data || []

  const form = useForm({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: "",
      bill_category_id: "",
      provider: "",
      reference_number: "",
      amount: "",
      billing_date: "",
      due_date: "",
      payment_date: "",
      payment_method: "",
      status: "pending",
      notes: "",
    },
  })

  const { reset } = form

  useEffect(() => {
    if (bill) {
      reset({
        name: bill.name || "",
        bill_category_id: bill.bill_category_id ? String(bill.bill_category_id) : "",
        provider: bill.provider || "",
        reference_number: bill.reference_number || "",
        amount: bill.amount ? String(bill.amount) : "",
        billing_date: bill.billing_date || "",
        due_date: bill.due_date || "",
        payment_date: bill.payment_date || "",
        payment_method: bill.payment_method || "",
        status: bill.status || "pending",
        notes: bill.notes || "",
      })
    } else {
      reset({
        name: "",
        bill_category_id: "",
        provider: "",
        reference_number: "",
        amount: "",
        billing_date: "",
        due_date: "",
        payment_date: "",
        payment_method: "",
        status: "pending",
        notes: "",
      })
    }
    setAttachment(null)
  }, [bill, reset])

  const mutation = useMutation({
    mutationFn: (formData) => {
      if (isEditing) {
        return api.put(`/bills/${bill.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }
      return api.post("/bills", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    },
    onSuccess: () => {
      toast.success(isEditing ? "Bill updated" : "Bill created")
      queryClient.invalidateQueries({ queryKey: ["bills"] })
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
    if (attachment) {
      formData.append("attachments[]", attachment)
    }
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Bill" : "Add Bill"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update bill details." : "Enter new bill details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bill Name *</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.watch("bill_category_id")}
                onValueChange={(v) => form.setValue("bill_category_id", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.bill_category_id && (
                <p className="text-sm text-destructive">{form.formState.errors.bill_category_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Input id="provider" {...form.register("provider")} />
              {form.formState.errors.provider && (
                <p className="text-sm text-destructive">{form.formState.errors.provider.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input id="reference_number" {...form.register("reference_number")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
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
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={form.watch("payment_method")}
                onValueChange={(v) => form.setValue("payment_method", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_date">Billing Date</Label>
              <Input id="billing_date" type="date" {...form.register("billing_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" {...form.register("due_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input id="payment_date" type="date" {...form.register("payment_date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attachment</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload File
              </Button>
              {attachment && <span className="text-sm text-muted-foreground">{attachment.name}</span>}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
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
