import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { incidentReportSchema } from "@/lib/incident-report-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const emptyValues = {
  filer_name: "", date_reported: "", item: "", property_code: "", incident_type: "Lost",
  date_of_incident: "", place_of_incident: "", detailed_narration: "",
  remarks: "", jo_number: "", notes: "",
}

const textAreaClass = "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export default function IncidentReportForm({ open, onClose, report, onSubmit, isPending }) {
  const isEditing = Boolean(report)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(incidentReportSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    reset(report ? {
      filer_name: report.filer_name || "",
      date_reported: report.date_reported ? String(report.date_reported).slice(0, 10) : "",
      item: report.item || "",
      property_code: report.property_code || "",
      incident_type: report.incident_type || "Lost",
      date_of_incident: report.date_of_incident ? String(report.date_of_incident).slice(0, 10) : "",
      place_of_incident: report.place_of_incident || "",
      detailed_narration: report.detailed_narration || "",
      remarks: report.remarks || "",
      jo_number: report.jo_number || "",
      notes: report.notes || "",
    } : emptyValues)
  }, [report, reset])

  const error = (name) => errors[name] && <p className="text-xs text-destructive">{errors[name].message}</p>

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${report.ir_number}` : "Create Incident Report"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "The IR number cannot be changed." : "The IR number is generated automatically when you save."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="text-sm text-destructive">Please correct the highlighted fields.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="filer_name">Filer's Name *</Label>
              <Input id="filer_name" {...register("filer_name")} />
              {error("filer_name")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="date_reported">Date Reported *</Label>
              <Input id="date_reported" type="date" {...register("date_reported")} />
              {error("date_reported")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="item">Item *</Label>
              <Input id="item" {...register("item")} />
              {error("item")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="property_code">Property Code</Label>
              <Input id="property_code" {...register("property_code")} placeholder="e.g., IT-001" />
              {error("property_code")}
            </div>
            <div className="space-y-1">
              <Label>Type of Incident *</Label>
              <Select value={watch("incident_type")} onValueChange={(value) => setValue("incident_type", value, { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Stolen">Stolen</SelectItem>
                </SelectContent>
              </Select>
              {error("incident_type")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="date_of_incident">Date of Incident *</Label>
              <Input id="date_of_incident" type="date" {...register("date_of_incident")} />
              {error("date_of_incident")}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="place_of_incident">Place of Incident *</Label>
              <Input id="place_of_incident" {...register("place_of_incident")} />
              {error("place_of_incident")}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="detailed_narration">Detailed Narration *</Label>
              <textarea id="detailed_narration" className={textAreaClass} {...register("detailed_narration")} />
              {error("detailed_narration")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" {...register("remarks")} />
              {error("remarks")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="jo_number">JO #</Label>
              <Input id="jo_number" {...register("jo_number")} />
              {error("jo_number")}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register("notes")} />
              {error("notes")}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Report"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
