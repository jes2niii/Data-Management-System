import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"

function useSupplyChainData(endpoint, search, page) {
  return useQuery({
    queryKey: [endpoint, search, page],
    queryFn: () => api.get(`/${endpoint}`, { params: { search: search || undefined, per_page: 15, page } }).then(r => r.data),
  })
}

function CrudTable({ endpoint, columns, title, description, searchPlaceholder }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [stockOpen, setStockOpen] = useState(false)
  const [stockItem, setStockItem] = useState(null)
  const [stockType, setStockType] = useState("in")
  const [stockQty, setStockQty] = useState("")
  const [stockDate, setStockDate] = useState("")
  const qc = useQueryClient()
  const { data, isLoading } = useSupplyChainData(endpoint, search, page)
  const items = data?.data?.data || data?.data || []
  const totalPages = data?.data?.last_page || 1

  const mutation = useMutation({
    mutationFn: (payload) => editing ? api.put(`/${endpoint}/${editing.id}`, payload) : api.post(`/${endpoint}`, payload),
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Created")
      qc.invalidateQueries({ queryKey: [endpoint] })
      setOpen(false); setEditing(null); setForm({})
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/${endpoint}/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: [endpoint] }) },
  })
  const stockMutation = useMutation({
    mutationFn: ({ id, type, qty, date }) => {
      const payload = {}
      if (type === "in") { payload.qty_in = qty; payload.date_in = date || new Date().toISOString().slice(0,10) }
      else { payload.qty_out = qty; payload.date_out = date || new Date().toISOString().slice(0,10) }
      return api.put(`/${endpoint}/${id}`, payload)
    },
    onSuccess: () => {
      toast.success("Stock updated")
      qc.invalidateQueries({ queryKey: [endpoint] })
      setStockOpen(false)
      setStockQty("")
      setStockDate("")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Stock update failed"),
  })

  const handleEdit = (item) => { setEditing(item); setForm(item); setOpen(true) }
  const handleCreate = () => { setEditing(null); setForm({}); setOpen(true) }
  const handleSubmit = () => {
    const payload = { ...form }
    // Convert empty strings to null for dates
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null })
    mutation.mutate(payload)
  }
  const handleStock = (item, type) => { setStockItem(item); setStockType(type); setStockQty(""); setStockDate(new Date().toISOString().slice(0,10)); setStockOpen(true) }
  const handleStockSubmit = () => {
    if (!stockQty || parseFloat(stockQty) <= 0) { toast.error("Enter valid quantity"); return }
    stockMutation.mutate({ id: stockItem.id, type: stockType, qty: stockQty, date: stockDate })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={searchPlaceholder} className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Add</Button>
        </div>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {columns.map(col => <TableHead key={col.key} className={col.className}>{col.label}</TableHead>)}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
              : items.map(item => (
                <TableRow key={item.id} className={item.total_balance === 0 || item.total_balance === 0.00 ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  {columns.map(col => (
                    <TableCell key={col.key} className={col.cellClassName || "text-sm"}>
                      {col.render ? col.render(item) : (item[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Stock In" onClick={() => handleStock(item, "in")}><span className="text-emerald-600">+In</span></Button>
                      <Button variant="ghost" size="icon" title="Stock Out" onClick={() => handleStock(item, "out")}><span className="text-amber-600">-Out</span></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
        <Dialog open={stockOpen} onOpenChange={setStockOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="capitalize">Stock {stockType} — {stockItem?.description}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="Qty" /></div>
                <div className="space-y-1"><Label>{stockType === 'in' ? 'Date In' : 'Date Out'}</Label><Input type="date" value={stockDate} onChange={e => setStockDate(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Current balance: {stockItem?.total_balance ?? stockItem?.total_balance} • Will auto-calculate new total (BEG - OUT + IN)</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStockOpen(false)}>Cancel</Button>
              <Button onClick={handleStockSubmit} disabled={stockMutation.isPending}>{stockMutation.isPending ? "Saving..." : `Confirm ${stockType === 'in' ? 'Stock In' : 'Stock Out'}`}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} {title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {columns.filter(c => !["total_balance"].includes(c.key)).map(col => (
                <div key={col.key} className="space-y-1">
                  <Label>{col.label}</Label>
                  <Input value={form[col.key] ?? ""} onChange={e => setForm({ ...form, [col.key]: e.target.value })} placeholder={col.label} type={col.key.includes("date") ? "date" : col.key.includes("qty") || col.key.includes("balance") || col.key.includes("price") ? "number" : "text"} />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default function SupplyChainTabs() {
  const supplyColumns = [
    { key: "date", label: "DATE", render: (i) => i.date ? i.date.slice(0,10) : "—" },
    { key: "description", label: "DESCRIPTION" },
    { key: "beg_balance", label: "BEG. BAL." },
    { key: "unit", label: "UNIT" },
    { key: "unit_price", label: "UNIT PRICE" },
    { key: "date_out", label: "DATE OUT", render: (i) => i.date_out ? i.date_out.slice(0,10) : "—" },
    { key: "qty_out", label: "QTY" },
    { key: "date_in", label: "DATE IN", render: (i) => i.date_in ? i.date_in.slice(0,10) : "—" },
    { key: "qty_in", label: "QTY" },
    { key: "total_balance", label: "TOTAL BAL.", cellClassName: "font-bold text-center" },
    { key: "remarks", label: "REMARKS" },
  ]

  const uniformColumns = [
    { key: "date", label: "DATE", render: (i) => i.date ? i.date.slice(0,10) : "—" },
    { key: "description", label: "DESCRIPTION" },
    { key: "beg_balance", label: "BEG. BALANCE" },
    { key: "unit", label: "UNIT" },
    { key: "date_out", label: "DATE OUT", render: (i) => i.date_out ? i.date_out.slice(0,10) : "—" },
    { key: "qty_out", label: "QT" },
    { key: "date_in", label: "DATE IN", render: (i) => i.date_in ? i.date_in.slice(0,10) : "—" },
    { key: "qty_in", label: "QTY" },
    { key: "total_balance", label: "TOTAL BALANCE", cellClassName: "font-bold text-center" },
    { key: "remarks", label: "REMARKS" },
  ]

  const certColumns = [
    { key: "date", label: "DATE", render: (i) => i.date ? i.date.slice(0,10) : "—" },
    { key: "description", label: "DESCRIPTION" },
    { key: "beg_balance", label: "BEG. BALANCE" },
    { key: "unit", label: "UNIT" },
    { key: "tracking_no", label: "TRACKING NO." },
    { key: "date_out", label: "DATE OUT", render: (i) => i.date_out ? i.date_out.slice(0,10) : "—" },
    { key: "qty_out", label: "QTY" },
    { key: "tracking_no2", label: "TRACKING NO.2" },
    { key: "date_in", label: "DATE IN", render: (i) => i.date_in ? i.date_in.slice(0,10) : "—" },
    { key: "qty_in", label: "QTY2" },
    { key: "total_balance", label: "TOTAL BALANCE", cellClassName: "font-bold" },
    { key: "remarks", label: "REMARKS" },
  ]

  const individualColumns = [
    { key: "employee_name", label: "EMPLOYEE NAME" },
    { key: "department", label: "DEPARTMENT" },
    { key: "location", label: "LOCATION" },
    { key: "property_code", label: "PROPERTY CODE" },
    { key: "property_name", label: "PROPERTY NAME" },
    { key: "description", label: "DESCRIPTION" },
    { key: "serial_number", label: "SERIAL NUMBER" },
    { key: "date_received", label: "DATE RECEIVED", render: (i) => i.date_received ? i.date_received.slice(0,10) : "—" },
    { key: "remarks", label: "REMARKS" },
  ]

  const propertyColumns = [
    { key: "month_year", label: "MONTH/YEAR" },
    { key: "property_code", label: "PROPERTY CODE" },
    { key: "property_name", label: "PROPERTY NAME" },
    { key: "description", label: "DESCRIPTION" },
    { key: "serial_number", label: "SERIAL NUMBER" },
    { key: "date_checked", label: "DATE CHECKED", render: (i) => i.date_checked ? i.date_checked.slice(0,10) : "—" },
    { key: "status", label: "STATUS" },
  ]

  return (
    <Card className="mt-6 border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Supply Chain Management Department — 5-Type Inventory Monitoring</CardTitle>
        <CardDescription>All 5 Excel sheets merged • Main Supply Inventory is the primary (general inventory merged) • Every type now has Stock In / Stock Out</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="supply">
          <TabsList className="flex-wrap">
            <TabsTrigger value="supply">Supply Inventory (Main)</TabsTrigger>
            <TabsTrigger value="uniform">Uniform (Seatech/Dri-fit/Gloves)</TabsTrigger>
            <TabsTrigger value="certificate">Certificate & Receipt</TabsTrigger>
            <TabsTrigger value="individual">Individual Inventory</TabsTrigger>
            <TabsTrigger value="property">Property Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="supply" className="mt-4">
            <CrudTable endpoint="supply-inventories" columns={supplyColumns} title="Supply Inventory — Main (merged with general Inventory)" description="DATE | DESCRIPTION | BEG. BAL. | UNIT | UNIT PRICE | DATE OUT | QTY | DATE IN | QTY | TOTAL BAL. | REMARKS — red = 0 balance • Stock In/Out enabled" searchPlaceholder="Search CANDLE, BATTERY..." />
          </TabsContent>
          <TabsContent value="uniform" className="mt-4">
            <CrudTable endpoint="uniform-inventories" columns={uniformColumns} title="Seatech Uniform, Dri-fit & Gloves Inventory" description="BEG. BALANCE | DATE OUT/QT | DATE IN/QTY | TOTAL BALANCE — by size (S/M/L/XL etc.) • Stock In/Out enabled" searchPlaceholder="Search SEATECH UNIFORM, GLOVES..." />
          </TabsContent>
          <TabsContent value="certificate" className="mt-4">
            <CrudTable endpoint="certificate-inventories" columns={certColumns} title="Certificate & Receipt Inventory" description="TRACKING NO. | BEG. BALANCE | DATE OUT/QTY | DATE IN/QTY2 | TOTAL BALANCE • Stock In/Out enabled" searchPlaceholder="Search SECURITY CERT..." />
          </TabsContent>
          <TabsContent value="individual" className="mt-4">
            <CrudTable endpoint="individual-inventories" columns={individualColumns} title="Individual Inventory" description="EMPLOYEE NAME | DEPARTMENT | LOCATION | PROPERTY CODE/NAME | SERIAL | DATE RECEIVED — Stock In/Out enabled" searchPlaceholder="Search JESTONI, OFFICE TABLE..." />
          </TabsContent>
          <TabsContent value="property" className="mt-4">
            <CrudTable endpoint="property-summaries" columns={propertyColumns} title="Inventory Summary of Property/Items/Equipments" description="MONTH/YEAR | PROPERTY CODE | DATE CHECKED | STATUS (Good/Damaged/For Disposal/For Repair) • Stock In/Out enabled" searchPlaceholder="Search AIRCON, LR201..." />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
