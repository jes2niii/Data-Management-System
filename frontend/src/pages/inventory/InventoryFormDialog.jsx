import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const schema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, "Name required"),
  inventory_category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  quantity: z.string().min(1, "Quantity required"),
  unit: z.string().optional(),
  location: z.string().optional(),
  reorder_point: z.string().optional(),
  unit_cost: z.string().min(1, "Unit cost required"),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
})

export default function InventoryFormDialog({ open, onClose, item, categories, suppliers, onSuccess }) {
  const qc = useQueryClient()
  const isEditing = !!item

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "", name: "", inventory_category_id: "", supplier_id: "", quantity: "", unit: "pcs", location: "", reorder_point: "10", unit_cost: "", expiry_date: "", notes: "",
    }
  })

  const { reset, watch, setValue } = form

  useEffect(() => {
    if (item) {
      reset({
        sku: item.sku || "",
        name: item.name || "",
        inventory_category_id: item.inventory_category_id ? String(item.inventory_category_id) : "",
        supplier_id: item.supplier_id ? String(item.supplier_id) : "",
        quantity: item.quantity != null ? String(item.quantity) : "",
        unit: item.unit || "pcs",
        location: item.location || "",
        reorder_point: String(item.reorder_point ?? 10),
        unit_cost: item.unit_cost != null ? String(item.unit_cost) : "",
        expiry_date: item.expiry_date ? String(item.expiry_date).slice(0,10) : "",
        notes: item.notes || "",
      })
    } else {
      reset({ sku: "", name: "", inventory_category_id: "", supplier_id: "", quantity: "", unit: "pcs", location: "", reorder_point: "10", unit_cost: "", expiry_date: "", notes: "" })
    }
  }, [item, reset, open])

  const mutation = useMutation({
    mutationFn: (payload) => isEditing ? api.put(`/inventory/${item.id}`, payload) : api.post("/inventory", payload),
    onSuccess: () => {
      toast.success(isEditing ? "Item updated" : "Item created")
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["inventory-stats"] })
      onClose()
      onSuccess?.()
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const onSubmit = (data) => {
    const payload = {
      sku: data.sku || null,
      name: data.name,
      inventory_category_id: data.inventory_category_id ? parseInt(data.inventory_category_id) : null,
      supplier_id: data.supplier_id ? parseInt(data.supplier_id) : null,
      quantity: parseFloat(data.quantity) || 0,
      unit: data.unit || "pcs",
      location: data.location || null,
      reorder_point: parseInt(data.reorder_point) || 10,
      unit_cost: parseFloat(data.unit_cost) || 0,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={v=>{ if(!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
          <DialogDescription>Supply Chain Management Department • Stock will be tracked with transactions</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input placeholder="e.g., OFF-001" {...form.register("sku")} />
            </div>
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input placeholder="e.g., A4 Bond Paper" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input placeholder="Brief description" {...form.register("description")} />
          </div>

          <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch("inventory_category_id")} onValueChange={v=>setValue("inventory_category_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(categories||[]).map(c=> <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" step="0.01" {...form.register("quantity")} />
              {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={watch("unit")} onValueChange={v=>setValue("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pcs","box","ream","bag","bottle","roll","sack","kg","liter","meter","set","pair"].map(u=> <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input type="number" {...form.register("reorder_point")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="e.g., Warehouse A - Shelf 1" {...form.register("location")} />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost *</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register("unit_cost")} />
              {form.formState.errors.unit_cost && <p className="text-xs text-destructive">{form.formState.errors.unit_cost.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" {...form.register("expiry_date")} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="e.g., For Supply Chain" {...form.register("notes")} />
            </div>
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
