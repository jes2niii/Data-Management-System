import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format, parse } from "date-fns"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Calendar, Clock, Users, Plus, CheckCircle2, XCircle } from "lucide-react"

const statusColors = {
  Present: "success", Absent: "destructive", Late: "warning", "Half-day": "secondary",
  Leave: "info", Holiday: "outline",
}

const fmtDate = (value) => {
  const d = String(value || "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return value || "—"
  return format(parse(d, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
}

function RecordAttendanceDialog({ onOpenChange, selectedDate, statuses, onSave, isPending }) {
  const [edits, setEdits] = useState({})
  const { data, isFetching, isFetchedAfterMount, isError, refetch } = useQuery({
    queryKey: ["attendance-recording", selectedDate],
    queryFn: () => api.get("/attendances/recording", { params: { date: selectedDate } }).then((response) => response.data.data),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const isLoading = isFetching && !isFetchedAfterMount
  const existing = new Map((data?.records || []).map((record) => [`${record.employee_id}-${record.session}`, record]))
  const records = (data?.employees || []).flatMap((employee) => ["morning", "afternoon"].map((session) => {
    const key = `${employee.id}-${session}`
    const saved = existing.get(key)
    return {
      key, employee_id: employee.id, employee_name: employee.full_name, session, date: selectedDate,
      expected_version: saved?.expected_version ?? null,
      original: {
        status_id: saved?.status_id ?? null,
        time_in: saved?.time_in?.slice(0, 5) || null,
        time_out: saved?.time_out?.slice(0, 5) || null,
        remarks: saved?.remarks ?? null,
      },
    }
  }))
  const updateField = (record, field, value) => setEdits((current) => {
    const next = { ...current }
    const changes = { ...next[record.key] }
    if (record.original[field] === value) delete changes[field]
    else changes[field] = value
    if (Object.keys(changes).length) next[record.key] = changes
    else delete next[record.key]
    return next
  })
  const changed = records.filter((record) => edits[record.key])

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Record Attendance - {fmtDate(selectedDate)}</DialogTitle>
        </DialogHeader>
        {isLoading ? <p role="status">Loading attendance records…</p> : isError ? (
          <p role="alert">Could not load the attendance snapshot. <Button variant="outline" onClick={() => refetch()}>Retry</Button></p>
        ) : <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="w-[110px]">Session</TableHead>
                <TableHead className="w-[180px]">Status</TableHead>
                <TableHead className="w-[100px]">Time In</TableHead>
                <TableHead className="w-[100px]">Time Out</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec, i) => {
                const values = { ...rec.original, ...edits[rec.key] }
                return (
                <TableRow key={`${rec.employee_id}-${rec.session}`}>
                  <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{rec.employee_name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={rec.session === "morning" ? "info" : "secondary"} className="text-[10px]">{rec.session === "morning" ? "Morning" : "Afternoon"}</Badge>
                      <div className="text-[10px] text-muted-foreground">{rec.session === "morning" ? "AM" : "PM"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={String(values.status_id ?? "none")} onValueChange={v => updateField(rec, "status_id", v === "none" ? null : Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not recorded</SelectItem>
                        {statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input className="h-8 text-xs" type="time" value={values.time_in || ""} onChange={e => updateField(rec, "time_in", e.target.value || null)} />
                      <div className="text-[10px] text-muted-foreground">{rec.session === "morning" ? "7-11 AM" : "8 AM-12 PM"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input className="h-8 text-xs" type="time" value={values.time_out || ""} onChange={e => updateField(rec, "time_out", e.target.value || null)} />
                      <div className="text-[10px] text-muted-foreground">{rec.session === "morning" ? "12-4 PM" : "1-5 PM"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-xs" value={values.remarks || ""} placeholder="Notes" onChange={e => updateField(rec, "remarks", e.target.value || null)} />
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>}
        {changed.length > 500 && <p role="alert">Save no more than 500 changed sessions per batch.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(changed.map(({ key, employee_id, date, session, expected_version }) => ({
            employee_id, date, session, expected_version, ...edits[key],
          })))} disabled={isPending || isLoading || isError || changed.length === 0 || changed.length > 500}>
            {isPending ? "Saving..." : `Save ${changed.length} Changes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canRecord = hasPermission(user, "employees.create") && hasPermission(user, "employees.update")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [departmentId, setDepartmentId] = useState("all")
  const [statusId, setStatusId] = useState("all")
  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["attendances", date, from, to, departmentId, statusId],
    queryFn: () => api.get("/attendances", {
      params: { date: date || undefined, from: from || undefined, to: to || undefined, department_id: departmentId !== "all" ? departmentId : undefined, status_id: statusId !== "all" ? statusId : undefined, per_page: 50 },
    }).then(r => r.data),
  })

  const { data: statusesData } = useQuery({
    queryKey: ["attendance-statuses"],
    queryFn: () => api.get("/attendance-statuses").then(r => r.data),
  })

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then(r => r.data),
  })

  const { data: summaryData } = useQuery({
    queryKey: ["attendance-summary", from, to],
    queryFn: () => api.get("/attendances/summary", { params: { from: from || undefined, to: to || undefined } }).then(r => r.data),
  })

  const attendances = attendanceData?.data?.data || []
  const statuses = statusesData?.data || []
  const departments = departmentsData?.data || []
  const summary = summaryData?.data?.summary || {}

  const recordMutation = useMutation({
    mutationFn: (records) => api.post("/attendances", { records }),
    onSuccess: () => {
      toast.success("Attendance recorded")
      queryClient.invalidateQueries({ queryKey: ["attendances"] })
      queryClient.invalidateQueries({ queryKey: ["attendance-summary"] })
      setRecordOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const handleRecordForToday = () => {
    setSelectedDate(date)
    setRecordOpen(true)
  }

  const presentCount = attendances.filter(a => a.status?.code === "present").length
  const absentCount = attendances.filter(a => a.status?.code === "absent").length
  const lateCount = attendances.filter(a => a.status?.code === "late").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Monitoring</h1>
          <p className="text-muted-foreground">Track and manage employee attendance</p>
        </div>
        {canRecord && <Button onClick={handleRecordForToday} disabled={!date}>
          <Plus className="mr-2 h-4 w-4" /> Record Attendance
        </Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Records</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total || attendances.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Present</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{presentCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500" /> Absent</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{absentCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-500" /> Late</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{lateCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input className="h-8 text-sm w-[140px]" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input className="h-8 text-sm w-[140px]" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input className="h-8 text-sm w-[140px]" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-8 text-sm w-[180px]"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger className="h-8 text-sm w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No attendance records. Click "Record Attendance" to add.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Session</TableHead>
                  <TableHead className="text-center">Time In</TableHead>
                  <TableHead className="text-center">Time Out</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{a.employee?.full_name || a.employee?.name || "—"}</TableCell>
                    <TableCell>{a.employee?.department?.name || "—"}</TableCell>
                    <TableCell>{fmtDate(a.date)}</TableCell>
                    <TableCell className="text-center">
                      {a.session ? <Badge variant="secondary" className="text-[10px]">{a.session === "morning" ? "Morning" : "Afternoon"}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">{a.time_in || "—"}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{a.time_out || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusColors[a.status?.name] || "outline"}>{a.status?.name || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {recordOpen && <RecordAttendanceDialog
        onOpenChange={setRecordOpen}
        selectedDate={selectedDate}
        statuses={statuses}
        onSave={(records) => recordMutation.mutate(records)}
        isPending={recordMutation.isPending}
      />}
    </div>
  )
}
