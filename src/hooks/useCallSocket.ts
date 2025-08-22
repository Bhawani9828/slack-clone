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
  } | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);

  // Initialize WebRTC peer connection
  const createPeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    
    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          to: incomingCall?.from || '',
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [localStream, incomingCall]);

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
      console.log('✅ Media stream obtained successfully:', stream);
      
      // Set the stream in state
      setLocalStream(stream);
      
      // Wait a bit to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('📹 Local stream set in state, returning stream');
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
  const callUser = useCallback(async (userId: string) => {
    console.log('📞 callUser called with userId:', userId);
    console.log('📹 Current localStream:', localStream);
    
    // Wait a bit for the stream to be set if it was just initialized
    if (!localStream) {
      console.log('⏳ Waiting for local stream to be available...');
      // Wait up to 2 seconds for the stream to be available
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (localStream) {
          console.log('✅ Local stream is now available');
          break;
        }
      }
      
      if (!localStream) {
        throw new Error('Local stream not initialized after waiting');
      }
    }

    setIsCalling(true);
    console.log('🔗 Creating peer connection...');
    const pc = createPeerConnection();

    try {
      console.log('📤 Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callData = {
        to: userId,
        from: currentUserId,
        offer,
        type: localStream.getVideoTracks().length > 0 ? 'video' : 'audio',
      };
      
      console.log('📡 Emitting call-user event:', callData);
      socketRef.current?.emit('call-user', callData);
      
      console.log('✅ Call initiated successfully');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      setIsCalling(false);
      throw error;
    }
  }, [localStream, createPeerConnection, currentUserId]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !localStream) return;

    setIsInCall(true);
    setIncomingCall(null);
    
    const pc = createPeerConnection();
    
    try {
      await pc.setRemoteDescription(incomingCall.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit('call-accepted', {
        to: incomingCall.from,
        from: currentUserId,
        answer,
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      setIsInCall(false);
    }
  }, [incomingCall, localStream, createPeerConnection, currentUserId]);

  // End call
  const endCall = useCallback(() => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsInCall(false);
    setIncomingCall(null);

    // Notify other user
    socketRef.current?.emit('end-call', {
      to: incomingCall?.from || '',
      from: currentUserId,
    });
  }, [localStream, remoteStream, incomingCall, currentUserId]);

  // Setup socket listeners
  useEffect(() => {
    if (!currentUserId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socketRef.current = socket;

    // Listen for incoming calls
    socket.on('incoming-call', (data: any) => {
      setIncomingCall({
        from: data.from,
        type: data.type,
        offer: data.offer,
      });
    });

    // Listen for call accepted
    socket.on('call-accepted', async (data: any) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(data.answer);
          setIsCalling(false);
          setIsInCall(true);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    // Listen for call ended
    socket.on('call-ended', () => {
      endCall();
    });

    // Listen for ICE candidates
    socket.on('ice-candidate', async (data: any) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-ended');
      socket.off('ice-candidate');
    };
  }, [currentUserId, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    endCall,
    initLocalStream,
  };
};