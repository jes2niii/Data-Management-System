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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Camera, Save, Plus, Pencil, Trash2, Palette, Sun, Moon, Monitor, Layout, Zap, Globe, Bell, Check, X } from "lucide-react"
import { resolveStorageUrl } from "@/hooks/useBranding"
import RolesPermissionsPage from "@/pages/roles/RolesPermissionsPage"
import TrainingsSettings from "./TrainingsSettings"
import { useLanguage } from "@/contexts/LanguageContext"
import { setLanguage as setLangStorage, getTranslation } from "@/lib/i18n"
import { useAuth } from "@/contexts/AuthContext"
import AccessMessage from "@/components/layout/AccessMessage"
import { canOpenSettingsTab, settingsTabFor } from "@/lib/access"

export default function SettingsPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const activeTab = settingsTabFor(user, searchParams.get("tab"))
  const allowed = canOpenSettingsTab(user, activeTab)
  const needsSettings = allowed && ["general", "email"].includes(activeTab)
  const { data: settingsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings"],
    enabled: needsSettings,
    queryFn: () => api.get("/settings").then((r) => r.data),
  })

  const settings = settingsData?.data || settingsData || {}
  if (!allowed) return <AccessMessage settings />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure system settings</p>
      </div>

      {needsSettings && isLoading && <p role="status" className="text-muted-foreground">Loading settings…</p>}
      {needsSettings && isError && <div role="alert" className="space-y-2">
        <p>Could not load settings.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>}

      {activeTab === "general" && !isLoading && !isError && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CompanyProfileSection settings={settings} />
          <SystemPreferencesSection settings={settings} />
        </div>
      )}

      {activeTab === "email" && !isLoading && !isError && <EmailSettingsSection settings={settings} />}

      {activeTab === "categories" && <CategoriesManagement />}

      {activeTab === "roles" && <RolesPermissionsPage />}

      {activeTab === "trainings" && <TrainingsSettings />}

      {activeTab === "personalization" && <PersonalizationSection />}

      {activeTab === "reset" && <ResetDataSection />}
    </div>
  )
}

function CompanyProfileSection({ settings }) {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
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
    setLogoPreview(resolveStorageUrl(settings?.company_logo_url || settings?.company_logo) || null)
    setLogo(null)
    setRemoveLogo(false)
  }, [settings])

  // Revoke blob preview URLs to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const mutation = useMutation({
    mutationFn: (formData) => api.post("/settings/company-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
    onSuccess: () => {
      toast.success("Company profile updated — logo applied across the system")
      qc.invalidateQueries({ queryKey: ["settings"] })
      qc.invalidateQueries({ queryKey: ["branding"] })
      window.dispatchEvent(new Event("branding-changed"))
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ""))
    if (logo) formData.append("logo", logo)
    if (removeLogo) formData.append("remove_logo", "1")
    mutation.mutate(formData)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, SVG, WebP).")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be 2 MB or smaller.")
      return
    }
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview)
    setLogo(file)
    setRemoveLogo(false)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRemoveLogo = () => {
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview)
    setLogo(null)
    setLogoPreview(null)
    setRemoveLogo(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>Manage company information and branding — the logo updates the sidebar, login page, and browser tab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 rounded-lg border bg-white">
                <AvatarImage src={logoPreview || ""} className="object-contain p-1" />
                <AvatarFallback className="rounded-lg text-xl">
                  {(form.company_name || "C").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow"
                title="Upload logo"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              {(logoPreview || logo) && (
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                  title="Remove logo"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">PNG, JPG, SVG or WebP, up to 2 MB. Best with a square or wide logo on a white/transparent background.</p>
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
      timezone: settings?.timezone || "Asia/Manila",
      currency: settings?.currency || "PHP",
      date_format: settings?.date_format || "Y-m-d",
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
    smtp_password: "",
    smtp_encryption: settings?.smtp_encryption || "tls",
    from_address: settings?.from_address || "",
    from_name: settings?.from_name || "",
  })

  useEffect(() => {
    setForm({
      smtp_host: settings?.smtp_host || "",
      smtp_port: settings?.smtp_port || "",
      smtp_username: settings?.smtp_username || "",
      smtp_password: "",
      smtp_encryption: settings?.smtp_encryption || "tls",
      from_address: settings?.from_address || "",
      from_name: settings?.from_name || "",
    })
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => api.put("/settings/email", data),
    onSuccess: () => {
      setForm((previous) => ({ ...previous, smtp_password: "" }))
      toast.success("Email settings updated")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const { smtp_password, ...fields } = form
    mutation.mutate(smtp_password ? { ...fields, smtp_password } : fields)
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
                autoComplete="new-password"
                placeholder={settings?.smtp_password_configured ? "Configured — leave blank to keep" : "Enter SMTP password"}
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
  "Book Categories": { endpoint: "/book-categories", label: "Book Category" },
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

function PersonalizationSection() {
  const { lang: contextLang, changeLanguage, t } = useLanguage()
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system")
  const [accent, setAccent] = useState(() => localStorage.getItem("accent") || "default")
  const [sidebarDefault, setSidebarDefault] = useState(() => localStorage.getItem("sidebarDefault") || "expanded")
  const [density, setDensity] = useState(() => localStorage.getItem("density") || "comfortable")
  const [animations, setAnimations] = useState(() => localStorage.getItem("animations") !== "false")
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || contextLang || "en")
  const [itemsPerPage, setItemsPerPage] = useState(() => localStorage.getItem("itemsPerPage") || "10")
  const [emailNotif, setEmailNotif] = useState(() => localStorage.getItem("emailNotif") !== "false")
  const [pushNotif, setPushNotif] = useState(() => localStorage.getItem("pushNotif") !== "false")

  const accentOptions = [
    { value: "default", label: "SEATECH Navy", color: "#130a5c", foreground: "#ffffff", ring: "#130a5c", preview: "bg-[#130a5c] ring-2 ring-[#ffcc0a]/60" },
    { value: "seatech-gold", label: "SEATECH Gold", color: "#ffcc0a", foreground: "#130a5c", ring: "#ffcc0a", preview: "bg-[#ffcc0a]" },
    { value: "blue", label: "Ocean Blue", color: "#3b82f6", foreground: "#ffffff", ring: "#3b82f6", preview: "bg-blue-500" },
    { value: "emerald", label: "Emerald", color: "#10b981", foreground: "#ffffff", ring: "#10b981", preview: "bg-emerald-500" },
    { value: "violet", label: "Violet", color: "#8b5cf6", foreground: "#ffffff", ring: "#8b5cf6", preview: "bg-violet-500" },
    { value: "rose", label: "Rose", color: "#f43f5e", foreground: "#ffffff", ring: "#f43f5e", preview: "bg-rose-500" },
    { value: "amber", label: "Amber", color: "#f59e0b", foreground: "#130a5c", ring: "#f59e0b", preview: "bg-amber-500" },
  ]

  const previewAccent = (value) => {
    const opt = accentOptions.find(a => a.value === value)
    if (!opt || value === "default") {
      document.documentElement.style.removeProperty("--primary")
      document.documentElement.style.removeProperty("--primary-foreground")
      document.documentElement.style.removeProperty("--ring")
    } else {
      document.documentElement.style.setProperty("--primary", opt.color)
      document.documentElement.style.setProperty("--primary-foreground", opt.foreground)
      document.documentElement.style.setProperty("--ring", opt.ring)
    }
  }

  const applyTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", prefersDark)
      localStorage.removeItem("darkMode")
    }
  }

  const handleSave = () => {
    // Save current selections as user's personalization (per-device, not system default)
    // System defaults remain unchanged (system/default/comfortable etc. for new users/devices)
    const prevTheme = localStorage.getItem("theme")
    localStorage.setItem("accent", accent)
    localStorage.setItem("sidebarDefault", sidebarDefault)
    localStorage.setItem("density", density)
    localStorage.setItem("animations", String(animations))
    // Language: persist and apply immediately via context (fixes "not working")
    setLangStorage(language)
    changeLanguage(language)
    localStorage.setItem("itemsPerPage", itemsPerPage)
    localStorage.setItem("emailNotif", String(emailNotif))
    localStorage.setItem("pushNotif", String(pushNotif))
    // Only update theme in storage if it actually changed via the theme buttons (applyTheme already handled it)
    // Do NOT overwrite theme here to avoid resetting the preview/default
    if (theme !== prevTheme) {
      localStorage.setItem("theme", theme)
    }
    // Apply density/animations immediately without affecting other defaults
    document.documentElement.setAttribute("data-density", density)
    document.documentElement.setAttribute("data-animations", String(animations))
    // Dispatch event for other components (like tables using usePersonalization)
    window.dispatchEvent(new Event("personalization-changed"))
    window.dispatchEvent(new StorageEvent("storage", { key: "itemsPerPage", newValue: itemsPerPage }))
    toast.success(getTranslation(language, "settings.saved"))
    // Apply accent immediately (with contrast-correct foreground)
    previewAccent(accent)
  }

  const handleReset = () => {
    localStorage.removeItem("theme")
    localStorage.removeItem("accent")
    localStorage.removeItem("sidebarDefault")
    localStorage.removeItem("density")
    localStorage.removeItem("animations")
    localStorage.removeItem("language")
    localStorage.removeItem("itemsPerPage")
    localStorage.removeItem("emailNotif")
    localStorage.removeItem("pushNotif")
    setLangStorage("en")
    changeLanguage("en")
    setTheme("system")
    setAccent("default")
    setSidebarDefault("expanded")
    setDensity("comfortable")
    setAnimations(true)
    setLanguage("en")
    setItemsPerPage("10")
    setEmailNotif(true)
    setPushNotif(true)
    document.documentElement.classList.remove("dark")
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark")
    document.documentElement.style.removeProperty("--primary")
    document.documentElement.setAttribute("data-density", "comfortable")
    document.documentElement.setAttribute("data-animations", "true")
    window.dispatchEvent(new Event("personalization-changed"))
    toast.success(getTranslation("en", "settings.resetSuccess"))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> {t("settings.appearance")}</CardTitle>
            <CardDescription>Customize look and feel. Changes apply instantly and are saved per device. — {t("settings.language")}: {language}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "light", label: "Light", icon: Sun, preview: "bg-white border" },
                  { value: "dark", label: "Dark", icon: Moon, preview: "bg-zinc-900 border-zinc-700" },
                  { value: "system", label: "System", icon: Monitor, preview: "bg-gradient-to-br from-white to-zinc-900 border" },
                ].map(opt => {
                  const Icon = opt.icon
                  const active = theme === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => applyTheme(opt.value)}
                      className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${active ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                    >
                      <div className={`h-12 w-full rounded ${opt.preview} flex items-center justify-center`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium flex items-center gap-1">
                        {opt.label} {active && <Check className="h-3 w-3 text-primary" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">System follows your OS preference.</p>
            </div>

            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {accentOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setAccent(opt.value); previewAccent(opt.value) }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all ${accent === opt.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                  >
                    <div className={`h-7 w-7 rounded-full ${opt.preview} border shadow-sm`} />
                    <span className="text-xs font-medium">{opt.label}</span>
                    {accent === opt.value && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Layout className="h-3.5 w-3.5" /> Density</Label>
                <Select value={density} onValueChange={setDensity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Animations</Label>
                <Select value={animations ? "enabled" : "disabled"} onValueChange={v => setAnimations(v === "enabled")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Reduced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> {t("settings.preferences")}</CardTitle>
            <CardDescription>Personal choices for layout and workflow. — {t("settings.language")}: {t(`settings.language.${language}`) || language}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settings.language")}</Label>
                <Select value={language} onValueChange={v => { setLanguage(v); setLangStorage(v); changeLanguage(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("settings.language.en")}</SelectItem>
                    <SelectItem value="fil">{t("settings.language.fil")}</SelectItem>
                    <SelectItem value="es">{t("settings.language.es")}</SelectItem>
                    <SelectItem value="ja">{t("settings.language.ja")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Selected: {language} — preview below updates instantly</p>
              </div>
              <div className="space-y-2">
                <Label>Sidebar Default</Label>
                <Select value={sidebarDefault} onValueChange={setSidebarDefault}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">Expanded</SelectItem>
                    <SelectItem value="collapsed">Collapsed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items Per Page</Label>
              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Controls pagination in Training, Billing, Employees tables</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-1"><Bell className="h-4 w-4" /> Notifications</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Email Notifications</div>
                    <div className="text-xs text-muted-foreground">Receive updates via email</div>
                  </div>
                  <input type="checkbox" checked={emailNotif} onChange={e => setEmailNotif(e.target.checked)} className="h-4 w-4 rounded border-input" />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Push Notifications</div>
                    <div className="text-xs text-muted-foreground">Browser push alerts</div>
                  </div>
                  <input type="checkbox" checked={pushNotif} onChange={e => setPushNotif(e.target.checked)} className="h-4 w-4 rounded border-input" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>How your choices look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Theme</div>
              <div className="font-medium capitalize flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> {theme}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Accent</div>
              <div className="font-medium capitalize flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full ${accentOptions.find(a => a.value === accent)?.preview || "bg-primary"}`} />
                {accent}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Density</div>
              <div className="font-medium capitalize">{density} • {animations ? "Animated" : "Reduced"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> {t("settings.save")}</Button>
        <Button variant="outline" onClick={handleReset}>{t("settings.reset")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Saved per device in <code>localStorage</code> (<code>theme, accent, density</code> etc.). System preferences (timezone/currency) remain in General tab and are server-side.</p>
    </div>
  )
}

function ResetDataSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Web-based data reset is disabled</CardTitle>
        <CardDescription>Contact your system administrator for data lifecycle and recovery requests.</CardDescription>
      </CardHeader>
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
