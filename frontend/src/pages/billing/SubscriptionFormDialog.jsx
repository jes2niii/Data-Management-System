import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  bill_category_id: z.string().optional(),
  provider: z.string().optional(),
  amount: z.string().min(1, "Amount required"),
  is_variable_amount: z.string().optional(),
  estimated_amount: z.string().optional(),
  variable_notes: z.string().optional(),
  billing_cycle: z.string().min(1, "Cycle required"),
  billing_frequency: z.string().optional(),
  start_date: z.string().optional(),
  next_billing_date: z.string().min(1, "Next billing required"),
  status: z.string().optional(),
  auto_renew: z.string().optional(),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})

const cycles = ["monthly","yearly","weekly","quarterly","custom"]
const statuses = ["active","paused","cancelled","expired","trial"]

export default function SubscriptionFormDialog({ open, onClose, subscription, onSuccess }) {
  const qc = useQueryClient()
  const isEditing = !!subscription

  const { data: catData } = useQuery({
    queryKey: ["bill-categories"],
    queryFn: () => api.get("/bill-categories").then(r=>r.data),
    enabled: open,
  })
  const categories = catData?.data?.data || catData?.data || []

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", bill_category_id: "", provider: "", amount: "", is_variable_amount: "false", estimated_amount: "", variable_notes: "", billing_cycle: "monthly",
      billing_frequency: "1", start_date: "", next_billing_date: "", status: "active",
      auto_renew: "true", payment_method: "", reference_number: "", notes: "",
    }
  })

  const { reset, watch, setValue } = form

  useEffect(() => {
    if (subscription) {
      reset({
        name: subscription.name || "",
        bill_category_id: subscription.bill_category_id ? String(subscription.bill_category_id) : "",
        provider: subscription.provider || "",
        amount: subscription.amount != null ? String(subscription.amount) : "",
        is_variable_amount: String(!!subscription.is_variable_amount),
        estimated_amount: subscription.estimated_amount != null ? String(subscription.estimated_amount) : "",
        variable_notes: subscription.variable_notes || "",
        billing_cycle: subscription.billing_cycle || "monthly",
        billing_frequency: String(subscription.billing_frequency || 1),
        start_date: subscription.start_date ? String(subscription.start_date).slice(0,10) : "",
        next_billing_date: subscription.next_billing_date ? String(subscription.next_billing_date).slice(0,10) : "",
        status: subscription.status || "active",
        auto_renew: String(!!subscription.auto_renew),
        payment_method: subscription.payment_method || "",
        reference_number: subscription.reference_number || "",
        notes: subscription.notes || "",
      })
    } else {
      reset({
        name: "", bill_category_id: "", provider: "", amount: "", is_variable_amount: "false", estimated_amount: "", variable_notes: "", billing_cycle: "monthly",
        billing_frequency: "1", start_date: "", next_billing_date: "", status: "active",
        auto_renew: "true", payment_method: "", reference_number: "", notes: "",
      })
    }
  }, [subscription, reset, open])

  const mutation = useMutation({
    mutationFn: (payload) => isEditing ? api.put(`/subscriptions/${subscription.id}`, payload) : api.post("/subscriptions", payload),
    onSuccess: () => {
      toast.success(isEditing ? "Subscription updated" : "Subscription created")
      qc.invalidateQueries({ queryKey: ["subscriptions"] })
      qc.invalidateQueries({ queryKey: ["subscriptions-stats"] })
      onClose()
      onSuccess?.()
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const onSubmit = (data) => {
    const isVariable = data.is_variable_amount === "true"
    const payload = {
      name: data.name,
      bill_category_id: data.bill_category_id ? parseInt(data.bill_category_id) : null,
      provider: data.provider || null,
      amount: parseFloat(data.amount) || 0,
      is_variable_amount: isVariable,
      estimated_amount: isVariable && data.estimated_amount ? parseFloat(data.estimated_amount) : null,
      variable_notes: isVariable ? (data.variable_notes || null) : null,
      billing_cycle: data.billing_cycle,
      billing_frequency: parseInt(data.billing_frequency) || 1,
      start_date: data.start_date || null,
      next_billing_date: data.next_billing_date,
      status: data.status || "active",
      auto_renew: data.auto_renew === "true",
      payment_method: data.payment_method || null,
      reference_number: data.reference_number || null,
      notes: data.notes || null,
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={v=>{ if(!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          <DialogDescription>Track recurring billing • Subscription monitoring within Billings</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g., Adobe Creative Cloud" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch("bill_category_id")} onValueChange={v=>setValue("bill_category_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c=> <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input placeholder="e.g., Adobe, PLDT" {...form.register("provider")} />
            </div>
            <div className="space-y-2">
              <Label>Amount * {watch("is_variable_amount")==="true" && <span className="text-xs font-normal text-amber-600">(variable)</span>}</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register("amount")} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={watch("is_variable_amount")==="true"} onChange={e=> setValue("is_variable_amount", e.target.checked ? "true":"false")} className="rounded" />
                Variable amount per billing (e.g., electricity, water)
              </label>
            </div>
          </div>

          {watch("is_variable_amount")==="true" && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="space-y-2">
                <Label>Estimated Amount</Label>
                <Input type="number" step="0.01" placeholder="e.g., 8500" {...form.register("estimated_amount")} />
                <p className="text-xs text-muted-foreground">Expected average for budgeting</p>
              </div>
              <div className="space-y-2">
                <Label>Variable Notes</Label>
                <Input placeholder="e.g., Based on meter reading" {...form.register("variable_notes")} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Billing Cycle *</Label>
              <Select value={watch("billing_cycle")} onValueChange={v=>setValue("billing_cycle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cycles.map(c=> <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Input type="number" min="1" {...form.register("billing_frequency")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={v=>setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s=> <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...form.register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label>Next Billing *</Label>
              <Input type="date" {...form.register("next_billing_date")} />
              {form.formState.errors.next_billing_date && <p className="text-xs text-destructive">{form.formState.errors.next_billing_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Auto Renew</Label>
              <Select value={watch("auto_renew")} onValueChange={v=>setValue("auto_renew", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={watch("payment_method")} onValueChange={v=>setValue("payment_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Bank Transfer","Credit Card","Cash","Check","Online Payment"].map(m=> <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference #</Label>
              <Input placeholder="SUB-1234" {...form.register("reference_number")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input placeholder="e.g., Annual renewal" {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
