




"use client"
import React, { useEffect, useState } from "react"
import { Avatar, IconButton } from "@mui/material"
import { Search, Close } from "@mui/icons-material"
import { useSelector, useDispatch } from "react-redux"
import { AppDispatch, RootState } from "@/lib/store"
import { fetchChatUsers } from "@/lib/store/slices/userSlice"

interface ContactViewProps {
  isDark: boolean
  onBackToChat: () => void
  onContactSelect?: (contactId: string) => void
}

export default function ContactView({ isDark, onBackToChat, onContactSelect }: ContactViewProps) {
  const dispatch = useDispatch<AppDispatch>() 
  const chatusers = useSelector((state: RootState) => state.user.chatusers)
  const isLoadingUsers = useSelector((state: RootState) => state.user.isLoadingUsers)
  const currentUserId = useSelector((state: RootState) => state.user.currentUser?._id)

  const [search, setSearch] = useState("")

  useEffect(() => {
    dispatch(fetchChatUsers(search))
  }, [dispatch, search])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-600"
      case "sending": return "text-gray-500"
      case "failed": return "text-red-500"
      case "delivered": return "text-blue-500"
      default: return "text-gray-500"
    }
  }

  // Determines if user is online based on lastSeen
function formatLastSeen(lastSeen?: string) {
  if (!lastSeen) return { isOnline: false, time: "--:--" };

  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60
  const isOnline = diffMinutes <= 5
  const time = lastSeenDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return { isOnline, time }
}

  const handleContactClick = (contactId: string) => {
    onContactSelect?.(contactId)
    onBackToChat()
  }

  const bgColor = isDark ? "bg-gray-900" : "bg-white"
  const borderColor = isDark ? "border-gray-700" : "border-gray-300"

  // Only show other users
  const contacts = chatusers.filter(user => user.id !== currentUserId)

  return (
    <div className={`h-screen w-100 ${bgColor} border-r ${borderColor} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold ">Contacts</h2>
          <p className="text-sm text-gray-600">Start chatting immediately...</p>
        </div>
        <div className="flex items-center space-x-2">
          <IconButton size="small" className="!text-gray-600">
            <Search />
          </IconButton>
          <IconButton size="small" onClick={onBackToChat} className="!text-gray-600">
            <Close />
          </IconButton>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingUsers && (
          <div className="p-4 text-center !text-gray-500">Loading users...</div>
        )}

        {contacts.map(contact => {
  // Use lastSeen from backend instead of contact.time
  const { isOnline, time } = formatLastSeen((contact as any).lastSeen || new Date().toISOString())


  return (
    <div
      key={contact.id}
      className="flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => handleContactClick(contact.id)}
    >
      <div className="relative">
        <Avatar src={contact.avatar} className="w-12 h-12" />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium  truncate">{contact.name}</h4>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">{time}</span>
            {contact.unreadCount > 0 && (
              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full min-w-5 h-5 flex items-center justify-center">
                {contact.unreadCount}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-600 truncate">{contact.lastMessage}</p>
          <span className={`text-xs ${getStatusColor(isOnline ? "online" : "delivered")}`}>
            {isOnline ? "Online" : "✓"}
          </span>
        </div>
      </div>
    </div>
  )
})}


        {contacts.length === 0 && !isLoadingUsers && (
          <div className="p-4 text-center text-gray-500">No contacts found.</div>
        )}
      </div>
    </div>
  )
}
