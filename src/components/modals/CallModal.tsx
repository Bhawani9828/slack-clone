"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { socketService } from "@/lib/socket"
import { createFallbackBeep, playIncomingCallSound, stopIncomingCallSound } from "@/lib/audioUtils";
interface UseCallSocketProps {
  currentUserId: string
}

import { X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Maximize2 } from 'lucide-react';

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
  const pendingRemoteCandidatesRef = useRef<any[]>([])
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ])

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
        const devices = await navigator.mediaDevices.enumerateDevices()
        console.log(
          "📋 Available devices:",
          devices.map((d) => ({ kind: d.kind, label: d.label, deviceId: d.deviceId })),
        )

        const hasCamera = devices.some((device) => device.kind === "videoinput")
        const hasMicrophone = devices.some((device) => device.kind === "audioinput")

        console.log("📋 Device availability:", { hasCamera, hasMicrophone })

         // ✅ ADD THIS SAFETY CHECK
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setCallError("Media devices not supported in this browser");
        setDeviceStatus((prev) => ({ ...prev, checking: false }));
        return false;
      }

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
  createFallbackBeep();
}

          setCallError(errorMessage)
          throw new Error(errorMessage)
        }
      } catch (error) {
        setDeviceStatus((prev) => ({ ...prev, checking: false }))
        if (error instanceof Error) {
          // Error already logged and handled above
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
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })

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

      // Use the enhanced initLocalStream
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

      // Drain any queued ICE candidates received before PC/remote description was ready
      try {
        while (pendingRemoteCandidatesRef.current.length) {
          const cand = pendingRemoteCandidatesRef.current.shift()
          await pc.addIceCandidate(cand)
        }
      } catch (e) {
        logError("Error draining queued ICE candidates (accept)", e)
      }

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
      stopIncomingCallSound()
    } catch (error) {
      const errorInfo = logError("Accept call failed", error)

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }

      setIsInCall(false)
      setIsCalling(false)

      // Show user-friendly error message
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
    stopIncomingCallSound()
    currentCallRef.current = {}
  }, [incomingCall, currentUserId])

  const endCall = useCallback(() => {
    const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from

    console.log("📞 Ending call with:", targetUserId)

    // Stop tracks
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

    // Close PC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Notify other side
    if (targetUserId && socketRef.current?.connected) {
      socketRef.current.emit("end-call", {
        to: targetUserId,
        from: currentUserId,
        callId: currentCallRef.current.callId,
      })
    }

    // Reset state
    setLocalStream(null)
    setRemoteStream(null)
    setIsCalling(false)
    setIsInCall(false)
    setIncomingCall(null)
    setCallError(null)
    stopIncomingCallSound()
    currentCallRef.current = {}
  }, [localStream, remoteStream, incomingCall, currentUserId])

  useEffect(() => {
    endCallRef.current = endCall
  }, [endCall])
   useEffect(() => {
    socketService.onIncomingCall((data) => {
      setIncomingCall(data) // Modal open logic
      playIncomingCallSound()
    })
    socketService.onCallAccepted((_data) => {
      stopIncomingCallSound()
    })
    // ...other listeners...

    return () => {
      socketService.offIncomingCall()
      socketService.offCallAccepted()
    }
  }, [currentUserId])

  // Main socket setup effect - Enhanced with better call ID handling
  useEffect(() => {
    if (!currentUserId) return

    let cleanup: (() => void) | undefined

    const initSocket = async () => {
      try {
        await ensureSocketConnected()
        const socket = socketRef.current
        if (!socket) {
          console.warn("⚠️ Socket not available, retrying...")
          return
        }

        console.log("📡 Setting up call event listeners...")

        // Clear existing listeners
        // const events = ["incoming-call", "call-accepted", "call-rejected", "call-ended", "ice-candidate"]
        // events.forEach((event) => socket.off(event))

        const handleIncomingCall = (data: any) => {
          console.log("📞 Incoming call received:", data)
          setIncomingCall(data);
  setTimeout(() => {
    console.log("📞 incomingCall state after set:", incomingCall);
  }, 500);

          if (!data || data.from === currentUserId || !data.offer || !data.callId) {
            console.log("📞 Invalid incoming call data, ignoring")
            return
          }

          // Check for duplicate calls using callId
          if (incomingCall && incomingCall.callId === data.callId) {
            console.log("📞 Duplicate incoming call ignored (same callId)")
            return
          }

          // Store call ID and show incoming call
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
              // Drain queued candidates now that remote description is set
              try {
                while (pendingRemoteCandidatesRef.current.length) {
                  const cand = pendingRemoteCandidatesRef.current.shift()
                  await peerConnectionRef.current.addIceCandidate(cand)
                }
              } catch (e) {
                logError("Error draining queued ICE candidates (offerer)", e)
              }
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
          stopIncomingCallSound()
        }

        

        const handleIceCandidate = async (data: any) => {
          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log("❄️ ICE candidate callId mismatch, ignoring")
            return
          }
//           const events = ["incoming-call", "call-accepted", "call-rejected", "call-ended", "ice-candidate"];
// events.forEach((event) => socket.off(event));

          if (data.candidate) {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              try {
                await peerConnectionRef.current.addIceCandidate(data.candidate)
              } catch (error) {
                logError("Error adding ICE candidate", error)
              }
            } else {
              // Queue until PC and remote description are ready
              pendingRemoteCandidatesRef.current.push(data.candidate)
            }
          }
        }

        

        // Set up event listeners
        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-accepted", handleCallAccepted)
        socket.on("call-rejected", handleCallRejected)
        socket.on("call-ended", handleCallEnded)
        socket.on("ice-candidate", handleIceCandidate)

        console.log("✅ Call event listeners setup complete")

        // cleanup = () => {
        //   events.forEach((event) => socket.off(event))
        // }
      } catch (error) {
        logError("Error initializing socket for calls", error)
      }
    }

    const initTimeout = setTimeout(initSocket, 100)
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

  // Dynamically resolve ICE servers from env (supports OpenRelay/Metered API)
  useEffect(() => {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
    const turnApiUrl = process.env.NEXT_PUBLIC_TURN_API_URL

    const base: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]

    // Static TURN from env
    if (turnUrl && turnUsername && turnCredential) {
      base.push({ urls: turnUrl, username: turnUsername, credential: turnCredential })
    }

    iceServersRef.current = base

    // Dynamic TURN via API (preferred for Metered OpenRelay)
    const fetchIce = async () => {
      if (!turnApiUrl) return
      try {
        const res = await fetch(turnApiUrl, { cache: "no-store" })
        const data = await res.json()
        const apiServers: RTCIceServer[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.iceServers)
            ? (data as any).iceServers
            : []
        if (apiServers.length) {
          iceServersRef.current = [...base, ...apiServers]
          console.log("✅ Loaded dynamic ICE servers from TURN API")
        }
      } catch (e) {
        console.warn("⚠️ Failed to load TURN API credentials, using static/default ICE servers", e)
      }
    }
    fetchIce()
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



interface CallModalProps {
  open: boolean;
  onClose: () => void;
  incomingCall?: {
    from: string;
    type: 'video' | 'audio';
    offer: any;
    fromName?: string;
    callId?: string;
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isIncoming: boolean;
  isInCall: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  isMicOn: boolean;
  isVideoOn: boolean;
  isSpeakerOn: boolean;
  callerName: string;
  callerAvatar?: string;
  callError?: string | null;
  deviceStatus?: {
    camera: boolean;
    microphone: boolean;
    checking: boolean;
  };
}

export default function CallModal({
  open,
  onClose,
  incomingCall,
  localStream,
  remoteStream,
  isIncoming,
  isInCall,
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
  callerAvatar,
  callError,
  deviceStatus,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const callStartTimeRef = useRef<number | null>(null);

  // Setup video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log('📹 Local video stream attached');
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = true;
      console.log('📹 Remote video stream attached');
    }
  }, [remoteStream]);

  // Setup audio stream for audio calls - This fixes the audio issue
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.8;
      console.log('🔊 Remote audio stream attached');
    }
  }, [remoteStream, isSpeakerOn]);

  // Ringtone management - Fixed with better error handling
  useEffect(() => {
    const manageRingtone = async () => {
      if (isIncoming && !isInCall && open) {
        setIsRinging(true);
        console.log('📞 Starting ringtone');
        
        if (ringtoneRef.current) {
          try {
            // Set volume and play
            ringtoneRef.current.volume = 0.7;
            ringtoneRef.current.currentTime = 0;
            
            const playPromise = ringtoneRef.current.play();
            if (playPromise) {
              await playPromise;
              console.log('📞 Ringtone playing');
            }
          } catch (error) {
            console.warn('⚠️ Ringtone autoplay blocked:', error);
            setAutoplayBlocked(true);
          }
        }
      } else {
        setIsRinging(false);
        console.log('📞 Stopping ringtone');
        
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
      }
    };

    manageRingtone();

    // Cleanup
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };
  }, [isIncoming, isInCall, open]);

  // Call duration timer
  useEffect(() => {
    if (isInCall && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
    }

    if (!isInCall) {
      callStartTimeRef.current = null;
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isInCall]);

  // Show error handling
  useEffect(() => {
    if (callError) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [callError]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async () => {
    try {
      setShowError(false);
      setIsRinging(false);
      // Stop ringtone when accepting call
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      await onAccept();
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleRejectCall = () => {
    setIsRinging(false);
    // Stop ringtone when rejecting call
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    onReject();
  };

  const isVideoCall = incomingCall?.type === 'video' || (localStream && localStream.getVideoTracks().length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      {/* Hidden audio elements */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />
      
      {/* Ringtone audio element with proper ringtone */}
      <audio
        ref={ringtoneRef}
        loop
        preload="auto"
        className="hidden"
        crossOrigin="anonymous"
      >
        {/* Using a proper ringtone URL - you can replace with your own */}
        <source src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" type="audio/wav" />
        {/* Fallback ringtone */}
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELIHO8tiINwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELI=" type="audio/wav" />
      </audio>
      
      <div className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl ${
        isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl h-[600px]'
      } relative overflow-hidden`}>
        
        {/* Header Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isRinging ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
              <div className="text-white">
                <h2 className="text-lg font-semibold">
                  {isIncoming ? (isRinging ? 'Incoming Call 📞' : 'Incoming Call') : isInCall ? 'Connected' : 'Calling...'}
                </h2>
                <p className="text-sm text-gray-300">{callerName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isInCall && (
                <div className="bg-black/30 px-3 py-1 rounded-full">
                  <p className="text-white text-sm font-mono">
                    {formatDuration(callDuration)}
                  </p>
                </div>
              )}
              
              {isVideoCall && (
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={onClose}
                disabled={isInCall && !!remoteStream}
                className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {showError && callError && (
          <div className="absolute top-20 left-4 right-4 bg-red-500/90 backdrop-blur text-white p-4 rounded-lg z-20">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">Connection Error</p>
                <p className="text-sm mt-1 opacity-90">{callError}</p>
              </div>
              <button 
                onClick={() => setShowError(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="h-full flex flex-col pt-20 pb-6">
          {/* Video/Avatar Area */}
          <div className="flex-1 relative">
            {isVideoCall ? (
              // Video Call Layout
              <div className="w-full h-full relative bg-black rounded-lg overflow-hidden mx-4">
                {/* Remote Video (Main) */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Placeholder when no remote stream
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      {callerAvatar ? (
                        <img 
                          src={callerAvatar} 
                          alt={callerName}
                          className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/20"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 border-4 border-white/20">
                          <span className="text-4xl text-white font-bold">
                            {callerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p className="text-white text-xl font-medium">{callerName}</p>
                      <p className="text-gray-300 text-sm mt-2">
                        {isIncoming ? (isRinging ? '📞 Ringing...' : 'Video calling...') : 'Connecting...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Local Video (Picture-in-Picture) */}
                {localStream && (
                  <div className="absolute top-4 right-4 w-40 h-30 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!isVideoOn && (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Audio Call Layout
              <div className="w-full h-full flex items-center justify-center px-4">
                <div className="text-center">
                  {callerAvatar ? (
                    <img 
                      src={callerAvatar} 
                      alt={callerName}
                      className="w-48 h-48 rounded-full mx-auto mb-6 border-8 border-white/10 shadow-2xl"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mx-auto mb-6 border-8 border-white/10 shadow-2xl">
                      <span className="text-6xl text-white font-bold">
                        {callerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="text-white text-3xl font-medium mb-2">{callerName}</p>
                  <p className="text-gray-400 text-lg">
                    {isIncoming ? (isRinging ? '📞 Ringing...' : 'Audio calling...') : isInCall ? 'Connected' : 'Connecting...'}
                  </p>
                  {isInCall && (
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-green-400 text-sm">Call in progress</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="px-8 pt-6">
            <div className="flex justify-center items-center space-x-4">
              {isIncoming ? (
                // Incoming call buttons
                <div className="flex space-x-8">
                  <button
                    onClick={handleRejectCall}
                    className={`w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${isRinging ? 'animate-pulse' : ''}`}
                    title="Decline"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  
                  <button
                    onClick={handleAcceptCall}
                    disabled={deviceStatus?.checking}
                    className={`w-16 h-16 bg-green-500 hover:bg-green-600 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${isRinging ? 'animate-bounce' : ''}`}
                    title="Accept"
                  >
                    <Phone className="w-7 h-7" />
                  </button>
                </div>
              ) : (
                // In-call controls
                <div className="flex items-center space-x-3">
                  {/* Microphone Toggle */}
                  <button
                    onClick={onToggleMic}
                    disabled={!localStream}
                    className={`w-12 h-12 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${
                      isMicOn 
                        ? 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur' 
                        : 'bg-red-500/90 hover:bg-red-600 text-white'
                    } disabled:opacity-50`}
                    title={isMicOn ? 'Mute' : 'Unmute'}
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  {/* Video Toggle (only for video calls) */}
                  {isVideoCall && (
                    <button
                      onClick={onToggleVideo}
                      disabled={!localStream}
                      className={`w-12 h-12 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${
                        isVideoOn 
                          ? 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur' 
                          : 'bg-red-500/90 hover:bg-red-600 text-white'
                      } disabled:opacity-50`}
                      title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                    >
                      {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                  )}

                  {/* Speaker Toggle */}
                  <button
                    onClick={onToggleSpeaker}
                    className={`w-12 h-12 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${
                      isSpeakerOn 
                        ? 'bg-blue-500/90 hover:bg-blue-600 text-white' 
                        : 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur'
                    }`}
                    title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>

                  {/* End Call */}
                  <button
                    onClick={onEndCall}
                    className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ml-4"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* Device Status Info */}
            {deviceStatus && !deviceStatus.checking && (
              <div className="mt-4 flex justify-center">
                <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className={`flex items-center space-x-1 ${deviceStatus.camera ? 'text-green-400' : 'text-red-400'}`}>
                      <Video className="w-3 h-3" />
                      <span>Camera {deviceStatus.camera ? '✓' : '✗'}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${deviceStatus.microphone ? 'text-green-400' : 'text-red-400'}`}>
                      <Mic className="w-3 h-3" />
                      <span>Mic {deviceStatus.microphone ? '✓' : '✗'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Retry button for errors */}
            {callError && !isInCall && (
              <div className="mt-4 text-center">
                <button 
                  onClick={handleAcceptCall} 
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {autoplayBlocked && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setAutoplayBlocked(false);
                    try { ringtoneRef.current?.play(); } catch {}
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Enable Sound
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Device checking overlay */}
        {deviceStatus?.checking && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-30">
            <div className="text-center text-white">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg">Checking devices...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}