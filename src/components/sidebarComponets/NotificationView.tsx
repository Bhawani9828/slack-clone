// NotificationView.tsx
"use client"
import React from "react"
import { Avatar, IconButton } from "@mui/material"
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

interface NotificationViewProps {
  isDark: boolean
  onBackToChat: () => void
}

const notifications: Notification[] = [
  { id: "1", name: "Josephin water", action: "Upload New Photos", message: "I am very busy at the moment and ...", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "2", name: "Jony Today Birthday", action: "Upload New Photos", message: "I would suggest you discuss this f...", initials: "A", bgColor: "bg-green-500" },
  { id: "3", name: "Sufiya Elija", action: "Comment On your Photo", message: "I am very busy at the moment and ...", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
]

export default function NotificationView({ isDark, onBackToChat }: NotificationViewProps) {
  const bgColor = isDark ? "bg-[#020d0b]" : "bg-white"
  const textColor = isDark ? "text-white" : "text-gray-900"
  const textSecondaryColor = isDark ? "text-gray-400" : "text-gray-600"
  const textTertiaryColor = isDark ? "text-gray-500" : "text-gray-500"
  const borderColor = isDark ? "border-gray-700" : "border-gray-200"
  const hoverBg = isDark ? "hover:bg-gray-800" : "hover:bg-gray-50"

  return (
    <div className={`h-screen w-100 ${bgColor} border-r ${borderColor} flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
        <div>
          <h2 className={`text-lg font-semibold ${textColor}`}>Notification</h2>
          <p className={`text-sm ${textSecondaryColor}`}>Message Archive...</p>
        </div>
        <IconButton 
          size="small" 
          onClick={onBackToChat} 
          className={`${isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-200"}`}
        >
          <Close />
        </IconButton>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <div key={notification.id} className={`flex items-start space-x-3 p-4 ${hoverBg} transition-colors`}>
            <div className="relative">
              {notification.avatar ? (
                <Avatar src={notification.avatar} className="!w-12 !h-12" />
              ) : (
                <Avatar className={`!w-12 !h-12 ${notification.bgColor} text-white font-bold`}>
                  {notification.initials}
                </Avatar>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium ${textColor}`}>{notification.name}</h4>
                <IconButton 
                  size="small" 
                  className={`${isDark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
                >
                  <Close fontSize="small" />
                </IconButton>
              </div>
              <p className={`text-sm ${textSecondaryColor} mb-1`}>{notification.action}</p>
              <p className={`text-xs ${textTertiaryColor}`}>{notification.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}