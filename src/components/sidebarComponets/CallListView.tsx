// CallListView.tsx
"use client"
import React from "react"
import { Avatar } from "@mui/material"
import { CallReceived, CallMade, CallMissed, Call } from "@mui/icons-material"

interface CallLog {
  id: string
  name: string
  type: string
  time: string
  avatar: string
}

interface CallListViewProps {
  activeCallFilter: "all" | "incoming" | "outgoing" | "missed"
  setActiveCallFilter: (filter: "all" | "incoming" | "outgoing" | "missed") => void
  isDark: boolean
}

const callLogsSidebar: CallLog[] = [
  { id: "1", name: "Jony Lynetin", type: "incoming", time: "3:10 pm", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "2", name: "Josephin water", type: "outgoing", time: "3:30 pm", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "3", name: "Mari", type: "missed", time: "Yesterday", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "4", name: "Kristin Watson", type: "incoming", time: "2 days ago", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "5", name: "Lea", type: "outgoing", time: "Last week", avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
]

export default function CallListView({ activeCallFilter, setActiveCallFilter, isDark }: CallListViewProps) {
  const textColor = isDark ? "text-white" : "text-gray-900"
  const bgColor = isDark ? "bg-gray-900" : "bg-white"
  const borderColor = isDark ? "border-gray-700" : "border-gray-300"

  const getCallIcon = (type: string) => {
    switch (type) {
      case "incoming": return <CallReceived className="text-green-600 text-sm" />
      case "outgoing": return <CallMade className="text-green-600 text-sm" />
      case "missed": return <CallMissed className="text-red-500 text-sm" />
      default: return <Call className="text-gray-500 text-sm" />
    }
  }

  return (
    <>
      {/* Call Sub-tabs */}
      <div className={`px-4 py-2 ${bgColor} border-b ${borderColor}`}>
        <div className="flex space-x-2">
          {["all", "incoming", "outgoing", "missed"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveCallFilter(filter as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                activeCallFilter === filter
                  ? "bg-[#01aa85] text-white"
                  : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Call Log List */}
      {callLogsSidebar
        .filter((log) => activeCallFilter === "all" || log.type === activeCallFilter)
        .map((log) => (
          <div
            key={log.id}
            className={`px-4 py-3 ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-50"} cursor-pointer border-b ${isDark ? "border-gray-800" : "border-gray-100"} transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar src={log.avatar} className="w-12 h-12" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${textColor} truncate`}>{log.name}</h4>
                  <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{log.time}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-sm truncate ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {log.type === "missed" ? "Missed Call" : "Call"}
                  </p>
                  {getCallIcon(log.type)}
                </div>
              </div>
            </div>
          </div>
        ))}
    </>
  )
}