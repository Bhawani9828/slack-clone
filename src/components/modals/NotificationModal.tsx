"use client"
import { Dialog, DialogContent, IconButton, Avatar } from "@mui/material"
import { Close } from "@mui/icons-material"

interface Notification {
  id: string
  name: string
  action: string
  message: string
  avatar?: string
  initials?: string
  bgColor?: string
}

const notifications: Notification[] = [
  {
    id: "1",
    name: "Josephin water",
    action: "Upload New Photos",
    message: "I am very busy at the moment and ...",
    avatar: "/placeholder.svg?height=50&width=50",
  },
  {
    id: "2",
    name: "Jony Today Birthday",
    action: "Upload New Photos",
    message: "I would suggest you discuss this f...",
    initials: "A",
    bgColor: "bg-green-500",
  },
  {
    id: "3",
    name: "Sufiya Elija",
    action: "Comment On your Photo",
    message: "I am very busy at the moment and ...",
    avatar: "/placeholder.svg?height=50&width=50",
  },
  {
    id: "4",
    name: "Pabelo Mukrani",
    action: "Invite Your New Friend",
    message: "I would suggest you discuss this f...",
    avatar: "/placeholder.svg?height=50&width=50",
  },
  {
    id: "5",
    name: "Pabelo Mukrani",
    action: "Invite Your New Friend",
    message: "I am very busy at the moment and ...",
    initials: "AC",
    bgColor: "bg-green-500",
  },
]

export default function NotificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent className="p-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notification</h2>
            <p className="text-sm text-gray-600">Message Archive...</p>
          </div>
          <IconButton size="small" onClick={onClose} className="text-gray-600">
            <Close />
          </IconButton>
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start space-x-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="relative">
                {notification.avatar ? (
                  <Avatar src={notification.avatar} className="w-12 h-12" />
                ) : (
                  <Avatar className={`w-12 h-12 ${notification.bgColor} text-white font-bold`}>
                    {notification.initials}
                  </Avatar>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{notification.name}</h4>
                  <IconButton size="small" className="text-gray-400 hover:text-gray-600">
                    <Close fontSize="small" />
                  </IconButton>
                </div>
                <p className="text-sm text-gray-600 mb-1">{notification.action}</p>
                <p className="text-xs text-gray-500">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
