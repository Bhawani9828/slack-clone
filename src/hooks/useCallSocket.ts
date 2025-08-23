import { useEffect, useRef, useState, useCallback } from 'react';
import { socketService } from '@/lib/socket';

interface CallStreams {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface CallState {
  isCalling: boolean;
  isInCall: boolean;
  incomingCall: {
    from: string;
    type: 'video' | 'audio';
    offer: any;
    fromName?: string;
  } | null;
}

interface UseCallSocketProps {
  currentUserId: string;
}

export const useCallSocket = ({ currentUserId }: UseCallSocketProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    type: 'video' | 'audio';
    offer: any;
    fromName?: string;
  } | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const endCallRef = useRef<() => void>(() => {});
  const currentCallRef = useRef<{
    targetUserId?: string;
    type?: 'video' | 'audio';
  }>({});

  // Initialize WebRTC peer connection
  const createPeerConnection = useCallback((stream?: MediaStream) => {
    console.log('🔗 Creating new peer connection...');
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    
    // Add local stream tracks to peer connection
    const streamToUse = stream || localStream;
    if (streamToUse) {
      console.log('🔗 Adding tracks to peer connection:', streamToUse.getTracks().length);
      streamToUse.getTracks().forEach(track => {
        console.log('📡 Adding track:', { kind: track.kind, enabled: track.enabled });
        pc.addTrack(track, streamToUse);
      });
    } else {
      console.warn('⚠️ No stream available for peer connection');
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('📥 Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('📥 Setting remote stream:', event.streams[0].id);
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated');
        const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from;
        
        if (targetUserId && socketRef.current) {
          console.log('🧊 Sending ICE candidate to:', targetUserId);
          socketRef.current.emit('ice-candidate', {
            to: targetUserId,
            from: currentUserId,
            candidate: event.candidate,
          });
        } else {
          console.warn('⚠️ No target user ID for ICE candidate');
        }
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed:', pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [localStream, incomingCall, currentUserId]);

  // Initialize local media stream
  const initLocalStream = useCallback(async (constraints: MediaStreamConstraints) => {
    try {
      console.log('🎥 Requesting media permissions with constraints:', constraints);
      
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API is not supported in this browser');
      }

      // Check if we're in a secure context
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('MediaDevices API requires HTTPS or localhost for security reasons');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media stream obtained successfully:', stream.id);
      console.log('📹 Stream details:', {
        id: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });
      
      // Set the stream in state
      setLocalStream(stream);
      console.log('📹 Stream state updated');
      
      return stream;
    } catch (error: any) {
      console.error('❌ Error accessing media devices:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to access media devices';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone permission denied. Please allow access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect the required devices.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera/microphone not supported in this browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone constraints not satisfied.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.name = error.name;
      throw enhancedError;
    }
  }, []);

  // Call a user
  const callUser = useCallback(async (userId: string, stream?: MediaStream, callerName?: string) => {
    console.log('📞 ===== INITIATING CALL =====');
    console.log('📞 Target userId:', userId);
    console.log('📞 Caller name:', callerName);
    console.log('📞 Current userId:', currentUserId);
    console.log('📞 Stream provided:', !!stream);
    
    // Store call info for reference
    currentCallRef.current = {
      targetUserId: userId,
      type: stream && stream.getVideoTracks().length > 0 ? 'video' : 'audio',
    };
    
    // Use the passed stream if available, otherwise use the state
    const streamToUse = stream || localStream;
    
    if (!streamToUse) {
      throw new Error('Local stream not initialized. Please ensure camera/microphone permissions are granted.');
    }

    if (!socketRef.current) {
      throw new Error('Socket not connected');
    }

    setIsCalling(true);
    console.log('🔗 Creating peer connection for outgoing call...');
    const pc = createPeerConnection(streamToUse);

    try {
      console.log('📤 Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callData = {
        to: userId,
        from: currentUserId,
        fromName: callerName || 'Unknown Caller',
        offer,
        type: streamToUse.getVideoTracks().length > 0 ? 'video' : 'audio',
      };
      
      console.log('📡 Emitting call-user event:', callData);
      socketRef.current.emit('call-user', callData);
      
      console.log('✅ Call initiated successfully');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      setIsCalling(false);
      currentCallRef.current = {};
      throw error;
    }
  }, [localStream, createPeerConnection, currentUserId]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) {
      console.error('❌ No incoming call to accept');
      return;
    }

    console.log('📞 ===== ACCEPTING CALL =====');
    console.log('📞 Accepting call from:', incomingCall.from);
    console.log('📞 Call type:', incomingCall.type);
    
    try {
      // Initialize local stream for the receiver
      const constraints = {
        video: incomingCall.type === 'video',
        audio: true
      };
      
      console.log('🎥 Getting media stream for call acceptance...');
      const stream = await initLocalStream(constraints);
      if (!stream) {
        throw new Error('Failed to initialize local stream');
      }

      // Store call info
      currentCallRef.current = {
        targetUserId: incomingCall.from,
        type: incomingCall.type,
      };

      setIsInCall(true);
      
      console.log('🔗 Creating peer connection for incoming call...');
      const pc = createPeerConnection(stream);
      
      console.log('📥 Setting remote description from offer...');
      await pc.setRemoteDescription(incomingCall.offer);
      
      console.log('📤 Creating answer...');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log('📡 Sending call acceptance...');
      socketRef.current?.emit('call-accepted', {
        to: incomingCall.from,
        from: currentUserId,
        answer,
      });

      // Clear incoming call state but keep call modal open
      setIncomingCall(null);
      console.log('✅ Call accepted successfully');
      
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      setIsInCall(false);
      setIncomingCall(null);
      currentCallRef.current = {};
    }
  }, [incomingCall, initLocalStream, createPeerConnection, currentUserId]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

    console.log('❌ ===== REJECTING CALL =====');
    console.log('❌ Rejecting call from:', incomingCall.from);
    
    // Notify caller about rejection
    socketRef.current?.emit('call-rejected', {
      to: incomingCall.from,
      from: currentUserId,
    });

    // Clear incoming call state
    setIncomingCall(null);
    currentCallRef.current = {};
    console.log('✅ Call rejected successfully');
  }, [incomingCall, currentUserId]);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 ===== ENDING CALL =====');
    
    const targetUserId = currentCallRef.current.targetUserId || incomingCall?.from;
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Stopped local track:', track.kind);
      });
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Stopped remote track:', track.kind);
      });
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('🔗 Peer connection closed');
    }

    // Notify other user about call end
    if (targetUserId && socketRef.current) {
      console.log('📡 Notifying call end to:', targetUserId);
     socketRef.current?.emit('end-call', {
  to: targetUserId,
  from: currentUserId,
});
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsInCall(false);
    setIncomingCall(null);
    currentCallRef.current = {};
    
    console.log('✅ Call ended successfully');
  }, [localStream, remoteStream, incomingCall, currentUserId]);

  // Setup socket listeners
  useEffect(() => {
    if (!currentUserId) {
      console.warn('⚠️ No current user ID provided to useCallSocket');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      console.warn('⚠️ No socket connection available for calls');
      return;
    }

    socketRef.current = socket;
    console.log('🔌 ===== SETTING UP CALL SOCKET LISTENERS =====');
    console.log('🔌 Socket ID:', socket.id);
    console.log('🔌 Current User ID:', currentUserId);

    // Listen for incoming calls
    const handleIncomingCall = (data: any) => {
      console.log('📞 ===== INCOMING CALL RECEIVED =====');
      console.log('📞 Call data received:', data);
      console.log('📞 From:', data.from);
      console.log('📞 From Name:', data.fromName);
      console.log('📞 Type:', data.type);
      console.log('📞 Current User ID:', currentUserId);
      
      // Don't accept call from yourself
      if (data.from === currentUserId) {
        console.warn('⚠️ Ignoring call from self');
        return;
      }

      // Check if offer exists
      if (!data.offer) {
        console.error('❌ No offer in incoming call data');
        return;
      }

      console.log('✅ Setting incoming call state...');
      setIncomingCall({
        from: data.from,
        type: data.type,
        offer: data.offer,
        fromName: data.fromName,
      });
      
      console.log('✅ Incoming call state updated - modal should open now!');
    };

    // Listen for call accepted
    const handleCallAccepted = async (data: any) => {
      console.log('✅ ===== CALL ACCEPTED =====');
      console.log('✅ Call accepted by:', data.from);
      console.log('✅ Answer received:', !!data.answer);
      
      if (peerConnectionRef.current && data.answer) {
        try {
          console.log('📥 Setting remote description from answer...');
          await peerConnectionRef.current.setRemoteDescription(data.answer);
          setIsCalling(false);
          setIsInCall(true);
          console.log('✅ Remote description set, call established');
        } catch (error) {
          console.error('❌ Error setting remote description:', error);
        }
      } else {
        console.error('❌ No peer connection or answer available');
      }
    };

    // Listen for call rejected
    const handleCallRejected = (data: any) => {
      console.log('❌ ===== CALL REJECTED =====');
      console.log('❌ Call rejected by:', data.from);
      setIsCalling(false);
      setIsInCall(false);
      setIncomingCall(null);
      currentCallRef.current = {};
      
      // You might want to show a notification here
      console.log('📱 Call was rejected by the user');
    };

    // Listen for call ended
    const handleCallEnded = (data: any) => {
      console.log('📞 ===== CALL ENDED BY REMOTE =====');
      console.log('📞 Call ended by:', data.from);
      endCall();
    };

    // Listen for ICE candidates
    const handleIceCandidate = async (data: any) => {
      console.log('🧊 ===== ICE CANDIDATE RECEIVED =====');
      console.log('🧊 ICE candidate received from:', data.from);
      console.log('🧊 Candidate:', data.candidate);
      
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
          console.log('✅ ICE candidate added successfully');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      } else {
        console.warn('⚠️ No peer connection available for ICE candidate');
      }
    };

    // Listen for call failed
    const handleCallFailed = (data: any) => {
      console.error('❌ ===== CALL FAILED =====');
      console.error('❌ Call failed:', data);
      setIsCalling(false);
      setIsInCall(false);
      currentCallRef.current = {};
      alert(`Call failed: ${data.error || 'Unknown error'}`);
    };

    // Listen for call initiated confirmation
    const handleCallInitiated = (data: any) => {
      console.log('✅ ===== CALL INITIATED CONFIRMATION =====');
      console.log('✅ Call initiated to:', data.targetUserId);
      console.log('✅ Call type:', data.callType);
    };

    // Register event listeners
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-failed', handleCallFailed);
    socket.on('call-initiated', handleCallInitiated);

    console.log('✅ All call event listeners registered');

    // Test socket connection
    socket.emit('test-call-connection', { userId: currentUserId });

    // Cleanup listeners on unmount
    return () => {
      console.log('🧹 ===== CLEANING UP CALL SOCKET LISTENERS =====');
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-failed', handleCallFailed);
      socket.off('call-initiated', handleCallInitiated);
      console.log('✅ Call listeners cleaned up');
    };
  }, [currentUserId, endCall]);

  // Monitor state changes for debugging
  useEffect(() => {
    console.log('📊 ===== CALL STATE CHANGED =====');
    console.log('📊 isCalling:', isCalling);
    console.log('📊 isInCall:', isInCall);
    console.log('📊 incomingCall:', incomingCall ? `from ${incomingCall.from} (${incomingCall.type})` : 'none');
    console.log('📊 localStream:', localStream ? `${localStream.id} (${localStream.getTracks().length} tracks)` : 'none');
    console.log('📊 remoteStream:', remoteStream ? `${remoteStream.id} (${remoteStream.getTracks().length} tracks)` : 'none');
  }, [isCalling, isInCall, incomingCall, localStream, remoteStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 useCallSocket cleanup - ending any active calls');
      endCall();
    };
  }, [endCall]);

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
    initLocalStream,
    // Debug info
    debugInfo: {
      currentUserId,
      socketConnected: !!socketRef.current?.connected,
      currentCall: currentCallRef.current,
    }
  };
};