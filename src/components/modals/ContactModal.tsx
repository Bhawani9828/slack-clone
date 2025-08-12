"use client"
import { Dialog, DialogContent, IconButton, Avatar, Chip } from "@mui/material"
import { Close, Search } from "@mui/icons-material"

interface Contact {
  id: string
  name: string
  message: string
  date: string
  avatar: string
  status: "online" | "sending" | "failed" | "delivered"
  unreadCount?: number
}

const contacts: Contact[] = [
  {
    id: "1",
    name: "Josephin water",
    message: "Hi, i am josephin. ...",
    date: "22/10/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "delivered",
  },
  {
    id: "2",
    name: "Jony Lynetin",
    message: "Hello",
    date: "30/11/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "online",
    unreadCount: 9,
  },
  {
    id: "3",
    name: "Sufiya Elija",
    message: "I need job, please help me",
    date: "15/06/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "sending",
  },
  {
    id: "4",
    name: "Pabelo Mukrani",
    message: "Hi, i am josephin. How are ...",
    date: "Just Now",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "failed",
  },
  {
    id: "5",
    name: "Josephin water",
    message: "Hi, i am josephin. How are ...",
    date: "22/10/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "delivered",
  },
  {
    id: "6",
    name: "Jony Lynetin",
    message: "Hello 😊",
    date: "30/11/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "online",
    unreadCount: 8,
  },
  {
    id: "7",
    name: "Sufiya Elija",
    message: "I need job, please help me.",
    date: "15/06/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "sending",
  },
  {
    id: "8",
    name: "Jony Lynetin",
    message: "Hello 🏠",
    date: "30/11/23",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    status: "delivered",
  },
]

export default function ContactModal({
  open,
  onClose,
  onContactSelect,
}: {
  open: boolean
  onClose: () => void
  onContactSelect: (contactId: string) => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-600"
      case "sending":
        return "text-gray-500"
      case "failed":
        return "text-red-500"
      case "delivered":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  const handleContactClick = (contactId: string) => {
    onContactSelect(contactId)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent className="p-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            <p className="text-sm text-gray-600">Start Without Delay...</p>
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

        {/* Contact List */}
        <div className="max-h-96 overflow-y-auto">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleContactClick(contact.id)}
            >
              <div className="relative">
                <Avatar src={contact.avatar} className="w-12 h-12" />
                {contact.status === "online" && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate">{contact.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{contact.date}</span>
                    {contact.unreadCount && (
                      <Chip
                        label={contact.unreadCount}
                        size="small"
                        className="bg-green-500 text-white text-xs h-5 min-w-5"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600 truncate">{contact.message}</p>
                  <span className={`text-xs ${getStatusColor(contact.status)} capitalize`}>
                    {contact.status === "delivered" ? "✓" : contact.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
