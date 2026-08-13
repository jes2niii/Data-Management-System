import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import api from "@/lib/api"
import { useCurrency } from "@/hooks/useCurrency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, TrendingUp, Users, Plus, CheckCircle2, XCircle } from "lucide-react"

const statusColors = {
  Present: "success", Absent: "destructive", Late: "warning", "Half-day": "secondary",
  Leave: "info", Holiday: "outline",
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
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

  const { data: employeesData } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => api.get("/employees", { params: { per_page: 100 } }).then(r => r.data),
  })

  const attendances = attendanceData?.data?.data || []
  const statuses = statusesData?.data || []
  const departments = departmentsData?.data || []
  const employees = employeesData?.data?.data || []
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

  const RecordAttendanceForm = () => {
    const [records, setRecords] = useState(() => {
      const initial = []
      employees.forEach(emp => {
        const existing = attendances.find(a => a.employee_id === emp.id && a.date === selectedDate)
        initial.push({
          employee_id: emp.id,
          employee_name: emp.full_name || emp.name,
          date: selectedDate,
          status_id: existing?.status_id || statuses.find(s => s.code === "present")?.id || null,
          time_in: existing?.time_in || "",
          time_out: existing?.time_out || "",
          remarks: existing?.remarks || "",
        })
      })
      return initial
    })

    return (
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Record Attendance - {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="w-[180px]">Status</TableHead>
                  <TableHead className="w-[100px]">Time In</TableHead>
                  <TableHead className="w-[100px]">Time Out</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec, i) => (
                  <TableRow key={rec.employee_id}>
                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{rec.employee_name}</TableCell>
                    <TableCell>
                      <Select value={String(rec.status_id || "")} onValueChange={v => { const nr = [...records]; nr[i].status_id = Number(v); setRecords(nr) }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input className="h-8 text-xs" type="time" value={rec.time_in} onChange={e => { const nr = [...records]; nr[i].time_in = e.target.value; setRecords(nr) }} />
                        <div className="text-[10px] text-muted-foreground">7-11 AM</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input className="h-8 text-xs" type="time" value={rec.time_out} onChange={e => { const nr = [...records]; nr[i].time_out = e.target.value; setRecords(nr) }} />
                        <div className="text-[10px] text-muted-foreground">12-4 PM</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={rec.remarks} placeholder="Notes" onChange={e => { const nr = [...records]; nr[i].remarks = e.target.value; setRecords(nr) }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button onClick={() => recordMutation.mutate(records.map(r => ({
              employee_id: r.employee_id, date: r.date, status_id: r.status_id,
              time_in: r.time_in || null, time_out: r.time_out || null, remarks: r.remarks || null,
            })))} disabled={recordMutation.isPending}>
              {recordMutation.isPending ? "Saving..." : `Save ${records.length} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
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
        <Button onClick={handleRecordForToday}>
          <Plus className="mr-2 h-4 w-4" /> Record Attendance
        </Button>
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
                    <TableCell>{a.date}</TableCell>
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

      <RecordAttendanceForm />
    </div>
  )
}
