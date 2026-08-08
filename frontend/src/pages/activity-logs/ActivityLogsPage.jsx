import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card, CardContent, CardHeader,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Search, ChevronLeft, ChevronRight, Eye, FileDown,
} from "lucide-react"

const statusMap = {
  success: { variant: "success", label: "Success" },
  failed: { variant: "destructive", label: "Failed" },
  warning: { variant: "warning", label: "Warning" },
  info: { variant: "default", label: "Info" },
}

export default function ActivityLogsPage() {
  const [search, setSearch] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  const perPage = 15

  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity-logs", search, moduleFilter, actionFilter, statusFilter, dateFrom, dateTo, page],
    queryFn: () =>
      api.get("/activity-logs", {
        params: {
          search,
          module: moduleFilter !== "all" ? moduleFilter : undefined,
          action: actionFilter !== "all" ? actionFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          per_page: perPage,
        },
      }).then((r) => r.data),
  })

  const handleExport = async () => {
    try {
      const response = await api.get("/activity-logs/export", {
        params: {
          search,
          module: moduleFilter !== "all" ? moduleFilter : undefined,
          action: actionFilter !== "all" ? actionFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      // silent fail
    }
  }

  const logs = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">Monitor system-wide activities and changes</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileDown className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
                <SelectItem value="files">Files</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="forms">Forms</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="download">Download</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[155px]"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              placeholder="From"
            />
            <Input
              type="date"
              className="w-[155px]"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              placeholder="To"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">Failed to load activity logs.</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No activity logs found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const st = statusMap[log.status] || statusMap.info
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {log.created_at
                            ? format(new Date(log.created_at), "MMM dd, yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.user?.name || log.user_name || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.module || "-"}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.action || "-"}</TableCell>
                        <TableCell className="max-w-[250px] truncate">
                          {log.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {(log.old_values || log.new_values) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedLog(log); setDetailOpen(true) }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Activity Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLog && (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">User:</span>
                  <span>{selectedLog.user?.name || selectedLog.user_name || "System"}</span>
                  <span className="text-muted-foreground">Module:</span>
                  <span>{selectedLog.module}</span>
                  <span className="text-muted-foreground">Action:</span>
                  <span className="capitalize">{selectedLog.action}</span>
                  <span className="text-muted-foreground">Status:</span>
                  <span>{selectedLog.status}</span>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>
                    {selectedLog.created_at
                      ? format(new Date(selectedLog.created_at), "PPpp")
                      : "-"}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedLog.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm border rounded-md p-3 bg-muted/30">{selectedLog.description}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.old_values && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Old Values</p>
                      <pre className="text-xs border rounded-md p-3 bg-muted/30 overflow-x-auto whitespace-pre-wrap">
                        {typeof selectedLog.old_values === "object"
                          ? JSON.stringify(selectedLog.old_values, null, 2)
                          : selectedLog.old_values}
                      </pre>
                    </div>
                  )}
                  {selectedLog.new_values && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">New Values</p>
                      <pre className="text-xs border rounded-md p-3 bg-muted/30 overflow-x-auto whitespace-pre-wrap">
                        {typeof selectedLog.new_values === "object"
                          ? JSON.stringify(selectedLog.new_values, null, 2)
                          : selectedLog.new_values}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
