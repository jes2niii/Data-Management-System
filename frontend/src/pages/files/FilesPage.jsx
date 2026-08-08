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
  FolderOpen, Home,
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
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [currentFolderPath, setCurrentFolderPath] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadDesc, setUploadDesc] = useState("")
  const [uploadCategory, setUploadCategory] = useState("")
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [targetFile, setTargetFile] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [draggedFile, setDraggedFile] = useState(null)

  const handleDropFile = (fileId, folderId) => {
    moveMutation.mutate({ id: fileId, folderId })
  }

  function FileListContent() {
    if (isEmpty && !currentFolderId) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-2 opacity-30" />
          No files found. Upload files or drop them here.
        </div>
      )}
    if (viewMode === "grid") {
      return (
        <>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {currentFolderId && (
              <div className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onClick={() => {
                if (currentFolderPath.length > 1) handleSelectFolder(currentFolderPath[currentFolderPath.length - 2])
                else handleBreadcrumbClick(null, -1)
              }}>
                <FolderOpen className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-xs text-center truncate w-full font-medium text-muted-foreground">..</p>
              </div>
            )}
            {subfolders.map((folder) => (
              <div key={`gfolder-${folder.id}`} className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectFolder(folder)}>
                <FolderOpen className="h-10 w-10 text-yellow-600 mb-2" />
                <p className="text-xs text-center truncate w-full font-medium">{folder.name}</p>
                <p className="text-xs text-muted-foreground">{folder.documents_count ?? 0} items</p>
              </div>
            ))}
            {files.map((file) => {
              const Icon = getFileIcon(file.name)
              return (
                <div key={file.id} className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer group relative" onClick={() => { setTargetFile(file); setPreviewOpen(true) }}>
                  <Icon className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-xs text-center truncate w-full">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentFolderId && (
            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => {
              const pf = currentFolderPath[currentFolderPath.length - 2] || null
              if (pf) handleSelectFolder(pf)
              else handleBreadcrumbClick(null, -1)
            }}>
              <TableCell><FolderOpen className="h-5 w-5 text-muted-foreground" /></TableCell>
              <TableCell className="font-medium text-muted-foreground">..</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
          {subfolders.map((folder) => (
            <TableRow key={`folder-${folder.id}`} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectFolder(folder)}>
              <TableCell><FolderOpen className="h-5 w-5 text-yellow-600" /></TableCell>
              <TableCell className="font-medium">{folder.name}</TableCell>
              <TableCell className="text-muted-foreground">{folder.documents_count ?? 0} items</TableCell>
              <TableCell><Badge variant="outline">Folder</Badge></TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell></TableCell>
            </TableRow>
          ))}
          {files.map((file) => {
            const Icon = getFileIcon(file.name)
            return (
              <TableRow key={file.id} draggable onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", file.id)
                e.dataTransfer.effectAllowed = "move"
              }} className="cursor-grab active:cursor-grabbing">
                <TableCell><Icon className="h-5 w-5 text-muted-foreground" /></TableCell>
                <TableCell className="font-medium">{file.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatFileSize(file.size)}</TableCell>
                <TableCell><Badge variant="outline">{file.file_type?.toUpperCase() || file.name?.split(".").pop()?.toUpperCase() || "-"}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{file.updated_at ? format(new Date(file.updated_at), "MMM dd, yyyy") : "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => { setTargetFile(file); setPreviewOpen(true) }} title="Preview"><Eye className="h-4 w-4" /></Button>
                  {file.file_path && <Button variant="ghost" size="icon" asChild title="Download"><a href={`/api/files/${file.id}/download`}><Download className="h-4 w-4" /></a></Button>}
                  <Button variant="ghost" size="icon" onClick={() => toggleFavoriteMutation.mutate(file.id)} title={file.is_favorite ? "Unfavorite" : "Favorite"}><Star className={cn("h-4 w-4", file.is_favorite && "text-yellow-500 fill-yellow-500")} /></Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
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
      uploadMutation.mutate(formData)
    })
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/files/${id}`),
    onSuccess: () => {
      toast.success("File deleted")
      queryClient.invalidateQueries({ queryKey: ["files"] })
      setDeleteDialogOpen(false)
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

  const handleSelectFolder = (folder) => {
    setCurrentFolderId(folder.id)
    setCurrentFolderPath((prev) => {
      const idx = prev.findIndex((p) => p.id === folder.id)
      if (idx >= 0) return prev.slice(0, idx + 1)
      return [...prev, folder]
    })
  }

  const handleBreadcrumbClick = (folder, index) => {
    if (folder) {
      setCurrentFolderId(folder.id)
      setCurrentFolderPath((prev) => prev.slice(0, index + 1))
    } else {
      setCurrentFolderId(null)
      setCurrentFolderPath([])
    }
  }

  const files = filesData?.data?.data || []
  const subfolders = foldersData?.data || []

  const isEmpty = subfolders.length === 0 && files.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground">Manage documents and files</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Files
          </Button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 200px)" }}>
        <Card className="w-64 shrink-0 overflow-hidden flex flex-col">
          <FolderTree
            selectedFolderId={currentFolderId}
            onSelectFolder={handleSelectFolder}
            onDropFile={handleDropFile}
          />
        </Card>

        <div className="flex-1 flex flex-col space-y-4" {...getRootProps()}>
          <input {...getInputProps()} />

          {isDragActive && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
                <p className="text-lg font-semibold">Drop files here to upload</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => handleBreadcrumbClick(null, -1)}
                  >
                    <Home className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {currentFolderPath.map((folder, idx) => (
                  <BreadcrumbItem key={folder.id}>
                    <BreadcrumbSeparator />
                    {idx === currentFolderPath.length - 1 ? (
                      <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="cursor-pointer"
                        onClick={() => handleBreadcrumbClick(folder, idx)}
                      >
                        {folder.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
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
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-destructive">Failed to load files.</div>
            ) : (
              <FileListContent />
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
        onClose={() => { setPreviewOpen(false); setTargetFile(null) }}
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
    </div>
  )
}
