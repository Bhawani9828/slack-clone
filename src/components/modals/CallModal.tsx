"use client"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, Avatar, IconButton, Typography, Box } from "@mui/material"
import { 
  CallEnd, 
  Mic, 
  MicOff, 
  Videocam, 
  VideocamOff, 
  VolumeUp, 
  VolumeOff,
  Call,
  CallReceived
} from "@mui/icons-material"
import { IncomingCall } from "@/hooks/useCallSocket"

interface CallModalProps {
  open: boolean
  onClose: () => void
  incomingCall: IncomingCall | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isIncoming: boolean
  isInCall: boolean
  isCalling: boolean
  onAccept: () => void
  onReject: () => void
  onEndCall: () => void
  onToggleMic: () => void
  onToggleVideo: () => void
  onToggleSpeaker: () => void
  isMicOn: boolean
  isVideoOn: boolean
  isSpeakerOn: boolean
  callerName: string
  callerAvatar?: string
}

export default function CallModal({
  open,
  onClose,
  incomingCall,
  localStream,
  remoteStream,
  isIncoming,
  isInCall,
  isCalling,
  onAccept,
  onReject,
  onEndCall,
  onToggleMic,
  onToggleVideo,
  onToggleSpeaker,
  isMicOn,
  isVideoOn,
  isSpeakerOn,
  callerName,
  callerAvatar
}: CallModalProps) {
  const [callDuration, setCallDuration] = useState(0)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Handle video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Call duration timer
  useEffect(() => {
    if (open && (isInCall || isCalling)) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [open, isInCall, isCalling])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAccept = () => {
    onAccept()
  }

  const handleReject = () => {
    onReject()
    onClose()
  }

  const handleEndCall = () => {
    onEndCall()
    onClose()
  }

  // Don't render if not open
  if (!open) return null

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={false} 
      fullWidth
      className="call-modal"
    >
      <DialogContent className="p-0 bg-black relative h-screen">
        {/* Call Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center space-x-3 text-white">
            <Avatar src={callerAvatar} className="w-10 h-10" />
            <div>
              <Typography variant="h6" className="font-medium">
                {callerName}
              </Typography>
              <Typography variant="body2" className="text-gray-300">
                {isIncoming ? 'Incoming Call' : isCalling ? 'Calling...' : 'In Call'}
              </Typography>
            </div>
          </div>
          {callDuration > 0 && (
            <div className="text-center mt-2">
              <Typography variant="body2" className="text-white font-mono">
                {formatTime(callDuration)}
              </Typography>
            </div>
          )}
        </div>

        {/* Main Video Area */}
        <div className="relative h-full bg-gray-900">
          {/* Remote Video (Main) */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              <div className="text-center text-white">
                <Avatar src={callerAvatar} className="w-32 h-32 mx-auto mb-4" />
                <Typography variant="h5" className="mb-2">
                  {callerName}
                </Typography>
                <Typography variant="body1" className="text-gray-300">
                  {isIncoming ? 'Incoming Call' : isCalling ? 'Calling...' : 'Connecting...'}
                </Typography>
              </div>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          {localStream && isVideoOn && (
            <div className="absolute bottom-20 left-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Call Status Overlay */}
          {isIncoming && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <Avatar src={callerAvatar} className="w-32 h-32 mx-auto mb-6" />
                <Typography variant="h4" className="mb-2">
                  {callerName}
                </Typography>
                <Typography variant="h6" className="mb-6 text-gray-300">
                  Incoming {incomingCall?.type === 'video' ? 'Video' : 'Voice'} Call
                </Typography>
                
                {/* Accept/Reject Buttons */}
                <div className="flex justify-center space-x-6">
                  <IconButton
                    onClick={handleAccept}
                    className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white"
                    sx={{ width: 64, height: 64 }}
                  >
                    <Call className="w-8 h-8" />
                  </IconButton>
                  
                  <IconButton
                    onClick={handleReject}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white"
                    sx={{ width: 64, height: 64 }}
                  >
                    <CallEnd className="w-8 h-8" />
                  </IconButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Call Controls - Only show when in call or calling */}
        {(isInCall || isCalling) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
            <div className="flex items-center justify-center space-x-6">
              {/* Mic Toggle */}
              <IconButton
                onClick={onToggleMic}
                className={`w-14 h-14 ${isMicOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"} text-white`}
              >
                {isMicOn ? <Mic /> : <MicOff />}
              </IconButton>

              {/* End Call */}
              <IconButton
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white"
                sx={{ width: 64, height: 64 }}
              >
                <CallEnd />
              </IconButton>

              {/* Video Toggle - Only for video calls */}
              {incomingCall?.type === 'video' && (
                <IconButton
                  onClick={onToggleVideo}
                  className={`w-14 h-14 ${isVideoOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"} text-white`}
                >
                  {isVideoOn ? <Videocam /> : <VideocamOff />}
                </IconButton>
              )}

              {/* Speaker Toggle */}
              <IconButton
                onClick={onToggleSpeaker}
                className={`w-14 h-14 ${isSpeakerOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"} text-white`}
              >
                {isSpeakerOn ? <VolumeUp /> : <VolumeOff />}
              </IconButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}