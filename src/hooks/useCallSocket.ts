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
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Call a user
  const callUser = useCallback(async (userId: string) => {
    if (!localStream) {
      throw new Error('Local stream not initialized');
    }

    setIsCalling(true);
    const pc = createPeerConnection();

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('call-user', {
        to: userId,
        from: currentUserId,
        offer,
        type: localStream.getVideoTracks().length > 0 ? 'video' : 'audio',
      });
    } catch (error) {
      console.error('Error creating offer:', error);
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