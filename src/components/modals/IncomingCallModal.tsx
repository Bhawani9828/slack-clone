"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, Avatar, IconButton } from "@mui/material"
import { CallEnd, Call, Videocam, Phone } from "@mui/icons-material"
import { IncomingCall } from "@/hooks/useCallSocket"

interface IncomingCallModalProps {
  open: boolean
  onClose: () => void
  incomingCall: IncomingCall | null
  onAccept: (callId: string) => void
  onReject: (callId: string) => void
}

export default function IncomingCallModal({ 
  open, 
  onClose, 
  incomingCall, 
  onAccept, 
  onReject 
}: IncomingCallModalProps) {
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    if (open && incomingCall) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

      // Auto-reject call after 30 seconds
      const timeout = setTimeout(() => {
        if (open) {
          console.log('⏰ Call timeout - auto-rejecting');
          onReject(incomingCall.id);
        }
      }, 30000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }
  }, [open, incomingCall, onReject])

  if (!incomingCall) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAccept = () => {
    onAccept(incomingCall.id)
  }

  const handleReject = () => {
    onReject(incomingCall.id)
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      className="incoming-call-modal"
    >
      <DialogContent className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          {/* Caller Avatar */}
          <div className="mb-6">
            <Avatar 
              src={incomingCall.callerAvatar} 
              className="w-24 h-24 mx-auto mb-4 border-4 border-white shadow-lg"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {incomingCall.callerName}
            </h2>
            <p className="text-gray-600 mb-1">
              {incomingCall.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'}
            </p>
            {callDuration > 0 && (
              <p className="text-sm text-gray-500 font-mono">
                {formatTime(callDuration)}
              </p>
            )}
          </div>

          {/* Call Type Icon */}
          <div className="mb-6">
            {incomingCall.type === 'video' ? (
              <Videocam className="w-16 h-16 text-blue-600 mx-auto" />
            ) : (
              <Phone className="w-16 h-16 text-blue-600 mx-auto" />
            )}
          </div>

          {/* Call Actions */}
          <div className="flex justify-center space-x-6">
            {/* Accept Button */}
            <IconButton
              onClick={handleAccept}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white shadow-lg"
              sx={{ width: 64, height: 64 }}
            >
              <Call className="w-8 h-8" />
            </IconButton>

            {/* Reject Button */}
            <IconButton
              onClick={handleReject}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white shadow-lg"
              sx={{ width: 64, height: 64 }}
            >
              <CallEnd className="w-8 h-8" />
            </IconButton>
          </div>

          {/* Call Status */}
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Swipe up to answer • Swipe down to decline
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}