import { useEffect, useRef, useState, useCallback } from "react";
import { socketService } from "@/lib/socket";
import { 
  playIncomingCallSound, 
  stopIncomingCallSound, 
  playRingtone, 
  stopRingtone,
  getCompatibleMediaConstraints,
  checkWebRTCSupport,
  requestAndroidPermissions,
  resumeAudioContext,
  initCallAudio,
  cleanupCallAudio
} from "@/lib/audioUtils";

interface UseCallSocketProps {
  currentUserId: string;
}

export const useCallSocket = ({ currentUserId }: UseCallSocketProps) => {
  const [callError, setCallError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
const [isAndroid, setIsAndroid] = useState(false);
const [androidVersion, setAndroidVersion] = useState(0);

  
  const isLegacyDevice = isAndroid && androidVersion > 0 && androidVersion < 11;
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    type: "video" | "audio";
    offer: any;
    fromName?: string;
    callId?: string;
  } | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{
    camera: boolean;
    microphone: boolean;
    checking: boolean;
  }>({ camera: false, microphone: false, checking: false });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const endCallRef = useRef<() => void>(() => {});
  const justAcceptedAtRef = useRef<number>(0);
  const pendingRemoteCandidatesRef = useRef<any[]>([]);
  const isRingingRef = useRef<boolean>(false);
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Enhanced ICE servers with TURN for better connectivity
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Add more STUN servers for better connectivity
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ]);

  const currentCallRef = useRef<{
    targetUserId?: string;
    type?: "video" | "audio";
    callId?: string;
  }>({});

  // Device and platform detection
  useEffect(() => {
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    const androidMatch = ua.match(/Android (\d+\.?\d*)/);
    const version = androidMatch ? parseFloat(androidMatch[1]) : 0;

    setIsAndroid(/Android/i.test(ua));
    setAndroidVersion(version);
  }
}, []);

  // Initialize audio and check WebRTC support on mount
  useEffect(() => {
    const initializeCallSystem = async () => {
      const support = checkWebRTCSupport();
      
      if (!support.getUserMedia || !support.RTCPeerConnection) {
        setCallError("Your device doesn't support video/audio calling");
        return;
      }

      // Initialize audio system
      await initCallAudio();
      
      // Request permissions on Android
      if (isAndroid) {
        await requestAndroidPermissions();
      }
    };

    initializeCallSystem();
    
    return () => {
      cleanupCallAudio();
    };
  }, []);

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
      isAndroid,
      isLegacyDevice
    };
    console.error(`❌ ${context}:`, errorInfo);
    return errorInfo;
  };

  // Enhanced device checking with Android compatibility
  const checkAndPrepareDevices = useCallback(
    async (constraints: MediaStreamConstraints): Promise<boolean> => {
      try {
        setDeviceStatus((prev) => ({ ...prev, checking: true }));
        setCallError(null);

        console.log("🔍 Starting device check with constraints:", constraints);

        // Stop existing streams to free up devices
        if (localStream) {
          console.log("🛑 Stopping existing local stream...");
          localStream.getTracks().forEach((track) => {
            track.stop();
            console.log(`Stopped ${track.kind} track: ${track.label}`);
          });
          setLocalStream(null);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setCallError("Media devices not supported in this browser");
          setDeviceStatus((prev) => ({ ...prev, checking: false }));
          return false;
        }

        // Enumerate devices
        console.log("📋 Enumerating devices...");
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("📋 Available devices:", devices.map((d) => ({ 
          kind: d.kind, 
          label: d.label, 
          deviceId: d.deviceId 
        })));

        const hasCamera = devices.some((device) => device.kind === "videoinput");
        const hasMicrophone = devices.some((device) => device.kind === "audioinput");

        console.log("📋 Device availability:", { hasCamera, hasMicrophone });

        setDeviceStatus({
          camera: hasCamera,
          microphone: hasMicrophone,
          checking: false,
        });

        if (constraints.video && !hasCamera) {
          const error = "No camera found. Please connect a camera and try again.";
          setCallError(error);
          throw new Error(error);
        }

        if (constraints.audio && !hasMicrophone) {
          const error = "No microphone found. Please connect a microphone and try again.";
          setCallError(error);
          throw new Error(error);
        }

        // Test device availability with compatible constraints
        console.log("🧪 Testing device availability...");
        const testConstraints = getCompatibleMediaConstraints(!!constraints.video);
        
        try {
          const testStream = await navigator.mediaDevices.getUserMedia(testConstraints);
          console.log("✅ Device test successful:", {
            tracks: testStream.getTracks().map((t) => ({ 
              kind: t.kind, 
              label: t.label, 
              enabled: t.enabled 
            })),
          });

          // Stop test stream immediately
          testStream.getTracks().forEach((track) => {
            track.stop();
            console.log(`Stopped test ${track.kind} track: ${track.label}`);
          });

          await new Promise((resolve) => setTimeout(resolve, 200));
          return true;
          
        } catch (testError) {
          const errorInfo = logError("Device test failed", testError);
          
          let errorMessage = "Failed to access camera/microphone.";
          const error = testError as DOMException;

          if (error.name === "NotReadableError" || errorInfo.message.includes("in use")) {
            errorMessage = "Camera or microphone is being used by another app. Please close other apps and try again.";
          } else if (error.name === "NotAllowedError") {
            errorMessage = "Camera/microphone access denied. Please allow access in your browser settings.";
          } else if (error.name === "NotFoundError") {
            errorMessage = "No camera or microphone found. Please connect devices and try again.";
          } else if (error.name === "OverconstrainedError") {
            errorMessage = "Your device doesn't support the requested video/audio quality. Trying with lower quality...";
            // Retry with fallback constraints for legacy devices
            if (isLegacyDevice) {
              try {
                const fallbackConstraints = {
                  audio: { echoCancellation: false, noiseSuppression: false },
                  ...(constraints.video && { video: { width: 320, height: 240, frameRate: 15 } })
                };
                const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                fallbackStream.getTracks().forEach(track => track.stop());
                return true;
              } catch (fallbackError) {
                console.error("Fallback constraints also failed:", fallbackError);
              }
            }
          }

          setCallError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (error) {
        setDeviceStatus((prev) => ({ ...prev, checking: false }));
        if (error instanceof Error) {
          throw error;
        } else {
          const errorInfo = logError("Device check failed", error);
          const errorMessage = `Unexpected error during device check: ${errorInfo.message}`;
          setCallError(errorMessage);
          throw new Error(errorMessage);
        }
      }
    },
    [localStream, isLegacyDevice]
  );

  // Enhanced initLocalStream with Android compatibility
  const initLocalStream = useCallback(
    async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
      try {
        console.log("🎥 Initializing local stream...");

        // Resume audio context
        await resumeAudioContext();

        // Check and prepare devices first
        const devicesReady = await checkAndPrepareDevices(constraints);
        if (!devicesReady) {
          throw new Error("Devices not ready");
        }

        // Use compatible constraints
        const compatibleConstraints = getCompatibleMediaConstraints(!!constraints.video);
        console.log("🎥 Requesting media stream with compatible constraints:", compatibleConstraints);
        
        const stream = await navigator.mediaDevices.getUserMedia(compatibleConstraints);

        console.log(
          "✅ Got media stream with tracks:",
          stream.getTracks().map((t) => ({
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState,
            muted: t.muted,
          }))
        );

        setLocalStream(stream);
        return stream;
      } catch (error) {
        const errorInfo = logError("Failed to get user media", error);
        const mediaError = error as DOMException;
        
        let errorMessage = `Failed to access camera/microphone: ${errorInfo.message}`;
        
        // Provide more specific error messages
        if (mediaError.name === "NotAllowedError") {
          errorMessage = "Please allow camera and microphone access in your browser settings and try again.";
        } else if (mediaError.name === "NotFoundError") {
          errorMessage = "No camera or microphone found. Please check your device connections.";
        } else if (mediaError.name === "NotReadableError") {
          errorMessage = "Camera or microphone is busy. Please close other applications and try again.";
        }
        
        setCallError(errorMessage);
        return null;
      }
    },
    [checkAndPrepareDevices]
  );

  // Enhanced socket connection
  const ensureSocketConnected = useCallback(async (): Promise<boolean> => {
    try {
      if (socketRef.current?.connected) {
        console.log("✅ Socket already connected");
        return true;
      }

      console.log("🔌 Connecting socket for calls...");
      socketService.setCurrentUserId(currentUserId);
      const socket = socketService.connect(currentUserId);

      if (!socket) {
        console.error("❌ Failed to create socket instance");
        return false;
      }

      socketRef.current = socket;

      if (socket.connected) {
        console.log("✅ Socket connected immediately");
        return true;
      }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("⚠️ Socket connection timeout");
          socket.off("connect", onConnect);
          resolve(socket.connected);
        }, 8000); // Increased timeout for slower connections

        const onConnect = () => {
          clearTimeout(timeout);
          socket.off("connect", onConnect);
          console.log("✅ Socket connected for calls");
          resolve(true);
        };

        socket.on("connect", onConnect);
      });
    } catch (error) {
      logError("Socket connection error", error);
      return false;
    }
  }, [currentUserId]);

  // Enhanced peer connection with better configuration
  const createPeerConnection = useCallback(
    (stream?: MediaStream) => {
      const config = {
        iceServers: iceServersRef.current,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
      };

      const pc = new RTCPeerConnection(config);

      const streamToUse = stream || localStream;
      if (streamToUse) {
        streamToUse.getTracks().forEach((track) => {
          console.log(`Adding ${track.kind} track to peer connection:`, track.label);
          pc.addTrack(track, streamToUse);
        });
      }

      pc.ontrack = (event) => {
        console.log("📥 Received remote track:", event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from;
          if (targetUserId && socketRef.current?.connected) {
            socketRef.current.emit("ice-candidate", {
              to: targetUserId,
              from: currentUserId,
              candidate: event.candidate,
              callId: currentCallRef.current.callId,
            });
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 Peer connection state:", pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.error("❌ Peer connection failed/disconnected");
          setCallError("Connection failed. Please check your internet and try again.");
        }
        if (pc.connectionState === "connected") {
          console.log("✅ Peer connection established successfully");
          setCallError(null);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("❄️ ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          console.warn("⚠️ ICE connection issues, attempting restart");
          pc.restartIce();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [localStream, incomingCall, currentUserId]
  );

  // Enhanced call user function with proper ringtone
  const callUser = useCallback(
    async (userId: string, stream?: MediaStream, callerName?: string) => {
      try {
        console.log("📞 Starting call to:", userId);

        const isConnected = await ensureSocketConnected();
        if (!isConnected && !socketRef.current?.connected) {
          throw new Error("Failed to connect to server. Please check your internet connection.");
        }

        const callId = `${Date.now()}-${currentUserId}`;
        currentCallRef.current = {
          targetUserId: userId,
          type: stream && stream.getVideoTracks().length > 0 ? "video" : "audio",
          callId,
        };

        const streamToUse = stream || localStream;
        if (!streamToUse) {
          throw new Error("Local stream not initialized.");
        }

        setIsCalling(true);
        setCallError(null);
        
        // Start ringtone for outgoing call
        await playRingtone();
        
        const pc = createPeerConnection(streamToUse);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: streamToUse.getVideoTracks().length > 0
        });
        await pc.setLocalDescription(offer);

        console.log("📤 Emitting call-user event with ID:", callId);
        socketRef.current.emit("call-user", {
          to: userId,
          from: currentUserId,
          fromName: callerName || "Unknown Caller",
          offer,
          type: streamToUse.getVideoTracks().length > 0 ? "video" : "audio",
          callId,
        });
      } catch (error) {
        logError("Call failed", error);
        setIsCalling(false);
        currentCallRef.current = {};
        stopRingtone();
        throw error;
      }
    },
    [localStream, createPeerConnection, currentUserId, ensureSocketConnected]
  );

  // Enhanced accept call with proper audio handling
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log("📞 Accepting call from:", incomingCall.from);
    justAcceptedAtRef.current = Date.now();

    try {
      // Stop incoming call sound
      stopIncomingCallSound();
      isRingingRef.current = false;

      const constraints = { video: incomingCall.type === "video", audio: true };
      console.log("🎥 Getting media for accept call:", constraints);

      // Use the enhanced initLocalStream
      const stream = await initLocalStream(constraints);
      if (!stream) {
        throw new Error("Failed to initialize local stream for call");
      }

      console.log("✅ Got local stream for accept call");

      currentCallRef.current = {
        targetUserId: incomingCall.from,
        type: incomingCall.type,
        callId: incomingCall.callId,
      };

      setIsInCall(true);
      setIsCalling(false);

      const pc = createPeerConnection(stream);
      console.log("🔗 Created peer connection, setting remote description");

      await pc.setRemoteDescription(incomingCall.offer);
      console.log("✅ Set remote description");

      // Drain any queued ICE candidates
      try {
        while (pendingRemoteCandidatesRef.current.length) {
          const cand = pendingRemoteCandidatesRef.current.shift();
          await pc.addIceCandidate(cand);
        }
      } catch (e) {
        logError("Error draining queued ICE candidates (accept)", e);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("✅ Created and set local description (answer)");

      socketRef.current?.emit("call-accepted", {
        to: incomingCall.from,
        from: currentUserId,
        answer,
        callId: incomingCall.callId,
      });

      console.log("📤 Sent call-accepted event");
      setIncomingCall(null);
    } catch (error) {
      const errorInfo = logError("Accept call failed", error);

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      setIsInCall(false);
      setIsCalling(false);

      const errorMessage = callError || `Failed to accept call: ${errorInfo.message}`;
      setCallError(errorMessage);

      setTimeout(() => {
        setIncomingCall(null);
        currentCallRef.current = {};
      }, 1000);
    }
  }, [incomingCall, initLocalStream, createPeerConnection, currentUserId, callError, localStream]);

  // Enhanced reject call
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

    console.log("❌ Rejecting call from:", incomingCall.from);
    
    stopIncomingCallSound();
    isRingingRef.current = false;
    
    socketRef.current?.emit("call-rejected", {
      to: incomingCall.from,
      from: currentUserId,
      callId: incomingCall.callId,
    });

    setIncomingCall(null);
    currentCallRef.current = {};
  }, [incomingCall, currentUserId]);

  // Enhanced end call
  const endCall = useCallback(() => {
    const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from;

    console.log("📞 Ending call with:", targetUserId);

    // Stop all audio
    stopIncomingCallSound();
    stopRingtone();
    isRingingRef.current = false;

    // Clear ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    // Stop tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped local ${track.kind} track:`, track.label);
      });
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped remote ${track.kind} track:`, track.label);
      });
    }

    // Close PC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notify other side
    if (targetUserId && socketRef.current?.connected) {
      socketRef.current.emit("end-call", {
        to: targetUserId,
        from: currentUserId,
        callId: currentCallRef.current.callId,
      });
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsInCall(false);
    setIncomingCall(null);
    setCallError(null);
    currentCallRef.current = {};
  }, [localStream, remoteStream, incomingCall, currentUserId]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Enhanced socket event handlers with proper audio management
  useEffect(() => {
    if (!currentUserId) return;

    let cleanup: (() => void) | undefined;

    const initSocket = async () => {
      try {
        await ensureSocketConnected();
        const socket = socketRef.current;
        if (!socket) {
          console.warn("⚠️ Socket not available, retrying...");
          return;
        }

        console.log("📡 Setting up call event listeners...");

        const handleIncomingCall = async (data: any) => {
          console.log("📞 Incoming call received:", data);

          if (!data || data.from === currentUserId || !data.offer || !data.callId) {
            console.log("📞 Invalid incoming call data, ignoring");
            return;
          }

          // Check for duplicate calls
          if (incomingCall && incomingCall.callId === data.callId) {
            console.log("📞 Duplicate incoming call ignored");
            return;
          }

          // Store call ID and show incoming call
          currentCallRef.current.callId = data.callId;
          setIncomingCall({
            from: data.from,
            type: data.type || "video",
            offer: data.offer,
            fromName: data.fromName || "Unknown Caller",
            callId: data.callId,
          });

          // Start incoming call sound with proper handling
          isRingingRef.current = true;
          await resumeAudioContext();
          await playIncomingCallSound();

          console.log("📞 Incoming call state set with callId:", data.callId);
        };

        const handleCallAccepted = async (data: any) => {
          console.log("✅ Call accepted:", data);

          // Stop ringtone
          stopRingtone();

          if (!data?.callId || data.callId !== currentCallRef.current.callId) {
            console.log("❌ Call ID mismatch for accepted call");
            return;
          }

          if (peerConnectionRef.current && data.answer) {
            try {
              await peerConnectionRef.current.setRemoteDescription(data.answer);
              
              // Drain queued candidates
              try {
                while (pendingRemoteCandidatesRef.current.length) {
                  const cand = pendingRemoteCandidatesRef.current.shift();
                  await peerConnectionRef.current.addIceCandidate(cand);
                }
              } catch (e) {
                logError("Error draining queued ICE candidates (offerer)", e);
              }
              
              setIsCalling(false);
              setIsInCall(true);
              console.log("✅ Call established successfully");
            } catch (error) {
              logError("Error setting remote description", error);
              setCallError("Failed to establish connection");
            }
          }
        };

        const handleCallRejected = (data: any) => {
          console.log("❌ Call rejected:", data);
          
          stopRingtone();
          
          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log("❌ Call ID mismatch for rejected call");
            return;
          }
          
          setIsCalling(false);
          setIsInCall(false);
          setIncomingCall(null);
          currentCallRef.current = {};
        };

        const handleCallEnded = (data: any) => {
          console.log("📞 Call ended:", data);

          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log("❌ Call ID mismatch for end call");
            return;
          }

          if (Date.now() - justAcceptedAtRef.current < 2000) {
            console.warn("⚠️ Ignoring spurious call-ended right after accept");
            return;
          }

          endCallRef.current?.();
        };

        const handleIceCandidate = async (data: any) => {
          if (data?.callId && data.callId !== currentCallRef.current.callId) {
            console.log("❄️ ICE candidate callId mismatch, ignoring");
            return;
          }

          if (data.candidate) {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              try {
                await peerConnectionRef.current.addIceCandidate(data.candidate);
              } catch (error) {
                logError("Error adding ICE candidate", error);
              }
            } else {
              // Queue until PC and remote description are ready
              pendingRemoteCandidatesRef.current.push(data.candidate);
            }
          }
        };

        // Set up event listeners
        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-accepted", handleCallAccepted);
        socket.on("call-rejected", handleCallRejected);
        socket.on("call-ended", handleCallEnded);
        socket.on("ice-candidate", handleIceCandidate);

        console.log("✅ Call event listeners setup complete");
      } catch (error) {
        logError("Error initializing socket for calls", error);
      }
    };

    const initTimeout = setTimeout(initSocket, 100);
    return () => {
      clearTimeout(initTimeout);
      cleanup?.();
    };
  }, [currentUserId, ensureSocketConnected, incomingCall]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      endCallRef.current?.();
      if (ringtoneTimeoutRef.current) {
        clearTimeout(ringtoneTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced ICE servers with OpenRelay support
  useEffect(() => {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    const turnApiUrl = process.env.NEXT_PUBLIC_TURN_API_URL;

    const base: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" }
    ];

    // Static TURN from env
    if (turnUrl && turnUsername && turnCredential) {
      base.push({ 
        urls: turnUrl, 
        username: turnUsername, 
        credential: turnCredential 
      });
    }

    iceServersRef.current = base;

    // Dynamic TURN via API (OpenRelay/Metered)
    const fetchIce = async () => {
      if (!turnApiUrl) return;
      try {
        const res = await fetch(turnApiUrl, { 
          cache: "no-store",
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        const apiServers: RTCIceServer[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.iceServers)
            ? (data as any).iceServers
            : [];
            
        if (apiServers.length) {
          iceServersRef.current = [...base, ...apiServers];
          console.log("✅ Loaded dynamic ICE servers from TURN API:", apiServers.length);
        }
      } catch (e) {
        console.warn("⚠️ Failed to load TURN API credentials, using static ICE servers:", e);
      }
    };
    
    fetchIce();
  }, []);

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
      isAndroid,
      isLegacyDevice,
      webRTCSupport: checkWebRTCSupport()
    },
  };
};