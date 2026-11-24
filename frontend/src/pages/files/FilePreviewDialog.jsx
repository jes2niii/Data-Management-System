import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"
import api, { downloadDocument } from "@/lib/api"

export default function FilePreviewDialog({ open, onClose, file }) {
  const [preview, setPreview] = useState(null)
  const fileId = file?.id

  useEffect(() => {
    if (!open || !fileId) return

    const controller = new AbortController()
    let url
    setPreview(null)
    api.get(`/files/${fileId}/preview`, { responseType: "blob", signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(data)
        setPreview({ url, type: data.type })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setPreview({ error: error.response?.status === 415 ? "Preview is not available for this file type." : "Could not load the preview." })
        }
      })

    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, fileId])

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="break-all">{file.name}</DialogTitle>
          <DialogDescription>Preview or download this document.</DialogDescription>
        </DialogHeader>
        <Button variant="outline" size="sm" className="self-start" onClick={() => {
          downloadDocument(file).catch(() => toast.error("Could not download this file."))
        }}>
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
        <div className="overflow-auto rounded-md bg-muted/30">
          {preview?.url && preview.type.startsWith("image/") ? (
            <img src={preview.url} alt={file.name} className="mx-auto max-h-[65vh] object-contain" />
          ) : preview?.url ? (
            <iframe sandbox="" src={preview.url} className="w-full h-[65vh]" title={file.name} />
          ) : (
            <p role="status" className="p-8 text-center text-muted-foreground">{preview?.error || "Loading preview…"}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
