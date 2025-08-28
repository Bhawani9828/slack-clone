"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { socketService } from "@/lib/socket"
import { createFallbackBeep } from "@/lib/audioUtils"

interface UseCallSocketProps {
  currentUserId: string
}

export const useCallSocket = ({ currentUserId }: UseCallSocketProps) => {
  const [callError, setCallError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isCalling, setIsCalling] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [incomingCall, setIncomingCall] = useState<{
    from: string
    type: "video" | "audio"
    offer: any
    fromName?: string
    callId?: string
  } | null>(null)
  const [deviceStatus, setDeviceStatus] = useState<{
    camera: boolean
    microphone: boolean
    checking: boolean
  }>({ camera: false, microphone: false, checking: false })

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<any>(null)
  const endCallRef = useRef<() => void>(() => {})
  const justAcceptedAtRef = useRef<number>(0)

  const currentCallRef = useRef<{
    targetUserId?: string
    type?: "video" | "audio"
    callId?: string
  }>({})

  // Enhanced error logging function
  const logError = (context: string, error: any) => {
    const errorInfo = {
      context,
      message: error?.message || "Unknown error",
      name: error?.name || "UnknownError",
      stack: error?.stack,
      constraint: error?.constraint,
      code: error?.code,
      toString: error?.toString?.() || String(error),
    }
    console.error(`❌ ${context}:`, errorInfo)
    return errorInfo
  }

  // Check device availability with enhanced error handling
  const checkAndPrepareDevices = useCallback(
    async (constraints: MediaStreamConstraints): Promise<boolean> => {
      try {
        setDeviceStatus((prev) => ({ ...prev, checking: true }))
        setCallError(null)

        console.log("🔍 Starting device check with constraints:", constraints)

        // First, stop any existing streams to free up devices
        if (localStream) {
          console.log("🛑 Stopping existing local stream to free devices...")
          localStream.getTracks().forEach((track) => {
            track.stop()
            console.log(`Stopped ${track.kind} track: ${track.label}`)
          })
          setLocalStream(null)

          await new Promise((resolve) => setTimeout(resolve, 500))
        }

        // Check available devices
        console.log("📋 Enumerating devices...")
        
        // Add safety check
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setCallError("Media devices not supported in this browser")
          setDeviceStatus((prev) => ({ ...prev, checking: false }))
          return false
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        console.log(
          "📋 Available devices:",
          devices.map((d) => ({ kind: d.kind, label: d.label, deviceId: d.deviceId })),
        )

        const hasCamera = devices.some((device) => device.kind === "videoinput")
        const hasMicrophone = devices.some((device) => device.kind === "audioinput")

        console.log("📋 Device availability:", { hasCamera, hasMicrophone })

        setDeviceStatus({
          camera: hasCamera,
          microphone: hasMicrophone,
          checking: false,
        })

        if (constraints.video && !hasCamera) {
          const error = "No camera found. Please connect a camera and try again."
          setCallError(error)
          throw new Error(error)
        }

        if (constraints.audio && !hasMicrophone) {
          const error = "No microphone found. Please connect a microphone and try again."
          setCallError(error)
          throw new Error(error)
        }

        // Try to get temporary stream to check if devices are available
        console.log("🧪 Testing device availability with constraints:", constraints)
        try {
          const testStream = await navigator.mediaDevices.getUserMedia(constraints)
          console.log("✅ Device test successful:", {
            tracks: testStream.getTracks().map((t) => ({ kind: t.kind, label: t.label, enabled: t.enabled })),
          })

          // Stop test stream immediately
          testStream.getTracks().forEach((track) => {
            track.stop()
            console.log(`Stopped test ${track.kind} track: ${track.label}`)
          })

          await new Promise((resolve) => setTimeout(resolve, 200))

          return true
        } catch (testError) {
          const errorInfo = logError("Device test failed", testError)

          // Determine error type and provide specific message
          let errorMessage = "Failed to access camera/microphone."
          const error = testError as DOMException

          if (error.name === "NotReadableError" || errorInfo.message.includes("in use")) {
            createFallbackBeep()
          }

          setCallError(errorMessage)
          throw new Error(errorMessage)
        }
      } catch (error) {
        setDeviceStatus((prev) => ({ ...prev, checking: false }))
        if (error instanceof Error) {
          throw error
        } else {
          const errorInfo = logError("Device check failed", error)
          const errorMessage = `Unexpected error during device check: ${errorInfo.message}`
          setCallError(errorMessage)
          throw new Error(errorMessage)
        }
      }
    },
    [localStream],
  )

  // Enhanced initLocalStream with better error handling and device management
  const initLocalStream = useCallback(
    async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
      try {
        console.log("🎥 Initializing local stream...")

        // Check and prepare devices first
        const devicesReady = await checkAndPrepareDevices(constraints)
        if (!devicesReady) {
          throw new Error("Devices not ready")
        }

        console.log("🎥 Requesting media stream with constraints:", constraints)
        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        console.log(
          "✅ Got media stream with tracks:",
          stream.getTracks().map((t) => ({
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState,
            muted: t.muted,
          })),
        )

        setLocalStream(stream)
        return stream
      } catch (error) {
        const errorInfo = logError("Failed to get user media", error)
        setCallError(`Failed to access camera/microphone: ${errorInfo.message}`)
        return null
      }
    },
    [checkAndPrepareDevices],
  )

  // Simplified socket connection with better error handling
  const ensureSocketConnected = useCallback(async (): Promise<boolean> => {
    try {
      if (socketRef.current?.connected) {
        console.log("✅ Socket already connected")
        return true
      }

      console.log("🔌 Connecting socket for calls...")
      socketService.setCurrentUserId(currentUserId)
      const socket = socketService.connect(currentUserId)

      if (!socket) {
        console.error("❌ Failed to create socket instance")
        return false
      }

      socketRef.current = socket

      if (socket.connected) {
        console.log("✅ Socket connected immediately")
        return true
      }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("⚠️ Socket connection timeout")
          socket.off("connect", onConnect)
          resolve(socket.connected)
        }, 5000)

        const onConnect = () => {
          clearTimeout(timeout)
          socket.off("connect", onConnect)
          console.log("✅ Socket connected for calls")
          resolve(true)
        }

        socket.on("connect", onConnect)
      })
    } catch (error) {
      logError("Socket connection error", error)
      return false
    }
  }, [currentUserId])

  const createPeerConnection = useCallback(
    (stream?: MediaStream) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      })

      const streamToUse = stream || localStream
      if (streamToUse) {
        streamToUse.getTracks().forEach((track) => {
          console.log(`Adding ${track.kind} track to peer connection:`, track.label)
          pc.addTrack(track, streamToUse)
        })
      }

      pc.ontrack = (event) => {
        console.log("📥 Received remote track:", event.track.kind)
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0])
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from
          if (targetUserId && socketRef.current?.connected) {
            socketRef.current.emit("ice-candidate", {
              to: targetUserId,
              from: currentUserId,
              candidate: event.candidate,
              callId: currentCallRef.current.callId,
            })
          }
        }
      }

      pc.onconnectionstatechange = () => {
        console.log("🔗 Peer connection state:", pc.connectionState)
        if (pc.connectionState === "failed") {
          console.error("❌ Peer connection failed")
          setCallError("Connection failed. Please try again.")
        }
      }

      peerConnectionRef.current = pc
      return pc
    },
    [localStream, incomingCall, currentUserId],
  )

  const callUser = useCallback(
    async (userId: string, stream?: MediaStream, callerName?: string) => {
      try {
        console.log("📞 Starting call to:", userId)

        const isConnected = await ensureSocketConnected()
        if (!isConnected && !socketRef.current?.connected) {
          throw new Error("Failed to connect to server. Please check your internet connection.")
        }

        const callId = `${Date.now()}-${currentUserId}`
        currentCallRef.current = {
          targetUserId: userId,
          type: stream && stream.getVideoTracks().length > 0 ? "video" : "audio",
          callId,
        }

        const streamToUse = stream || localStream
        if (!streamToUse) {
          throw new Error("Local stream not initialized.")
        }

        setIsCalling(true)
        setCallError(null)
        const pc = createPeerConnection(streamToUse)

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        console.log("📤 Emitting call-user event with ID:", callId)
        socketRef.current.emit("call-user", {
          to: userId,
          from: currentUserId,
          fromName: callerName || "Unknown Caller",
          offer,
          type: streamToUse.getVideoTracks().length > 0 ? "video" : "audio",
          callId,
        })
      } catch (error) {
        logError("Call failed", error)
        setIsCalling(false)
        currentCallRef.current = {}
        throw error
      }
    },
    [localStream, createPeerConnection, currentUserId, ensureSocketConnected],
  )

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return

    console.log("📞 Accepting call from:", incomingCall.from)
    justAcceptedAtRef.current = Date.now()

    try {
      const constraints = { video: incomingCall.type === "video", audio: true }
      console.log("🎥 Getting media for accept call:", constraints)

      const stream = await initLocalStream(constraints)
      if (!stream) {
        throw new Error("Failed to initialize local stream for call")
      }

      console.log("✅ Got local stream for accept call")

      currentCallRef.current = {
        targetUserId: incomingCall.from,
        type: incomingCall.type,
        callId: incomingCall.callId,
      }

      setIsInCall(true)
      setIsCalling(false)

      const pc = createPeerConnection(stream)
      console.log("🔗 Created peer connection, setting remote description")

      await pc.setRemoteDescription(incomingCall.offer)
      console.log("✅ Set remote description")

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log("✅ Created and set local description (answer)")

      socketRef.current?.emit("call-accepted", {
        to: incomingCall.from,
        from: currentUserId,
        answer,
        callId: incomingCall.callId,
      })

      console.log("📤 Sent call-accepted event")
      setIncomingCall(null)
    } catch (error) {
      const errorInfo = logError("Accept call failed", error)

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }

      setIsInCall(false)
      setIsCalling(false)

      const errorMessage = callError || `Failed to accept call: ${errorInfo.message}`
      alert(errorMessage)

      setTimeout(() => {
        setIncomingCall(null)
        currentCallRef.current = {}
      }, 1000)
    }
  }, [incomingCall, initLocalStream, createPeerConnection, currentUserId, callError, localStream])

  const rejectCall = useCallback(() => {
    if (!incomingCall) return

    socketRef.current?.emit("call-rejected", {
      to: incomingCall.from,
      from: currentUserId,
      callId: incomingCall.callId,
    })

    setIncomingCall(null)
    currentCallRef.current = {}
  }, [incomingCall, currentUserId])

  const endCall = useCallback(() => {
    const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from

    console.log("📞 Ending call with:", targetUserId)

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped local ${track.kind} track:`, track.label)
      })
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped remote ${track.kind} track:`, track.label)
      })
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (targetUserId && socketRef.current?.connected) {
      socketRef.current.emit("end-call", {
        to: targetUserId,
        from: currentUserId,
        callId: currentCallRef.current.callId,
      })
    }

    setLocalStream(null)
    setRemoteStream(null)
    setIsCalling(false)
    setIsInCall(false)
    setIncomingCall(null)
    setCallError(null)
    currentCallRef.current = {}
  }, [localStream, remoteStream, incomingCall, currentUserId])

  useEffect(() => {
    endCallRef.current = endCall
  }, [endCall])

  // Fixed socket setup effect using direct socket event listeners
  useEffect(() => {
    if (!currentUserId) return

    const initSocket = async () => {
      try {
        await ensureSocketConnected()
        const socket = socketRef.current
        if (!socket) {
          console.warn("⚠️ Socket not available, retrying...")
          return
        }

        console.log("📡 Setting up call event listeners...")

        // Define event handlers
        const handleIncomingCall = (data: any) => {
          console.log("📞 Incoming call received:", data)
          
          if (!data || data.from === currentUserId || !data.offer || !data.callId) {
            console.log("📞 Invalid incoming call data, ignoring")
            return
          }

          if (incomingCall && incomingCall.callId === data.callId) {
            console.log("📞 Duplicate incoming call ignored (same callId)")
            return
          }

          currentCallRef.current.callId = data.callId
          setIncomingCall({
            from: data.from,
            type: data.type || "video",
            offer: data.offer,
            fromName: data.fromName || "Unknown Caller",
            callId: data.callId,
          })

          console.log("📞 Incoming call state set with callId:", data.callId)
        }

        const handleCallAccepted = async (data: any) => {
          console.log("✅ Call accepted:", data)

          if (!data?.callId || data.callId !== currentCallRef.current.callId) {
            console.log(
              "❌ Call ID mismatch for accepted call, expected:",
              currentCallRef.current.callId,
              "got:",
              data?.callId,
            )
            return
          }

          if (peerConnectionRef.current && data.answer) {
            try {
              await peerConnectionRef.current.setRemoteDescription(data.answer)
              setIsCalling(false)
              setIsInCall(true)
              console.log("✅ Call established successfully")
            } catch (error) {
              logError("Error setting remote description", error)
              setCallError("Failed to establish connection")
            }
          }
        }

        const handleCallRejected = (data: any) => {
          console.log("❌ Call rejected:", data)
          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log("❌ Call ID mismatch for rejected call, ignoring")
            return
          }
          setIsCalling(false)
          setIsInCall(false)
          setIncomingCall(null)
          currentCallRef.current = {}
        }

        const handleCallEnded = (data: any) => {
          console.log("📞 Call ended:", data)

          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log(
              "❌ Call ID mismatch for end call, expected:",
              currentCallRef.current.callId,
              "got:",
              data?.callId,
            )
            return
          }

          if (Date.now() - justAcceptedAtRef.current < 2000) {
            console.warn("⚠️ Ignoring spurious call-ended right after accept")
            return
          }

          endCallRef.current?.()
        }

        const handleIceCandidate = async (data: any) => {
          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log("❄️ ICE candidate callId mismatch, ignoring")
            return
          }

          if (peerConnectionRef.current && data.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(data.candidate)
            } catch (error) {
              logError("Error adding ICE candidate", error)
            }
          }
        }

        // Clear existing listeners
        const events = ["incoming-call", "call-accepted", "call-rejected", "call-ended", "ice-candidate"]
        events.forEach((event) => socket.off(event))

        // Set up new event listeners
        socket.on("incoming-call", handleIncomingCall)
        socket.on("call-accepted", handleCallAccepted)
        socket.on("call-rejected", handleCallRejected)
        socket.on("call-ended", handleCallEnded)
        socket.on("ice-candidate", handleIceCandidate)

        console.log("✅ Call event listeners setup complete")

        // Return cleanup function
        return () => {
          events.forEach((event) => socket.off(event))
        }
      } catch (error) {
        logError("Error initializing socket for calls", error)
        return undefined
      }
    }

    let cleanup: (() => void) | undefined

    const initTimeout = setTimeout(async () => {
      cleanup = await initSocket()
    }, 100)

    return () => {
      clearTimeout(initTimeout)
      cleanup?.()
    }
  }, [currentUserId, ensureSocketConnected, incomingCall])

  // Cleanup effect
  useEffect(() => {
    return () => {
      endCallRef.current?.()
    }
  }, [])

  return {
    localStream,
    remoteStream,
    incomingCall,
    isCalling,
    isInCall,
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    callError,
    deviceStatus,
    initLocalStream,
    ensureSocketConnected,
    checkAndPrepareDevices,
    debugInfo: {
      currentUserId,
      socketConnected: !!socketRef.current?.connected,
      currentCall: currentCallRef.current,
      hasIncomingCall: !!incomingCall,
    },
  }
}