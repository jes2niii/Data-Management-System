import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api, { resolveFileUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, Pencil, Trash2, MoreHorizontal, BookOpen, Link as LinkIcon, FileText, Download, ExternalLink, Library, Tag, Building2, Eye } from "lucide-react"

export default function BookInventoryPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ title: "", book_category_id: "", alternative_references: "", link: "", author: "", publisher: "", year: "", description: "" })
  const [file, setFile] = useState(null)
  const [catOpen, setCatOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", description: "" })

  const { data: catData } = useQuery({
    queryKey: ["book-categories"],
    queryFn: () => api.get("/book-categories").then(r => r.data),
  })
  const categories = catData?.data || []

  const { data: statsData } = useQuery({
    queryKey: ["book-stats"],
    queryFn: () => api.get("/book-inventories/stats").then(r => r.data),
  })
  const stats = statsData?.data || {}

  const { data, isLoading } = useQuery({
    queryKey: ["book-inventories", search, categoryFilter, page],
    queryFn: () => api.get("/book-inventories", { params: { search: search || undefined, category_id: categoryFilter !== "all" ? categoryFilter : undefined, per_page: 10, page } }).then(r => r.data),
  })
  const books = data?.data?.data || []
  const totalPages = data?.data?.last_page || 1

  const mutation = useMutation({
    mutationFn: (fd) => editing ? api.post(`/book-inventories/${editing.id}?_method=PUT`, fd, { headers: { "Content-Type": "multipart/form-data" } }) : api.post("/book-inventories", fd, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      toast.success(editing ? "Book updated" : "Book created")
      qc.invalidateQueries({ queryKey: ["book-inventories"] })
      qc.invalidateQueries({ queryKey: ["book-stats"] })
      setFormOpen(false); setEditing(null); setFile(null)
      setForm({ title: "", book_category_id: "", alternative_references: "", link: "", author: "", publisher: "", year: "", description: "" })
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/book-inventories/${id}`),
    onSuccess: () => { toast.success("Book deleted"); qc.invalidateQueries({ queryKey: ["book-inventories"] }); setDeleteOpen(false) },
  })

  const catMutation = useMutation({
    mutationFn: (payload) => api.post("/book-categories", payload),
    onSuccess: () => {
      toast.success("Category created")
      qc.invalidateQueries({ queryKey: ["book-categories"] })
      setCatOpen(false); setCatForm({ name: "", description: "" })
    },
  })

  const handleEdit = (b) => {
    setEditing(b)
    setForm({
      title: b.title || "",
      book_category_id: b.book_category_id ? String(b.book_category_id) : "",
      alternative_references: b.alternative_references || "",
      link: b.link || "",
      author: b.author || "",
      publisher: b.publisher || "",
      year: b.year || "",
      description: b.description || "",
    })
    setFile(null)
    setFormOpen(true)
  }

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Title required"); return }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (file) fd.append("file", file)
    mutation.mutate(fd)
  }

  const handleDownload = async (book) => {
    try {
      const res = await api.get(`/book-inventories/${book.id}/download`, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = book.file_name || `${book.title}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Download failed")
    }
  }

  const handleView = async (book) => {
    if (!book.file_path && !book.file_url) {
      toast.error("No file available for this book")
      return
    }
    // Open file in another tab - resolve host so it works on localhost
    // and local network (npm run dev -- --host)
    if (book.file_url) {
      window.open(resolveFileUrl(book.file_url), "_blank", "noopener,noreferrer")
      return
    }
    try {
      const res = await api.get(`/book-inventories/${book.id}/preview`, { responseType: "blob" })
      const contentType = res.headers?.["content-type"] || "application/pdf"
      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }))
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch {
      toast.error("Cannot view file")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-8 w-8 text-primary" /> Book Inventory
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> Records Department</Badge>
            Title • Alternative • Link • File Upload • Category (customizable)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatOpen(true)}><Tag className="mr-2 h-4 w-4" /> Manage Categories</Button>
          <Button onClick={() => { setEditing(null); setForm({ title: "", book_category_id: "", alternative_references: "", link: "", author: "", publisher: "", year: "", description: "" }); setFile(null); setFormOpen(true) }}><Plus className="mr-2 h-4 w-4" /> Add Book</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Books</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total ?? 0}</div><p className="text-xs text-muted-foreground">{stats.active ?? 0} active</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="h-4 w-4" /> With File</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{stats.with_file ?? 0}</div><p className="text-xs text-muted-foreground">Uploaded PDFs</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><LinkIcon className="h-4 w-4 text-blue-600" /> With Link</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{stats.with_link ?? 0}</div><p className="text-xs text-muted-foreground">External links</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Categories</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.by_category?.length ?? categories.length}</div><p className="text-xs text-muted-foreground">Customizable by user</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Books by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(stats.by_category || categories.map(c => ({ category: c.name, count: c.books_count ?? 0 }))).map(c => (
            <Badge key={c.category} variant="outline" className="gap-1">{c.category} <span className="font-bold">{c.count}</span></Badge>
          ))}
          {(!stats.by_category || stats.by_category.length === 0) && categories.length === 0 && <span className="text-sm text-muted-foreground">No categories yet — add one</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search title, alternative, author..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Alternative</TableHead>
                  <TableHead>Link / File</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                : books.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No books found. Add one to start.</TableCell></TableRow>
                : books.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author ? `${b.author} • ` : ""}{b.publisher || ""} {b.year ? `(${b.year})` : ""}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{b.category?.name || "—"}</Badge></TableCell>
                    <TableCell className="text-xs min-w-[140px] max-w-[280px] whitespace-normal break-words" title={b.alternative_references}>{b.alternative_references || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {b.link && <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Link</a>}
                        {b.file_path && <Button variant="ghost" size="sm" className="h-auto min-h-6 px-2 py-1 text-xs justify-start text-left whitespace-normal break-all" title={b.file_name} onClick={() => handleDownload(b)}><Download className="mr-1 h-3 w-3 shrink-0" /> <span className="break-all">{b.file_name || "Download"}</span></Button>}
                        {!b.link && !b.file_path && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.file_path && <DropdownMenuItem onClick={() => handleView(b)}><Eye className="mr-2 h-4 w-4" /> View File</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => handleEdit(b)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          {b.link && <DropdownMenuItem asChild><a href={b.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Open Link</a></DropdownMenuItem>}
                          {b.file_path && <DropdownMenuItem onClick={() => handleDownload(b)}><Download className="mr-2 h-4 w-4" /> Download File</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => { setDeleting(b); setDeleteOpen(true) }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Book" : "Add Book"} — Records Department</DialogTitle>
            <DialogDescription>Title • Alternative • Link • File Upload • Category (customizable)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., International Convention for the Safety of Life at Sea (SOLAS)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.book_category_id} onValueChange={v => setForm({ ...form, book_category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Customize in <strong>Manage Categories</strong></p>
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="e.g., IMO" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alternative</Label>
              <Input value={form.alternative_references} onChange={e => setForm({ ...form, alternative_references: e.target.value })} placeholder="e.g., SOLAS 2022" />
            </div>
            <div className="space-y-2">
              <Label>Link (URL)</Label>
              <Input type="url" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://example.com/book.pdf" />
            </div>
            <div className="space-y-2">
              <Label>Upload Book File (if available)</Label>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.epub" />
              {editing?.file_name && !file && <p className="text-xs text-muted-foreground">Current: {editing.file_name} — choose new file to replace</p>}
              {file && <p className="text-xs text-muted-foreground">Selected: {file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Publisher</Label>
                <Input value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} placeholder="e.g., IMO Publishing" />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="e.g., 2022" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Book</DialogTitle></DialogHeader>
          <p className="text-sm">Delete <strong>{deleting?.title}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id)}>{del.isPending ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Book Categories</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.description || "—"} • {c.books_count ?? 0} books</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (confirm(`Delete category "${c.name}"?`)) {
                    api.delete(`/book-categories/${c.id}`).then(() => {
                      toast.success("Category deleted")
                      qc.invalidateQueries({ queryKey: ["book-categories"] })
                    }).catch(e => toast.error(e.response?.data?.message || "Failed"))
                  }
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>}
            <div className="border-t pt-3 space-y-2">
              <Label>New Category Name</Label>
              <div className="flex gap-2">
                <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g., New Category" />
                <Button onClick={() => {
                  if (!catForm.name.trim()) { toast.error("Name required"); return }
                  catMutation.mutate({ name: catForm.name, description: catForm.description })
                }} disabled={catMutation.isPending}><Plus className="h-4 w-4" /></Button>
              </div>
              <Input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Description (optional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
