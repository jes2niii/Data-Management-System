import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { useCurrency } from "@/hooks/useCurrency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import {
  Plus, Pencil, Trash2, History, BookOpen, GraduationCap, Search, ListChecks, Clock, DollarSign
} from "lucide-react"

function fmtPrice(value, formatCurrency) {
  if (value == null) return "—"
  return formatCurrency(value)
}
function fmtDate(v) {
  if (!v) return "—"
  try { return format(new Date(v), "MMM dd, yyyy HH:mm") } catch { return String(v).slice(0,16) }
}

// Trainings Management Tab
function TrainingsTab() {
  const qc = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTraining, setHistoryTraining] = useState(null)
  const [form, setForm] = useState({ name: "", code: "", description: "", fee: "", price: "", duration: "", category: "", category_id: "", slug: "", is_active: true })

  const { data, isLoading } = useQuery({
    queryKey: ["trainings", search],
    queryFn: () => api.get("/trainings", { params: { search: search || undefined, per_page: 50 } }).then(r => r.data),
  })
  // Handle both paginated and non-paginated response
  const trainings = data?.data?.data || data?.data || []

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["training-price-history", historyTraining?.id],
    queryFn: () => api.get(`/trainings/${historyTraining.id}/price-history`).then(r => r.data),
    enabled: !!historyTraining?.id && historyOpen,
  })
  const priceLogs = historyData?.data?.data || historyData?.data || []

  const mutation = useMutation({
    mutationFn: (payload) => edit ? api.put(`/trainings/${edit.id}`, payload) : api.post("/trainings", payload),
    onSuccess: () => {
      toast.success(edit ? "Training updated" : "Training created")
      qc.invalidateQueries({ queryKey: ["trainings"] })
      setOpen(false); setEdit(null)
      setForm({ name: "", code: "", description: "", price: "", duration: "", category: "", is_active: true })
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/trainings/${id}`),
    onSuccess: () => { toast.success("Training deleted"); qc.invalidateQueries({ queryKey: ["trainings"] }) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const handleEdit = (t) => {
    setEdit(t)
    setForm({
      name: t.name || t.title || "",
      code: t.code || "",
      description: t.description || "",
      fee: t.fee != null ? String(t.fee) : t.price != null ? String(t.price) : "",
      price: t.price != null ? String(t.price) : t.fee != null ? String(t.fee) : "",
      duration: t.duration || "",
      category: t.category || "",
      category_id: t.category_id ? String(t.category_id) : "",
      slug: t.slug || "",
      is_active: !!t.is_active,
    })
    setOpen(true)
  }

  const handleCreate = () => {
    setEdit(null)
    setForm({ name: "", code: "", description: "", fee: "", price: "", duration: "", category: "", category_id: "", slug: "", is_active: true })
    setOpen(true)
  }

  const handleSubmit = () => {
    const effectiveFee = form.fee || form.price
    const effectiveName = form.name
    if (!effectiveName.trim() || !effectiveFee) { toast.error("Name and fee/price are required"); return }
    mutation.mutate({
      name: effectiveName,
      title: effectiveName,
      code: form.code || null,
      slug: form.slug || null,
      description: form.description || null,
      fee: parseFloat(effectiveFee) || 0,
      price: parseFloat(effectiveFee) || 0,
      duration: form.duration || null,
      category: form.category || null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      is_active: form.is_active,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search trainings..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Add Training</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : trainings.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No trainings found. Click Add Training to create.</TableCell></TableRow>
            ) : (
              trainings.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div>{t.title || t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.slug || ""}</div>
                    {t.description && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{t.description}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{t.code || "—"}</TableCell>
                  <TableCell>{t.category || t.category_id || "—"}</TableCell>
                  <TableCell>{t.duration || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtPrice(t.fee ?? t.price, formatCurrency)}</TableCell>
                  <TableCell>{t.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Price History" onClick={() => { setHistoryTraining(t); setHistoryOpen(true) }}><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? "Edit Training" : "Add Training"}</DialogTitle>
            <DialogDescription>{edit ? "Update training details. Price change will be logged for backtracking." : "Create a new training. It will appear in Training Monitoring dropdown."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Training Name *</Label>
              <Input placeholder="e.g., Medical First Aid, Ship Security Officer" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input placeholder="e.g., MEFA, MECA, SSO, SAT-SDSD" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fee / Price *</Label>
                <Input type="number" step="0.01" placeholder="e.g., 1700.00, 2800.00, 1100.00" value={form.fee || form.price} onChange={e => setForm({ ...form, fee: e.target.value, price: e.target.value })} />
                {edit && <p className="text-xs text-amber-600">Changing fee will create a log for backtracking.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id ? String(form.category_id) : form.category}
                  onValueChange={v => {
                    const map = { "3": "STCW", "4": "IN HOUSE", "5": "DOMESTIC", "STCW": "3", "IN HOUSE": "4", "DOMESTIC": "5" }
                    // Allow selecting by ID or name
                    if (["3","4","5"].includes(v)) {
                      setForm({ ...form, category_id: v, category: map[v] })
                    } else {
                      setForm({ ...form, category: v, category_id: map[v] || "" })
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">STCW (ID 3)</SelectItem>
                    <SelectItem value="4">IN HOUSE (ID 4)</SelectItem>
                    <SelectItem value="5">DOMESTIC (ID 5)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">STCW / IN HOUSE / DOMESTIC from provided categories</p>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input placeholder="e.g., 4 days, 1 day, 14 days" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category ID</Label>
                <Input type="number" placeholder="e.g., 3 (STCW), 4 (IN HOUSE), 5 (DOMESTIC)" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} />
                <p className="text-xs text-muted-foreground">Must be 3, 4 or 5 per provided categories</p>
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input placeholder="e.g., medical-first-aid, ship-security-officer" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Brief description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="t_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <Label htmlFor="t_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : edit ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Price History — {historyTraining?.name}</DialogTitle>
            <DialogDescription>Backtracking: shows price at different times. Monitoring records keep snapshot fee at creation, even after price changes.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {historyLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : priceLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No price changes yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead className="text-right">Old Price</TableHead>
                    <TableHead className="text-right">New Price</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">{fmtDate(log.created_at)}</TableCell>
                      <TableCell className="text-sm">{log.changer?.name || "System"}</TableCell>
                      <TableCell className="text-right font-mono">{fmtPrice(log.old_price ?? log.old_training_price, formatCurrency)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmtPrice(log.new_price ?? log.new_training_price, formatCurrency)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Training Details Tab
function TrainingDetailsTab() {
  const qc = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [search, setSearch] = useState("")
  const [trainingFilter, setTrainingFilter] = useState("all")
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ training_id: "", title: "", description: "", price: "", duration: "", manner_of_conduct: "", requirements: "", is_active: true })

  const { data: trainingsData } = useQuery({
    queryKey: ["trainings-all"],
    queryFn: () => api.get("/trainings", { params: { per_page: 100 } }).then(r => r.data),
  })
  const trainings = trainingsData?.data?.data || trainingsData?.data || []

  const { data, isLoading } = useQuery({
    queryKey: ["training-details", search, trainingFilter],
    queryFn: () => api.get("/training-details", { params: { search: search || undefined, training_id: trainingFilter !== "all" ? trainingFilter : undefined, per_page: 50 } }).then(r => r.data),
  })
  const details = data?.data?.data || data?.data || []

  const mutation = useMutation({
    mutationFn: (payload) => edit ? api.put(`/training-details/${edit.id}`, payload) : api.post("/training-details", payload),
    onSuccess: () => {
      toast.success(edit ? "Detail updated" : "Detail created")
      qc.invalidateQueries({ queryKey: ["training-details"] })
      setOpen(false); setEdit(null)
      setForm({ training_id: "", title: "", description: "", price: "", duration: "", manner_of_conduct: "", requirements: "", is_active: true })
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/training-details/${id}`),
    onSuccess: () => { toast.success("Detail deleted"); qc.invalidateQueries({ queryKey: ["training-details"] }) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const handleEdit = (d) => {
    setEdit(d)
    setForm({
      training_id: String(d.training_id || ""),
      title: d.title || "",
      description: d.description || "",
      price: d.price != null ? String(d.price) : "",
      duration: d.duration || "",
      manner_of_conduct: d.manner_of_conduct || "",
      requirements: d.requirements || "",
      is_active: !!d.is_active,
    })
    setOpen(true)
  }

  const handleCreate = () => {
    setEdit(null)
    setForm({ training_id: trainingFilter !== "all" ? trainingFilter : "", title: "", description: "", price: "", duration: "", manner_of_conduct: "", requirements: "", is_active: true })
    setOpen(true)
  }

  const handleSubmit = () => {
    if (!form.training_id || !form.title || !form.price) { toast.error("Training, Title and Price are required"); return }
    mutation.mutate({
      training_id: parseInt(form.training_id),
      title: form.title,
      description: form.description || null,
      price: parseFloat(form.price) || 0,
      duration: form.duration || null,
      manner_of_conduct: form.manner_of_conduct || null,
      requirements: form.requirements || null,
      is_active: form.is_active,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search details..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-[220px]">
          <Select value={trainingFilter} onValueChange={setTrainingFilter}>
            <SelectTrigger><SelectValue placeholder="All Trainings" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trainings</SelectItem>
              {trainings.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Add Detail</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Training</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Manner</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : details.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No training details found.</TableCell></TableRow>
            ) : (
              details.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.training?.name || trainings.find(t => String(t.id)===String(d.training_id))?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{d.title}</div>
                    {d.description && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{d.description}</div>}
                  </TableCell>
                  <TableCell>{d.duration || "—"}</TableCell>
                  <TableCell>{d.manner_of_conduct || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtPrice(d.price, formatCurrency)}</TableCell>
                  <TableCell>{d.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? "Edit Training Detail" : "Add Training Detail"}</DialogTitle>
            <DialogDescription>Details will be used to auto-fill monitoring and price changes are logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Training *</Label>
              <Select value={form.training_id} onValueChange={v => setForm({ ...form, training_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select training" /></SelectTrigger>
                <SelectContent>
                  {trainings.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} — {fmtPrice(t.price, formatCurrency)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g., Safety Training for Personnel Providing Direct Service (STPPDS)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input type="number" step="0.01" placeholder="e.g., 1400.00, 1700.00, 800.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                {edit && <p className="text-xs text-amber-600">Price change will be logged for backtracking.</p>}
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input placeholder="e.g., 1 day, 2 days, 4 days, 14 days" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manner of Conduct</Label>
              <Input placeholder="e.g., Face to Face, CBT, Practical" value={form.manner_of_conduct} onChange={e => setForm({ ...form, manner_of_conduct: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              <Input placeholder="e.g., Valid ID" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} id="detail_active" />
              <Label htmlFor="detail_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : edit ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Price Logs Tab
function PriceLogsTab() {
  const { format: formatCurrency } = useCurrency()
  const [trainingFilter, setTrainingFilter] = useState("all")

  const { data: trainingsData } = useQuery({
    queryKey: ["trainings-all-logs"],
    queryFn: () => api.get("/trainings", { params: { per_page: 100 } }).then(r => r.data),
  })
  const trainings = trainingsData?.data?.data || trainingsData?.data || []

  const { data, isLoading } = useQuery({
    queryKey: ["training-price-logs", trainingFilter],
    queryFn: () => api.get("/training-price-logs", { params: { training_id: trainingFilter !== "all" ? trainingFilter : undefined, per_page: 50 } }).then(r => r.data),
  })
  const logs = data?.data?.data || data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-[240px]">
          <Select value={trainingFilter} onValueChange={setTrainingFilter}>
            <SelectTrigger><SelectValue placeholder="All Trainings" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trainings</SelectItem>
              {trainings.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{logs.length} log entries — for backtracking price at different times</div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Training</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Old Price</TableHead>
              <TableHead className="text-right">New Price</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No price logs yet. Update a training price to generate logs.</TableCell></TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(log.created_at)}</TableCell>
                  <TableCell className="font-medium">{log.training?.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{log.source.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{fmtPrice(log.old_price ?? log.old_training_price, formatCurrency)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtPrice(log.new_price ?? log.new_training_price, formatCurrency)}</TableCell>
                  <TableCell className="text-sm">{log.changer?.name || "System"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{log.notes || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function TrainingsSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Trainings Management</CardTitle>
        <CardDescription>Manage Trainings and Training Details. Prices auto-fill in Monitoring and changes are logged for backtracking.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trainings">
          <TabsList className="flex-wrap">
            <TabsTrigger value="trainings" className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Trainings</TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> Training Details</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1"><Clock className="h-4 w-4" /> Price Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="trainings" className="pt-4"><TrainingsTab /></TabsContent>
          <TabsContent value="details" className="pt-4"><TrainingDetailsTab /></TabsContent>
          <TabsContent value="logs" className="pt-4"><PriceLogsTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
