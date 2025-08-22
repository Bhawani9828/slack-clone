// ContactListView.tsx
"use client"
import React from "react"
import { Avatar } from "@mui/material"

interface ContactSidebar {
  id: string
  name: string
  avatar: string
  isOnline: boolean
}

interface ContactListViewProps {
  isDark: boolean
  onContactClick: (contactId: string) => void
}

const contactsSidebar: ContactSidebar[] = [
  { id: "1", name: "Josephin water", avatar: "https://randomuser.me/api/portraits/men/75.jpg", isOnline: true },
  { id: "2", name: "Jony Lynetin", avatar: "https://randomuser.me/api/portraits/men/75.jpg", isOnline: false },
  { id: "3", name: "Sufiya Elija", avatar: "https://randomuser.me/api/portraits/men/75.jpg", isOnline: true },
  { id: "4", name: "Pabelo Mukrani", avatar: "https://randomuser.me/api/portraits/men/75.jpg", isOnline: false },
  { id: "5", name: "Kristin Watson", avatar: "https://randomuser.me/api/portraits/men/75.jpg", isOnline: true },
  { id: "6", name: "Lea", avatar: "https://randomuser.me/api/portraits/men/75.jpg", isOnline: false },
]

export default function ContactListView({ isDark, onContactClick }: ContactListViewProps) {
  const textColor = isDark ? "text-white" : "text-gray-900"

  return (
    <>
      {contactsSidebar.map((contact) => (
        <div
          key={contact.id}
          className={`px-4 py-3 ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-50"} cursor-pointer border-b ${isDark ? "border-gray-800" : "border-gray-100"} transition-colors`}
          onClick={() => onContactClick(contact.id)}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar src={contact.avatar} className="w-12 h-12" />
              {contact.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#01aa85] border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium ${textColor} truncate`}>{contact.name}</h4>
              <p className={`text-sm ${isDark ? "!text-gray-400" : "!text-gray-600"}`}>
                {contact.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}