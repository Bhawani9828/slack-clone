// ContactView.tsx
"use client"
import React from "react"
import { Avatar, IconButton } from "@mui/material"
import { Search, Close } from "@mui/icons-material"

interface Contact {
  id: string
  name: string
  message: string
  date: string
  avatar: string
  status: "online" | "sending" | "failed" | "delivered"
  unreadCount?: number
}

interface ContactViewProps {
  isDark: boolean
  onBackToChat: () => void
  onContactSelect?: (contactId: string) => void
}

const contacts: Contact[] = [
  { id: "1", name: "Josephin water", message: "Hi, i am josephin. ...", date: "22/10/23", avatar: "https://randomuser.me/api/portraits/men/75.jpg", status: "delivered" },
  { id: "2", name: "Jony Lynetin", message: "Hello", date: "30/11/23", avatar: "https://randomuser.me/api/portraits/men/75.jpg", status: "online", unreadCount: 9 },
  { id: "3", name: "Sufiya Elija", message: "I need job, please help me", date: "15/06/23", avatar: "https://randomuser.me/api/portraits/men/75.jpg", status: "sending" },
  { id: "4", name: "Pabelo Mukrani", message: "Hi, i am josephin. How are ...", date: "Just Now", avatar: "https://randomuser.me/api/portraits/men/75.jpg", status: "failed" },
]

export default function ContactView({ isDark, onBackToChat, onContactSelect }: ContactViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-600"
      case "sending": return "text-gray-500"
      case "failed": return "text-red-500"
      case "delivered": return "text-blue-500"
      default: return "text-gray-500"
    }
  }

  const handleContactClick = (contactId: string) => {
    onContactSelect?.(contactId)
    onBackToChat()
  }

  const bgColor = isDark ? "bg-gray-900" : "bg-white"
  const borderColor = isDark ? "border-gray-700" : "border-gray-300"

  return (
    <div className={`h-screen w-100 ${bgColor} border-r ${borderColor} flex flex-col`}>
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
          <IconButton size="small" onClick={onBackToChat} className="text-gray-600">
            <Close />
          </IconButton>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <div key={contact.id} className="flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleContactClick(contact.id)}>
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
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full min-w-5 h-5 flex items-center justify-center">
                      {contact.unreadCount}
                    </div>
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
    </div>
  )
}