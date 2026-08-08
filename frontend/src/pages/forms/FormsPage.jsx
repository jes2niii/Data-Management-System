import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Search, Upload, Download, FileText, FileSpreadsheet, File, Image as ImageIcon,
  Plus,
} from "lucide-react"

const categoryIcons = {
  documents: FileText,
  spreadsheets: FileSpreadsheet,
  forms: File,
  images: ImageIcon,
}

const categoryColors = {
  documents: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  spreadsheets: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  forms: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  images: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
}

export default function FormsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formCategoryId, setFormCategoryId] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formActive, setFormActive] = useState(true)
  const fileRef = useRef(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["forms", search, categoryFilter],
    queryFn: () =>
      api.get("/forms", {
        params: { search, category: categoryFilter !== "all" ? categoryFilter : undefined },
      }).then((r) => r.data),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ["form-categories"],
    queryFn: () => api.get("/form-categories").then((r) => r.data),
  })

  const categories = categoriesData?.data || []

  const uploadMutation = useMutation({
    mutationFn: (formData) =>
      api.post("/forms", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      toast.success("Form uploaded")
      queryClient.invalidateQueries({ queryKey: ["forms"] })
      setUploadOpen(false)
      setFormName("")
      setFormCategoryId("")
      setFormDescription("")
      setFormActive(true)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Upload failed"),
  })

  const incrementDownloadMutation = useMutation({
    mutationFn: (id) => api.post(`/forms/${id}/download`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms"] }),
  })

  const forms = data?.data?.data || []

  const handleUploadSubmit = () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !formName.trim()) return
    const formData = new FormData()
    formData.append("file", file)
    formData.append("name", formName)
    if (formCategoryId) formData.append("form_category_id", formCategoryId)
    if (formDescription) formData.append("description", formDescription)
    formData.append("is_active", formActive ? "1" : "0")
    uploadMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forms Repository</h1>
          <p className="text-muted-foreground">Download and manage organizational forms</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Upload Form
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="documents">Documents</SelectItem>
            <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
            <SelectItem value="forms">Forms</SelectItem>
            <SelectItem value="images">Images</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive">Failed to load forms.</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-2 opacity-30" />
          No forms found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const Icon = categoryIcons[form.category] || File
            const badgeClass = categoryColors[form.category] || ""
            return (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                          <CardTitle className="text-base">{form.name}</CardTitle>
                        {form.category && (
                          <Badge className={`mt-1 ${badgeClass}`} variant="outline">
                            {form.category?.name || form.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {form.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      <Download className="inline h-3 w-3 mr-1" />
                      {form.download_count || 0} downloads
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        incrementDownloadMutation.mutate(form.id)
                        if (form.url || form.download_url) {
                          window.open(form.url || form.download_url, "_blank")
                        }
                      }}
                    >
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Form</DialogTitle>
            <DialogDescription>Upload a new form template to the repository.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formName">Name *</Label>
              <Input
                id="formName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Form name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="formDesc">Description</Label>
              <Input
                id="formDesc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input ref={fileRef} type="file" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="formActive">Active</Label>
              <Switch id="formActive" checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button disabled={!formName.trim() || uploadMutation.isPending} onClick={handleUploadSubmit}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
