import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, File, Image as ImageIcon, FileText } from "lucide-react"

const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]
const pdfExt = "pdf"
const textExts = ["txt", "md", "csv", "json", "xml", "log"]

function getFileType(filename) {
  const ext = filename?.split(".").pop()?.toLowerCase()
  if (imageExts.includes(ext)) return "image"
  if (ext === pdfExt) return "pdf"
  if (textExts.includes(ext)) return "text"
  return "unknown"
}

export default function FilePreviewDialog({ open, onClose, file }) {
  if (!file) return null

  const fileType = getFileType(file.name)
  const fileUrl = file.url || file.download_url || ""

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="truncate">{file.name}</DialogTitle>
          {fileUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={fileUrl} download={file.name}>
                <Download className="mr-2 h-4 w-4" /> Download
              </a>
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-auto flex items-center justify-center min-h-[400px] bg-muted/30 rounded-md">
          {fileType === "image" && fileUrl ? (
            <img
              src={fileUrl}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : fileType === "pdf" && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh]"
              title={file.name}
            />
          ) : fileType === "text" && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] bg-white"
              title={file.name}
            />
          ) : (
            <div className="text-center">
              {fileType === "image" ? (
                <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
              ) : fileType === "pdf" ? (
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
              ) : (
                <File className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
              )}
              <p className="text-muted-foreground">Preview not available</p>
              {fileUrl && (
                <Button variant="outline" className="mt-4" asChild>
                  <a href={fileUrl} download={file.name}>
                    <Download className="mr-2 h-4 w-4" /> Download instead
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground pt-2">
          {file.size && <span>Size: {formatFileSize(file.size)}</span>}
          {file.type && <span>Type: {file.type}</span>}
          {file.updated_at && <span>Modified: {file.updated_at}</span>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes) {
  if (!bytes) return "Unknown"
  const num = Number(bytes)
  if (num < 1024) return num + " B"
  if (num < 1024 * 1024) return (num / 1024).toFixed(1) + " KB"
  return (num / (1024 * 1024)).toFixed(1) + " MB"
}
