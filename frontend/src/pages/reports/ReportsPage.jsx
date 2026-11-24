import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { toast } from "sonner"
import api, { downloadAttachment } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/hooks/useCurrency"
import { canOpenPage, hasPermission } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileSpreadsheet, Printer, Users, File,
  Receipt, Activity,
} from "lucide-react"

const statusMap = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "destructive", label: "Inactive" },
  paid: { variant: "success", label: "Paid" },
  unpaid: { variant: "warning", label: "Unpaid" },
  pending: { variant: "warning", label: "Pending" },
  cancelled: { variant: "outline", label: "Cancelled" },
  overdue: { variant: "destructive", label: "Overdue" },
}

const reportTypes = {
  employees: { type: "employee", permission: "employees.read", label: "Employees", icon: Users },
  documents: { type: "document", permission: "documents.read", label: "Documents", icon: File },
  bills: { type: "bill", permission: "bills.read", label: "Bills", icon: Receipt },
  activity: { type: "activity", permission: "activity_logs.read", label: "Activity", icon: Activity },
}

function ReportTable({ columns, data, isLoading, isError, emptyMessage }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (isError) return <div className="text-center py-12 text-destructive">Failed to load data.</div>
  if (data.length === 0) return <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, idx) => (
          <TableRow key={row.id || idx}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                 {col.render ? col.render(row) : row[col.key] ?? "-"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { format: formatMoney } = useCurrency()
  const permitted = (permission) => hasPermission(user, permission)
  const visibleTabs = Object.entries(reportTypes).filter(([, report]) => permitted(report.permission))
  const [selectedTab, setSelectedTab] = useState(null)
  const activeTab = visibleTabs.some(([key]) => key === selectedTab) ? selectedTab : visibleTabs[0]?.[0]
  const canRead = canOpenPage(user, "reports")
  const canExport = permitted("reports.export")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [employeeStatus, setEmployeeStatus] = useState("all")
  const [billStatus, setBillStatus] = useState("all")
  const [exporting, setExporting] = useState(false)
  const invalidDates = activeTab !== "employees" && dateFrom && dateTo && dateFrom > dateTo
  const dates = { date_from: dateFrom || undefined, date_to: dateTo || undefined }
  const filters = activeTab === "employees"
    ? { department_id: departmentFilter === "all" ? undefined : departmentFilter, status: employeeStatus === "all" ? undefined : employeeStatus }
    : activeTab === "bills" ? { ...dates, status: billStatus === "all" ? undefined : billStatus } : dates

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", activeTab, filters],
    enabled: canRead && !invalidDates,
    queryFn: () => api.get(`/reports/${activeTab}`, { params: filters }).then((r) => r.data.data),
  })

  const { data: departments = [], isError: departmentError } = useQuery({
    queryKey: ["report-departments"],
    enabled: canRead && activeTab === "employees",
    queryFn: () => api.get("/reports/employees/departments").then((r) => r.data.data),
  })

  const handlePrint = () => window.print()

  const handleExport = async () => {
    const { type } = reportTypes[activeTab]
    setExporting(true)
    try {
      await downloadAttachment(`/reports/export/${type}/csv`, `${type}-report.csv`, filters)
    } catch (error) {
      toast.error(error.response?.status === 403 ? "You do not have permission to export this report." : "Could not export this report. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  if (!canRead) {
    return <p role="status" className="text-muted-foreground">You do not have access to any reports.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and export reports</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {canExport && <Button variant="outline" size="sm" disabled={exporting || Boolean(invalidDates)} onClick={handleExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> {exporting ? "Exporting…" : "Download CSV"}
          </Button>}
          <Button variant="outline" size="sm" disabled={isLoading || isError || Boolean(invalidDates)} onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setSelectedTab}>
        <TabsList className="h-auto flex-wrap print:hidden">
          {visibleTabs.map(([key, { label, icon: Icon }]) => (
            <TabsTrigger key={key} value={key}><Icon className="mr-2 h-4 w-4" />{label}</TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 my-4 print:hidden">
          {activeTab !== "employees" && <>
          <Input
            type="date"
            className="w-[165px]"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <Input
            type="date"
            className="w-[165px]"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
          </>}
          {activeTab === "employees" && (
            <>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]" aria-label="Department">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(({ id, name }) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={employeeStatus} onValueChange={setEmployeeStatus}>
                <SelectTrigger className="w-[140px]" aria-label="Employee status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {activeTab === "bills" && (
            <Select value={billStatus} onValueChange={setBillStatus}>
              <SelectTrigger className="w-[140px]" aria-label="Bill status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        {activeTab === "employees" && departmentError && <p role="alert">Could not load departments.</p>}
        {invalidDates && <p role="alert" className="text-destructive">The end date must be on or after the start date.</p>}

        <TabsContent value="employees">
          <Card>
            <CardContent className="pt-6">
              <ReportTable
                columns={[
                  { key: "employee_id", label: "Employee ID" },
                  { key: "name", label: "Name", render: (r) => r.full_name || "-" },
                  { key: "department", label: "Department", render: (r) => r.department?.name || "-" },
                  { key: "position", label: "Position" },
                  { key: "hire_date", label: "Hire Date", render: (r) => r.date_hired ? format(new Date(r.date_hired), "MMM dd, yyyy") : "-" },
                  {
                    key: "status", label: "Status",
                    render: (r) => {
                       const s = statusMap[r.status] || { variant: "outline", label: r.status || "Unknown" }
                      return <Badge variant={s.variant}>{s.label}</Badge>
                    },
                  },
                ]}
                data={data?.employees || []}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="No employee records found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
              <ReportTable
                columns={[
                  { key: "name", label: "File Name", render: (r) => r.original_name || r.name || "-" },
                  { key: "type", label: "Type", render: (r) => <Badge variant="outline">{r.file_type || "-"}</Badge> },
                  { key: "size", label: "Size", render: (r) => r.file_size ? `${(r.file_size / 1024).toFixed(1)} KB` : "-" },
                  { key: "uploaded_by", label: "Uploaded By", render: (r) => r.creator?.name || "-" },
                  { key: "created_at", label: "Date", render: (r) => r.created_at ? format(new Date(r.created_at), "MMM dd, yyyy") : "-" },
                ]}
                data={data?.documents || []}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="No documents found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardContent className="pt-6">
              <ReportTable
                columns={[
                  { key: "name", label: "Bill Name" },
                  { key: "category", label: "Category", render: (r) => r.category?.name || "-" },
                  { key: "provider", label: "Provider" },
                  { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
                  { key: "due_date", label: "Due Date", render: (r) => r.due_date ? format(new Date(r.due_date), "MMM dd, yyyy") : "-" },
                  {
                    key: "status", label: "Status",
                    render: (r) => {
                       const s = statusMap[r.status] || { variant: "outline", label: r.status || "Unknown" }
                      return <Badge variant={s.variant}>{s.label}</Badge>
                    },
                  },
                ]}
                data={data?.bills || []}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="No bills found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              <ReportTable
                columns={[
                  { key: "created_at", label: "Timestamp", render: (r) => r.created_at ? format(new Date(r.created_at), "MMM dd, yyyy HH:mm") : "-" },
                  { key: "user", label: "User", render: (r) => r.user?.name || r.user_name || "-" },
                  { key: "module", label: "Module" },
                  { key: "action", label: "Action" },
                  { key: "description", label: "Description" },
                ]}
                data={data?.logs || []}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="No activity records found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
