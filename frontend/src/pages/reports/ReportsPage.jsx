import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import api from "@/lib/api"
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
  FileSpreadsheet, FileText, Printer, Users, File,
  Receipt, Activity,
} from "lucide-react"

const statusMap = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "destructive", label: "Inactive" },
  paid: { variant: "success", label: "Paid" },
  unpaid: { variant: "warning", label: "Unpaid" },
  overdue: { variant: "destructive", label: "Overdue" },
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
                {col.render ? col.render(row) : row[col.key] || "-"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("employees")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const { data: employeesData, isLoading: empLoading, isError: empError } = useQuery({
    queryKey: ["reports-employees", departmentFilter, statusFilter],
    enabled: activeTab === "employees",
    queryFn: () =>
      api.get("/reports/employees", {
        params: {
          department_id: departmentFilter !== "all" ? departmentFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      }).then((r) => r.data),
  })

  const { data: documentsData, isLoading: docLoading, isError: docError } = useQuery({
    queryKey: ["reports-documents", dateFrom, dateTo],
    enabled: activeTab === "documents",
    queryFn: () =>
      api.get("/reports/documents", {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      }).then((r) => r.data),
  })

  const { data: billsData, isLoading: billLoading, isError: billError } = useQuery({
    queryKey: ["reports-bills", dateFrom, dateTo, statusFilter],
    enabled: activeTab === "bills",
    queryFn: () =>
      api.get("/reports/bills", {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      }).then((r) => r.data),
  })

  const { data: activityData, isLoading: actLoading, isError: actError } = useQuery({
    queryKey: ["reports-activity", dateFrom, dateTo],
    enabled: activeTab === "activity",
    queryFn: () =>
      api.get("/reports/activity", {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      }).then((r) => r.data),
  })

  const handlePrint = () => window.print()

  const handleExport = async (format) => {
    const endpoints = {
      employees: "/reports/employees/export",
      documents: "/reports/documents/export",
      bills: "/reports/bills/export",
      activity: "/reports/activity/export",
    }
    try {
      const response = await api.get(endpoints[activeTab], {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          format,
        },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${activeTab}-report.${format === "csv" ? "csv" : format === "pdf" ? "pdf" : "xlsx"}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      // silent
    }
  }

  const employees = employeesData?.data?.employees || []
  const documents = documentsData?.data?.documents || []
  const bills = billsData?.data?.bills || []
  const activities = activityData?.data?.logs || activityData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and export reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <FileText className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" /> Employees
          </TabsTrigger>
          <TabsTrigger value="documents">
            <File className="mr-2 h-4 w-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="bills">
            <Receipt className="mr-2 h-4 w-4" /> Bills
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" /> Activity
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 my-4">
          <Input
            type="date"
            className="w-[165px]"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From date"
          />
          <Input
            type="date"
            className="w-[165px]"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To date"
          />
          {activeTab === "employees" && (
            <>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

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
                      const s = statusMap[r.status] || statusMap.active
                      return <Badge variant={s.variant}>{s.label}</Badge>
                    },
                  },
                ]}
                data={employees}
                isLoading={empLoading}
                isError={empError}
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
                data={documents}
                isLoading={docLoading}
                isError={docError}
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
                  { key: "amount", label: "Amount", render: (r) => `$${Number(r.amount).toFixed(2)}` },
                  { key: "due_date", label: "Due Date", render: (r) => r.due_date ? format(new Date(r.due_date), "MMM dd, yyyy") : "-" },
                  {
                    key: "status", label: "Status",
                    render: (r) => {
                      const s = statusMap[r.status] || statusMap.unpaid
                      return <Badge variant={s.variant}>{s.label}</Badge>
                    },
                  },
                ]}
                data={bills}
                isLoading={billLoading}
                isError={billError}
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
                data={activities}
                isLoading={actLoading}
                isError={actError}
                emptyMessage="No activity records found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
