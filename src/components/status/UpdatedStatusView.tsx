"use client"
import React, { useState } from "react"
import { Avatar, IconButton } from "@mui/material"
import { Close } from "@mui/icons-material"
import AddStatusModal from "./AddStatusModal"

export default function StatusView({ isDark, onBackToChat, onStatusAdd }: StatusViewProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const bgColor = isDark ? "bg-gray-900" : "bg-white"
  const borderColor = isDark ? "border-gray-700" : "border-gray-300"

  return (
    <div className={`h-screen w-80 ${bgColor} border-r ${borderColor} flex flex-col`}>
      {/* Header with click handler to open add modal */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setShowAddModal(true)}
        >
          <Avatar src="/placeholder.svg?height=40&width=40" className="w-10 h-10 relative">
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </Avatar>
          <div>
            <h3 className="font-medium text-gray-900">My Status</h3>
            <p className="text-sm text-gray-600">Tap To Add Status Update</p>
          </div>
        </div>
        <IconButton size="small" onClick={onBackToChat} className="text-gray-600">
          <Close />
        </IconButton>
      </div>

      {/* Rest of your status view content */}

      <AddStatusModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={onStatusAdd}
      />
    </div>
  )
}