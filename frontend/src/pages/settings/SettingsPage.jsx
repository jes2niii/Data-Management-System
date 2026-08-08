import { useState, useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Camera, Save, Plus, Pencil, Trash2 } from "lucide-react"
import RolesPermissionsPage from "@/pages/roles/RolesPermissionsPage"

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get("tab") || "general"
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  })

  const settings = settingsData?.data || settingsData || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure system settings</p>
      </div>

      {activeTab === "general" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CompanyProfileSection settings={settings} />
          <SystemPreferencesSection settings={settings} />
        </div>
      )}

      {activeTab === "email" && <EmailSettingsSection settings={settings} />}

      {activeTab === "categories" && <CategoriesManagement />}

      {activeTab === "roles" && <RolesPermissionsPage />}
    </div>
  )
}

function CompanyProfileSection({ settings }) {
  const fileInputRef = useRef(null)
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [form, setForm] = useState({
    company_name: settings?.company_name || "",
    company_address: settings?.company_address || "",
    company_email: settings?.company_email || "",
    company_phone: settings?.company_phone || "",
  })

  useEffect(() => {
    setForm({
      company_name: settings?.company_name || "",
      company_address: settings?.company_address || "",
      company_email: settings?.company_email || "",
      company_phone: settings?.company_phone || "",
    })
    setLogoPreview(settings?.company_logo || null)
  }, [settings])

  const mutation = useMutation({
    mutationFn: (formData) => api.post("/settings/company-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
    onSuccess: () => toast.success("Company profile updated"),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => formData.append(k, v))
    if (logo) formData.append("logo", logo)
    mutation.mutate(formData)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>Manage company information and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 rounded-lg">
                <AvatarImage src={logoPreview || ""} />
                <AvatarFallback className="rounded-lg text-xl">
                  {(form.company_name || "C").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.company_address}
              onChange={(e) => setForm({ ...form, company_address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Support Email</Label>
              <Input
                id="email"
                type="email"
                value={form.company_email}
                onChange={(e) => setForm({ ...form, company_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.company_phone}
                onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}

function SystemPreferencesSection({ settings }) {
  const [form, setForm] = useState({
    timezone: settings?.timezone || "Asia/Manila",
    currency: settings?.currency || "PHP",
    date_format: settings?.date_format || "Y-m-d",
  })

  useEffect(() => {
    setForm({
      timezone: settings?.timezone || "UTC",
      currency: settings?.currency || "USD",
      date_format: settings?.date_format || "MM/DD/YYYY",
    })
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => api.put("/settings/preferences", data),
    onSuccess: () => toast.success("Preferences updated"),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
          <CardDescription>Timezone, currency and date format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm({ ...form, timezone: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                <SelectItem value="America/Chicago">Central (US)</SelectItem>
                <SelectItem value="America/Denver">Mountain (US)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Manila">Manila (Philippines)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                <SelectItem value="Asia/Kolkata">Kolkata</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => setForm({ ...form, currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="PHP">PHP (&#8369;)</SelectItem>
                <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                <SelectItem value="GBP">GBP (&pound;)</SelectItem>
                <SelectItem value="JPY">JPY (&yen;)</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select
              value={form.date_format}
              onValueChange={(v) => setForm({ ...form, date_format: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}

function EmailSettingsSection({ settings }) {
  const [form, setForm] = useState({
    smtp_host: settings?.smtp_host || "",
    smtp_port: settings?.smtp_port || "",
    smtp_username: settings?.smtp_username || "",
    smtp_password: settings?.smtp_password || "",
    smtp_encryption: settings?.smtp_encryption || "tls",
    from_address: settings?.from_address || "",
    from_name: settings?.from_name || "",
  })

  useEffect(() => {
    setForm({
      smtp_host: settings?.smtp_host || "",
      smtp_port: settings?.smtp_port || "",
      smtp_username: settings?.smtp_username || "",
      smtp_password: settings?.smtp_password || "",
      smtp_encryption: settings?.smtp_encryption || "tls",
      from_address: settings?.from_address || "",
      from_name: settings?.from_name || "",
    })
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => api.put("/settings/email", data),
    onSuccess: () => toast.success("Email settings updated"),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Email SMTP Settings</CardTitle>
          <CardDescription>Configure outbound email server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                value={form.smtp_port}
                onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                placeholder="587"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_username">Username</Label>
              <Input
                id="smtp_username"
                value={form.smtp_username}
                onChange={(e) => setForm({ ...form, smtp_username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">Password</Label>
              <Input
                id="smtp_password"
                type="password"
                value={form.smtp_password}
                onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Encryption</Label>
            <Select
              value={form.smtp_encryption}
              onValueChange={(v) => setForm({ ...form, smtp_encryption: v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_name">From Name</Label>
              <Input
                id="from_name"
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_address">From Address</Label>
              <Input
                id="from_address"
                type="email"
                value={form.from_address}
                onChange={(e) => setForm({ ...form, from_address: e.target.value })}
                placeholder="noreply@company.com"
              />
            </div>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}

const categoryEndpoints = {
  "Bill Categories": { endpoint: "/bill-categories", label: "Bill Category" },
  "Form Categories": { endpoint: "/form-categories", label: "Form Category" },
  "Document Categories": { endpoint: "/document-categories", label: "Document Category" },
  "Folder Categories": { endpoint: "/folder-categories", label: "Folder Category" },
  "Emp. Attach. Categories": { endpoint: "/employee-attachment-categories", label: "Attachment Category" },
}

function CategoriesManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <CardDescription>Manage all system categories</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="Bill Categories">
          <TabsList className="flex-wrap">
            {Object.keys(categoryEndpoints).map((n) => <TabsTrigger key={n} value={n}>{n}</TabsTrigger>)}
          </TabsList>
          {Object.entries(categoryEndpoints).map(([n, c]) => (
            <TabsContent key={n} value={n}><CategoryTable endpoint={c.endpoint} label={c.label} /></TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function CategoryTable({ endpoint, label }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [n, setN] = useState("")
  const [d, setD] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => api.get(endpoint).then((r) => r.data),
  })
  const items = data?.data || []

  const m = useMutation({
    mutationFn: (fd) => edit ? api.put(`${endpoint}/${edit.id}`, fd) : api.post(endpoint, fd),
    onSuccess: () => {
      toast.success(edit ? `${label} updated` : `${label} created`)
      qc.invalidateQueries({ queryKey: [endpoint] })
      setOpen(false); setEdit(null); setN(""); setD("")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => { toast.success(`${label} deleted`); qc.invalidateQueries({ queryKey: [endpoint] }) },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{items.length} categories</span>
        <Button size="sm" onClick={() => { setEdit(null); setN(""); setD(""); setOpen(true) }}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {isLoading ? <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
          : items.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No categories</TableCell></TableRow>
          : items.map((it) => (
            <TableRow key={it.id}>
              <TableCell className="font-medium">{it.name}</TableCell>
              <TableCell className="text-muted-foreground">{it.description || "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(it); setN(it.name); setD(it.description || ""); setOpen(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? `Edit ${label}` : `Add ${label}`}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={n} onChange={(e) => setN(e.target.value)} autoFocus /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={d} onChange={(e) => setD(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!n.trim() || m.isPending} onClick={() => m.mutate({ name: n, description: d })}>
              {m.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
