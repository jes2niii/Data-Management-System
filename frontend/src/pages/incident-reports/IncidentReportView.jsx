import { downloadAttachment } from "@/lib/api"
import { useBranding } from "@/hooks/useBranding"
import { printIncidentReport } from "@/lib/incident-report-print"
import { formatIncidentDate } from "@/lib/incident-report-format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Printer, Download } from "lucide-react"

const badgeVariant = { Lost: "destructive", Damaged: "warning", Stolen: "secondary" }

export default function IncidentReportView({ report, onClose }) {
  const { companyName } = useBranding()
  if (!report) return null

  const exportJson = () => downloadAttachment("/incident-reports/export/json", `${report.ir_number}.json`)

  const field = (label, value) => (
    <div className="border-b py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  )

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            Incident Report {report.ir_number}
            <Badge variant={badgeVariant[report.incident_type] || "outline"}>{report.incident_type}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="bg-white text-black p-4 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold tracking-wide">{companyName}</h2>
            <p className="text-sm uppercase tracking-[0.2em]">Incident Report</p>
            <p className="text-sm font-semibold mt-2">{report.ir_number}</p>
          </div>

          <dl className="grid gap-x-8 sm:grid-cols-2">
            {field("Filer's Name", report.filer_name)}
            {field("Date Reported", formatIncidentDate(report.date_reported))}
            {field("Item", report.item)}
            {field("Property Code", report.property_code)}
            {field("Type of Incident", report.incident_type)}
            {field("Date of Incident", formatIncidentDate(report.date_of_incident))}
            {field("Place of Incident", report.place_of_incident)}
            {field("Remarks", report.remarks)}
            {field("JO #", report.jo_number)}
            {field("Notes", report.notes)}
          </dl>

          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Detailed Narration</h3>
            <p className="border rounded p-3 text-sm whitespace-pre-wrap min-h-[90px]">{report.detailed_narration}</p>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-12 text-xs">
            <div className="border-t border-black pt-2">Prepared by: {report.filer_name}</div>
            <div className="border-t border-black pt-2">Noted by:</div>
            <div className="border-t border-black pt-2">Received by:</div>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={exportJson}><Download className="mr-2 h-4 w-4" /> Export JSON</Button>
          <Button variant="outline" onClick={() => printIncidentReport(report, companyName)}><Printer className="mr-2 h-4 w-4" /> Print / PDF</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
