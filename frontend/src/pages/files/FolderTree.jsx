import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Folder, FolderOpen, FolderPlus, MoreVertical, Pencil, Trash2, ChevronRight, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

function TreeNode({ folder, selectedId, onSelect, onEdit, onDelete, onCreateSub, onDropFile }) {
  const [expanded, setExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const hasChildren = folder.children && folder.children.length > 0

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted group text-sm",
          selectedId === folder.id && "bg-accent",
          dragOver && "ring-2 ring-primary bg-primary/10"
        )}
        onClick={() => {
          setExpanded(!expanded)
          onSelect(folder)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const fileId = e.dataTransfer.getData("text/plain")
          if (fileId && onDropFile) {
            onDropFile(fileId, folder.id)
          }
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {expanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-yellow-600" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-yellow-600" />
        )}
        <span className="flex-1 truncate">{folder.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateSub(folder) }}>
              <FolderPlus className="mr-2 h-4 w-4" /> New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(folder) }}>
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(folder) }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren && (
        <div className="ml-4">
          {folder.children.map((child) => (
              <TreeNode
                key={child.id}
                folder={child}
                selectedId={selectedId}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreateSub={onCreateSub}
                onDropFile={onDropFile}
              />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FolderTree({ selectedFolderId, onSelectFolder, onDropFile }) {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [folderCategory, setFolderCategory] = useState("general")
  const [targetFolder, setTargetFolder] = useState(null)

  const { data: foldersData, isLoading } = useQuery({
    queryKey: ["folder-tree"],
    queryFn: () => api.get("/folder-tree").then((r) => r.data),
  })

  const { data: folderCatsData } = useQuery({
    queryKey: ["folder-categories"],
    queryFn: () => api.get("/folder-categories").then((r) => r.data),
  })

  const folderCats = folderCatsData?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/folders", data),
    onSuccess: () => {
      toast.success("Folder created")
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      setCreateDialogOpen(false)
      setFolderName("")
      setFolderCategory("general")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create folder"),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => api.put(`/folders/${id}`, { name }),
    onSuccess: () => {
      toast.success("Folder renamed")
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      setRenameDialogOpen(false)
      setTargetFolder(null)
      setFolderName("")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to rename"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/folders/${id}`),
    onSuccess: () => {
      toast.success("Folder deleted")
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["files"] })
      setDeleteDialogOpen(false)
      setTargetFolder(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete"),
  })

  const folders = foldersData?.data || []

  const handleCreateRoot = () => {
    setTargetFolder(null)
    setFolderName("")
    setFolderCategory("general")
    setCreateDialogOpen(true)
  }

  const handleCreateSub = (parent) => {
    setTargetFolder(parent)
    setFolderName("")
    setFolderCategory("general")
    setCreateDialogOpen(true)
  }

  const handleRename = (folder) => {
    setTargetFolder(folder)
    setFolderName(folder.name)
    setRenameDialogOpen(true)
  }

  const handleDelete = (folder) => {
    setTargetFolder(folder)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-semibold text-sm">Folders</span>
        <Button variant="ghost" size="icon" onClick={handleCreateRoot} title="New Folder">
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No folders. Create one to organize files.
          </div>
        ) : (
          folders.map((folder) => (
            <TreeNode
              key={folder.id}
              folder={folder}
              selectedId={selectedFolderId}
              onSelect={onSelectFolder}
              onEdit={handleRename}
              onDelete={handleDelete}
              onCreateSub={handleCreateSub}
              onDropFile={onDropFile}
            />
          ))
        )}
      </ScrollArea>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {targetFolder ? `New subfolder in "${targetFolder.name}"` : "New Folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="Enter folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={folderCategory} onValueChange={setFolderCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folderCats.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!folderName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: folderName,
                  parent_id: targetFolder?.id || null,
                  folder_category_id: folderCategory,
                })
              }
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!folderName.trim() || renameMutation.isPending}
              onClick={() => renameMutation.mutate({ id: targetFolder?.id, name: folderName })}
            >
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{targetFolder?.name}</strong>? All contents will be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(targetFolder?.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
