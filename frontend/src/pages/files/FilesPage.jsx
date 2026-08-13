import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"
import { format } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import FolderTree from "./FolderTree"
import FilePreviewDialog from "./FilePreviewDialog"
import {
  Search, Upload, MoreHorizontal, Download, Eye, Trash2, Star, Pencil,
  Grid3X3, List, File, FileImage, FileText, FileArchive, FileSpreadsheet,
  FolderOpen, Home, GripVertical, ArrowLeft, ArrowRight, ArrowUp, FolderPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

function getFileIcon(fileName) {
  const ext = fileName?.split(".").pop()?.toLowerCase()
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return FileImage
  if (["pdf"].includes(ext)) return FileText
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet
  if (["doc", "docx", "txt", "md"].includes(ext)) return FileText
  return File
}

function formatFileSize(bytes) {
  if (!bytes) return "-"
  const num = Number(bytes)
  if (num < 1024) return num + " B"
  if (num < 1024 * 1024) return (num / 1024).toFixed(1) + " KB"
  return (num / (1024 * 1024)).toFixed(1) + " MB"
}

export default function FilesPage() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState("list")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [navigationHistory, setNavigationHistory] = useState([{ id: null, name: "Home" }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadDesc, setUploadDesc] = useState("")
  const [uploadCategory, setUploadCategory] = useState("")
  const [uploadAccessType, setUploadAccessType] = useState("all")
  const [uploadAccessIds, setUploadAccessIds] = useState([])
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [targetFile, setTargetFile] = useState(null)
  const [menuFileId, setMenuFileId] = useState(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [renameValue, setRenameValue] = useState("")
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [draggedFile, setDraggedFile] = useState(null)
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedFileId, setSelectedFileId] = useState(null)

  const currentFolderId = navigationHistory[historyIndex]?.id ?? null
  const currentFolderPath = navigationHistory.slice(1, historyIndex + 1)

  const handleNavigate = (folder) => {
    setNavigationHistory((prev) => [...prev.slice(0, historyIndex + 1), { id: folder.id, name: folder.name }])
    setHistoryIndex((prev) => prev + 1)
    setSelectedFileId(null)
  }

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1)
      setSelectedFileId(null)
    }
  }

  const handleForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      setHistoryIndex((prev) => prev + 1)
      setSelectedFileId(null)
    }
  }

  const handleUp = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1)
      setSelectedFileId(null)
    }
  }

  const handleDropFile = (fileId, folderId) => {
    moveMutation.mutate({ id: fileId, folderId })
  }

  const { data: filesData, isLoading, isError } = useQuery({
    queryKey: ["files", currentFolderId, search, categoryFilter],
    queryFn: () =>
      api.get("/files", {
        params: {
          folder_id: currentFolderId || "",
          search,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
        },
      }).then((r) => r.data),
  })

  const { data: foldersData } = useQuery({
    queryKey: ["folders-list", currentFolderId],
    queryFn: () =>
      api.get("/folders", {
        params: { parent_id: currentFolderId || "" },
      }).then((r) => r.data),
  })

  const { data: docCategoriesData } = useQuery({
    queryKey: ["document-categories"],
    queryFn: () => api.get("/document-categories").then((r) => r.data),
  })

  const docCategories = docCategoriesData?.data || []

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((r) => r.data),
  })
  const departments = departmentsData?.data || []

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => api.get("/users", { params: { per_page: 100 } }).then((r) => r.data),
  })
  const usersList = usersData?.data?.data || []

  const uploadMutation = useMutation({
    mutationFn: (formData) =>
      api.post("/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      toast.success("File uploaded successfully")
      queryClient.invalidateQueries({ queryKey: ["files"] })
      setUploadOpen(false)
      setSelectedFiles([])
      setUploadDesc("")
      setUploadCategory("")
      setUploadAccessType("all")
      setUploadAccessIds([])
    },
    onError: (err) => toast.error(err.response?.data?.message || "Upload failed"),
  })

  const handleUploadSubmit = () => {
    if (selectedFiles.length === 0) return
    selectedFiles.forEach((file) => {
      const formData = new FormData()
      formData.append("file", file)
      if (currentFolderId) formData.append("folder_id", currentFolderId)
      if (uploadDesc) formData.append("description", uploadDesc)
      if (uploadCategory) formData.append("document_category_id", uploadCategory)
      if (uploadAccessType !== "all") {
        formData.append("access_type", uploadAccessType)
        uploadAccessIds.forEach((id) => formData.append("access_ids[]", id))
      }
      uploadMutation.mutate(formData)
    })
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/files/${id}`),
    onSuccess: () => {
      toast.success("File deleted")
      queryClient.invalidateQueries({ queryKey: ["files"] })
      setDeleteDialogOpen(false)
      setSelectedFileId(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed"),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => api.put(`/files/${id}`, { name }),
    onSuccess: () => {
      toast.success("File renamed")
      queryClient.invalidateQueries({ queryKey: ["files"] })
      setRenameDialogOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Rename failed"),
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id) => api.post(`/files/${id}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] })
      toast.success("Updated")
    },
  })

  const moveMutation = useMutation({
    mutationFn: ({ id, folderId }) => api.post(`/files/${id}/move`, { folder_id: folderId }),
    onSuccess: () => {
      toast.success("File moved")
      queryClient.invalidateQueries({ queryKey: ["files"] })
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      setMoveDialogOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Move failed"),
  })

  const createFolderMutation = useMutation({
    mutationFn: (data) => api.post("/folders", data),
    onSuccess: () => {
      toast.success("Folder created")
      queryClient.invalidateQueries({ queryKey: ["folders-list"] })
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["folder-tree"] })
      setNewFolderDialogOpen(false)
      setNewFolderName("")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create folder"),
  })

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      acceptedFiles.forEach((file) => {
        const fd = new FormData()
        fd.append("file", file)
        if (currentFolderId) fd.append("folder_id", currentFolderId)
        uploadMutation.mutate(fd)
      })
    },
    [currentFolderId, uploadMutation]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  })

  const files = filesData?.data?.data || []
  const subfolders = foldersData?.data || []

  const isEmpty = subfolders.length === 0 && files.length === 0
  const totalItems = subfolders.length + files.length
  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < navigationHistory.length - 1

  return (
    <div className="h-full flex flex-col space-y-0">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">Manage documents and files</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 120px)" }}>
        <Card className="w-64 shrink-0 overflow-hidden flex flex-col">
          <FolderTree
            selectedFolderId={currentFolderId}
            onSelectFolder={handleNavigate}
            onDropFile={handleDropFile}
          />
        </Card>

        <div className="flex-1 flex flex-col min-w-0" {...getRootProps()}>
          <input {...getInputProps()} />

          {isDragActive && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
                <p className="text-lg font-semibold">Drop files here to upload</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 mb-1 border rounded-lg bg-muted/30 px-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canGoBack} onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canGoForward} onClick={handleForward}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canGoBack} onClick={handleUp}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Up one level</TooltipContent>
            </Tooltip>

            <div className="flex-1 flex items-center border rounded-md bg-background mx-1 h-9 px-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => { setHistoryIndex(0); setSelectedFileId(null) }}
                    >
                      <Home className="h-3.5 w-3.5" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {currentFolderPath.map((folder, idx) => (
                    <BreadcrumbItem key={folder.id}>
                      <BreadcrumbSeparator />
                      {idx === currentFolderPath.length - 1 ? (
                        <BreadcrumbPage className="text-xs">{folder.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          className="cursor-pointer text-xs"
                          onClick={() => { setHistoryIndex(idx + 1); setSelectedFileId(null) }}
                        >
                          {folder.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="h-8 pl-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 py-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setNewFolderDialogOpen(true)}>
                  <FolderPlus className="mr-1.5 h-4 w-4" /> New Folder
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a new folder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1.5 h-4 w-4" /> Upload
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload files</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!targetFile}
                  onClick={() => { if (targetFile) setDeleteDialogOpen(true) }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected file</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                <SelectItem value="archive">Archives</SelectItem>
                <SelectItem value="pdf">PDFs</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid view</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg min-h-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-destructive">Failed to load files.</div>
            ) : (
              <>
                {isEmpty && !currentFolderId ? (
                  <div className="text-center py-12 text-muted-foreground"><File className="h-12 w-12 mx-auto mb-2 opacity-30" />No files found.</div>
                ) : viewMode === "grid" ? (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {currentFolderId && <div className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onDoubleClick={handleUp}><FolderOpen className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-xs text-center font-medium text-muted-foreground">..</p></div>}
                    {subfolders.map(f => <div key={`gf-${f.id}`} className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onDoubleClick={() => handleNavigate(f)}><FolderOpen className="h-10 w-10 text-yellow-600 mb-2" /><p className="text-xs text-center font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{f.documents_count ?? 0} items</p></div>)}
                    {files.map(f => { const I = getFileIcon(f.name); return <div key={f.id} className={cn("flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer", selectedFileId === f.id && "bg-accent ring-1 ring-primary")} onClick={() => setSelectedFileId(f.id)} onDoubleClick={() => { setTargetFile(f); setPreviewOpen(true) }}><I className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-xs text-center truncate w-full">{f.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(f.file_size)}</p></div>})}
                  </div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-[30px]"></TableHead><TableHead className="w-[40px]"></TableHead><TableHead>Name</TableHead><TableHead className="w-[140px]">Date Modified</TableHead><TableHead className="w-[100px]">Type</TableHead><TableHead className="w-[100px]">Size</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {currentFolderId && <TableRow className="cursor-pointer hover:bg-muted/50" onDoubleClick={handleUp}><TableCell></TableCell><TableCell><FolderOpen className="h-5 w-5 text-muted-foreground" /></TableCell><TableCell className="font-medium text-muted-foreground">..</TableCell><TableCell></TableCell><TableCell></TableCell><TableCell></TableCell><TableCell></TableCell></TableRow>}
                      {subfolders.map(f => <TableRow key={`f-${f.id}`} className="cursor-pointer hover:bg-muted/50" onDoubleClick={() => handleNavigate(f)}><TableCell></TableCell><TableCell><FolderOpen className="h-5 w-5 text-yellow-600" /></TableCell><TableCell className="font-medium">{f.name}</TableCell><TableCell className="text-muted-foreground">-</TableCell><TableCell><Badge variant="outline">Folder</Badge></TableCell><TableCell className="text-muted-foreground">{f.documents_count ?? 0} items</TableCell><TableCell></TableCell></TableRow>)}
                      {files.map(f => { const I = getFileIcon(f.name); return <TableRow key={f.id} className={cn("group cursor-default hover:bg-muted/50", selectedFileId === f.id && "bg-accent")} onClick={() => setSelectedFileId(f.id)} onDoubleClick={() => { setTargetFile(f); setPreviewOpen(true) }}><TableCell><span className="inline-block cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100" draggable onDragStart={e => { e.dataTransfer.setData("text/plain", f.id); e.dataTransfer.effectAllowed = "move" }}><GripVertical className="h-4 w-4 text-muted-foreground" /></span></TableCell><TableCell><I className="h-5 w-5 text-muted-foreground" /></TableCell><TableCell className="font-medium">{f.name}</TableCell><TableCell className="text-muted-foreground">{f.updated_at ? format(new Date(f.updated_at), "MMM dd, yyyy") : "-"}</TableCell><TableCell><Badge variant="outline">{f.file_type?.toUpperCase() || f.name?.split(".").pop()?.toUpperCase() || "-"}</Badge></TableCell><TableCell className="text-muted-foreground">{formatFileSize(f.file_size)}</TableCell><TableCell><button className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer" onClick={e => { e.stopPropagation(); setTargetFile(f); setMenuFileId(f.id); setSelectedFileId(f.id); setMenuPos({ x: e.clientX, y: e.clientY }) }}><MoreHorizontal className="h-4 w-4" /></button></TableCell></TableRow>})}
                    </TableBody>
                  </Table>
                )}
              </>
            )}

      {menuFileId && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setMenuFileId(null); setTargetFile(null) }} />
          <div className="fixed z-50 w-44 rounded-md border bg-popover shadow-md" style={{ left: Math.min(menuPos.x, window.innerWidth - 200), top: Math.min(menuPos.y, window.innerHeight - 280) }}>
            <div className="p-1">
              <button className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => { setPreviewOpen(true); setMenuFileId(null) }}>
                <Eye className="mr-2 h-4 w-4" /> Preview
              </button>
              {targetFile?.file_path && (
                <a href={`/api/files/${targetFile.id}/download`} download className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => setMenuFileId(null)}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </a>
              )}
              <button className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => { toggleFavoriteMutation.mutate(targetFile.id); setMenuFileId(null) }}>
                <Star className={cn("mr-2 h-4 w-4", targetFile?.is_favorite && "text-yellow-500 fill-yellow-500")} />
                {targetFile?.is_favorite ? "Unfavorite" : "Favorite"}
              </button>
              <button className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => { setRenameValue(targetFile?.name || ""); setRenameDialogOpen(true); setMenuFileId(null) }}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </button>
              <button className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => { setMoveDialogOpen(true); setMenuFileId(null) }}>
                <FolderOpen className="mr-2 h-4 w-4" /> Move
              </button>
              <div className="my-1 h-px bg-border" />
              <button className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent" onClick={() => { setDeleteDialogOpen(true); setMenuFileId(null) }}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        </>
      )}
          </div>

          <div className="flex items-center h-8 px-3 text-xs text-muted-foreground border rounded-md mt-1 bg-muted/30">
            <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
            {selectedFileId && (
              <>
                <span className="mx-2 text-border">|</span>
                <span>1 item selected</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload to {currentFolderPath.length > 0 ? currentFolderPath[currentFolderPath.length - 1]?.name : "root"} folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uploadFiles">Files</Label>
              <Input
                id="uploadFiles"
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              />
              {selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedFiles.length} file(s) selected</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="uploadCategory">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {docCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uploadDesc">Description</Label>
              <Input
                id="uploadDesc"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label>Access</Label>
              <Select value={uploadAccessType} onValueChange={(v) => { setUploadAccessType(v); setUploadAccessIds([]) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Who can access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                  <SelectItem value="user">By User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {uploadAccessType === "department" && (
              <div className="space-y-2">
                <Label>Departments</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadAccessIds.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) setUploadAccessIds([...uploadAccessIds, dept.id])
                          else setUploadAccessIds(uploadAccessIds.filter((id) => id !== dept.id))
                        }}
                      />
                      {dept.name}
                    </label>
                  ))}
                  {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments</p>}
                </div>
              </div>
            )}
            {uploadAccessType === "user" && (
              <div className="space-y-2">
                <Label>Users</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {usersList.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadAccessIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setUploadAccessIds([...uploadAccessIds, u.id])
                          else setUploadAccessIds(uploadAccessIds.filter((id) => id !== u.id))
                        }}
                      />
                      {u.name} ({u.email})
                    </label>
                  ))}
                  {usersList.length === 0 && <p className="text-xs text-muted-foreground">No users</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); setSelectedFiles([]) }}>
              Cancel
            </Button>
            <Button disabled={selectedFiles.length === 0 || uploadMutation.isPending} onClick={handleUploadSubmit}>
              {uploadMutation.isPending ? "Uploading..." : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setTargetFile(null); setMenuFileId(null) }}
        file={targetFile}
      />

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() => renameMutation.mutate({ id: targetFile?.id, name: renameValue })}
            >
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{targetFile?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(targetFile?.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>
              Select a destination folder for <strong>{targetFile?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg max-h-60 overflow-y-auto p-2">
            <div
              className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted"
              onClick={() => {
                moveMutation.mutate({ id: targetFile?.id, folderId: null })
              }}
            >
              <Home className="h-4 w-4" /> Root
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in {currentFolderPath.length > 0 ? currentFolderPath[currentFolderPath.length - 1]?.name : "root"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newFolderName">Folder Name</Label>
              <Input
                id="newFolderName"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              onClick={() => createFolderMutation.mutate({ name: newFolderName, parent_id: currentFolderId })}
            >
              {createFolderMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
