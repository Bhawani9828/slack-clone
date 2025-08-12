"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, IconButton, Avatar } from "@mui/material"
import { CallEnd, Mic, MicOff, Videocam, VideocamOff, Fullscreen, VolumeUp } from "@mui/icons-material"

interface VideoCallProps {
  open: boolean
  onClose: () => void
  contact: {
    name: string
    location: string
    avatar: string
  }
}

export default function VideoCallModal({ open, onClose, contact }: VideoCallProps) {
  const [callDuration, setCallDuration] = useState("00:00:00")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  useEffect(() => {
    if (open) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const hours = Math.floor(elapsed / 3600000)
        const minutes = Math.floor((elapsed % 3600000) / 60000)
        const seconds = Math.floor((elapsed % 60000) / 1000)
        setCallDuration(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        )
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth className="video-call-modal">
      <DialogContent className="p-0 bg-black relative h-screen">
        {/* Call Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center space-x-3 text-white">
            <Avatar src={contact.avatar} className="w-10 h-10" />
            <div>
              <h3 className="font-medium">{contact.name}</h3>
              <p className="text-sm text-gray-300">{contact.location}</p>
            </div>
          </div>
          <div className="text-center mt-2">
            <p className="text-white font-mono">{callDuration}</p>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="relative h-full bg-gray-900">
          {/* Remote Video (Main) */}
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
            <img
              src="/placeholder.svg?height=600&width=800"
              alt="Remote participant"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-20 left-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
            <img
              src="/placeholder.svg?height=200&width=300"
              alt="Local participant"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Fullscreen Button */}
          <IconButton className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50">
            <Fullscreen />
          </IconButton>
        </div>

        {/* Call Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="flex items-center justify-center space-x-6">
            <IconButton
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"} text-white`}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </IconButton>

            <IconButton
              onClick={onClose}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white"
              sx={{ width: 64, height: 64 }}
            >
              <CallEnd />
            </IconButton>

            <IconButton
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`w-14 h-14 ${isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"} text-white`}
            >
              {isVideoOff ? <VideocamOff /> : <Videocam />}
            </IconButton>

            <IconButton className="w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white">
              <VolumeUp />
            </IconButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
