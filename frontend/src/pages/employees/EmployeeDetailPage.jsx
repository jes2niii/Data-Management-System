import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft, Pencil, Trash2, Upload, Download, File, Eye,
  Clock, Mail, Phone, MapPin, Calendar, Briefcase, Building2,
} from "lucide-react"
import EmployeeFormDialog from "./EmployeeFormDialog"

const statusMap = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "destructive", label: "Inactive" },
  terminated: { variant: "destructive", label: "Terminated" },
  on_leave: { variant: "warning", label: "On Leave" },
}

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [attachmentName, setAttachmentName] = useState("")
  const [attachmentCategory, setAttachmentCategory] = useState("")

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get(`/employees/${id}`).then((r) => r.data),
  })

  const { data: attCatsData } = useQuery({
    queryKey: ["employee-attachment-categories"],
    queryFn: () => api.get("/employee-attachment-categories").then((r) => r.data),
  })

  const attCategories = attCatsData?.data || []

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/employees/${id}`),
    onSuccess: () => {
      toast.success("Employee deleted")
      window.location.href = "/employees"
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete"),
  })

  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ file, name, category }) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name || file.name)
      formData.append("category", category || "other")
      if (category) formData.append("employee_attachment_category_id", category)
      return api.post(`/employees/${id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    },
    onSuccess: () => {
      toast.success("File uploaded")
      queryClient.invalidateQueries({ queryKey: ["employee", id] })
      setUploadDialogOpen(false)
      setSelectedFile(null)
      setAttachmentName("")
      setAttachmentCategory("")
    },
    onError: (err) => toast.error(err.response?.data?.message || "Upload failed"),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId) => api.delete(`/employees/${id}/attachments/${attachmentId}`),
    onSuccess: () => {
      toast.success("Attachment deleted")
      queryClient.invalidateQueries({ queryKey: ["employee", id] })
    },
    onError: (err) => toast.error(err.response?.data?.message || "Delete failed"),
  })

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadAttachmentMutation.mutate(file)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !employee) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load employee details.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/employees"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees</Link>
        </Button>
      </div>
    )
  }

  const st = statusMap[employee.status] || statusMap.active
  const emp = employee?.data || employee

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/employees"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {emp.full_name}
            </h1>
            <p className="text-muted-foreground">{emp.position || "No position"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-28 w-28 mb-4">
                <AvatarImage src={emp.photo_url || ""} />
                <AvatarFallback className="text-3xl">
                  {emp.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{emp.full_name}</h2>
              <Badge variant={st.variant} className="mt-2">{st.label}</Badge>
              <p className="text-sm text-muted-foreground mt-1">{emp.employee_id || `ID: ${emp.id}`}</p>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              {emp.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{emp.email}</span>
                </div>
              )}
              {emp.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{emp.phone}</span>
                </div>
              )}
              {emp.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{emp.address}</span>
                </div>
              )}
              {emp.department?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{emp.department?.name}</span>
                </div>
              )}
              {emp.position && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{emp.position}</span>
                </div>
              )}
              {emp.date_hired && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Hired: {format(new Date(emp.date_hired), "MMM dd, yyyy")}</span>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              {emp.emergency_contact && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Emergency Contact: </span>
                  {emp.emergency_contact}
                </p>
              )}
              {emp.notes && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Notes: </span>
                  {emp.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <Tabs defaultValue="attachments">
              <TabsList>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="attachments" className="pt-4">
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload File
                  </Button>
                </div>
                {(!emp.attachments || emp.attachments.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No attachments. Upload files to associate with this employee.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emp.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <File className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{att.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {att.category && <Badge variant="outline" className="mr-1 text-xs">{att.category}</Badge>}
                              {att.file_size && `${(att.file_size / 1024).toFixed(1)} KB`}
                              {att.created_at && ` - ${format(new Date(att.created_at), "MMM dd, yyyy")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {att.url && (
                            <>
                              <Button variant="ghost" size="icon" asChild title="View">
                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" asChild title="Download">
                                <a href={att.url} download rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAttachmentMutation.mutate(att.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="pt-4">
                {(!emp.history || emp.history.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">No history records.</div>
                ) : (
                  <div className="space-y-4">
                    {emp.history.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Clock className="h-4 w-4" />
                          </div>
                          {idx < emp.history.length - 1 && (
                            <div className="h-full w-px bg-border mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium">{item.action || "Updated"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.description || item.user?.name || "System"}{" "}
                            {item.created_at && format(new Date(item.created_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <EmployeeFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employee={emp}
        onSuccess={() => {
          setFormOpen(false)
          queryClient.invalidateQueries({ queryKey: ["employee", id] })
        }}
      />

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
            <DialogDescription>Select a file and optionally provide a name and category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attFile">File</Label>
              <Input
                id="attFile"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attName">Name</Label>
              <Input
                id="attName"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="Document name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={attachmentCategory} onValueChange={setAttachmentCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {attCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setSelectedFile(null) }}>
              Cancel
            </Button>
            <Button
              disabled={!selectedFile || uploadAttachmentMutation.isPending}
              onClick={() => {
                if (selectedFile) {
                  uploadAttachmentMutation.mutate({
                    file: selectedFile,
                    name: attachmentName,
                    category: attachmentCategory,
                  })
                }
              }}
            >
              {uploadAttachmentMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{emp.full_name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
