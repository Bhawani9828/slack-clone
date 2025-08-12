"use client"
import { Dialog, DialogContent, IconButton } from "@mui/material"
import { Close, Search, Share, Download, InsertDriveFile, PictureAsPdf, VideoFile } from "@mui/icons-material"

interface Document {
  id: string
  name: string
  type: "html" | "mp4" | "xlsx" | "pdf" | "txt"
  date: string
  size?: string
}

const documents: Document[] = [
  { id: "1", name: "messenger.html", type: "html", date: "2, october 2023" },
  { id: "2", name: "chapter1.MP4", type: "mp4", date: "3, October 2023" },
  { id: "3", name: "salary.xlsx", type: "xlsx", date: "5, october 2023" },
  { id: "4", name: "document.pdf", type: "pdf", date: "7, october 2023" },
  { id: "5", name: "details.txt", type: "txt", date: "20, October 2023" },
  { id: "6", name: "messenger.html", type: "html", date: "2, october 2023" },
]

export default function DocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const getFileIcon = (type: string) => {
    const iconProps = { className: "text-white text-lg" }
    switch (type) {
      case "html":
        return <InsertDriveFile {...iconProps} />
      case "mp4":
        return <VideoFile {...iconProps} />
      case "xlsx":
        return <InsertDriveFile {...iconProps} />
      case "pdf":
        return <PictureAsPdf {...iconProps} />
      case "txt":
        return <InsertDriveFile {...iconProps} />
      default:
        return <InsertDriveFile {...iconProps} />
    }
  }

  const getIconBgColor = (type: string) => {
    switch (type) {
      case "html":
        return "bg-pink-500"
      case "mp4":
        return "bg-green-500"
      case "xlsx":
        return "bg-blue-500"
      case "pdf":
        return "bg-yellow-500"
      case "txt":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent className="p-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Document</h2>
            <p className="text-sm text-gray-600">Listing of Records...</p>
          </div>
          <div className="flex items-center space-x-2">
            <IconButton size="small" className="text-gray-600">
              <Search />
            </IconButton>
            <IconButton size="small" onClick={onClose} className="text-gray-600">
              <Close />
            </IconButton>
          </div>
        </div>

        {/* Document List */}
        <div className="max-h-96 overflow-y-auto">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 transition-colors">
              <div className={`w-12 h-12 rounded-lg ${getIconBgColor(doc.type)} flex items-center justify-center`}>
                {getFileIcon(doc.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{doc.name}</h4>
                <p className="text-sm text-gray-500">{doc.date}</p>
              </div>
              <div className="flex items-center space-x-2">
                <IconButton size="small" className="text-gray-600 hover:bg-gray-200">
                  <Share fontSize="small" />
                </IconButton>
                <IconButton size="small" className="text-gray-600 hover:bg-gray-200">
                  <Download fontSize="small" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
