import { useEffect, useCallback, useState, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { playIncomingCallSound, stopIncomingCallSound, initCallAudio, cleanupCallAudio } from '@/lib/audioUtils';

export interface IncomingCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  type: 'voice' | 'video';
  timestamp: Date;
}

interface CallSocketOptions {
  currentUserId: string;
}

export const useCallSocket = (options: CallSocketOptions) => {
  const { currentUserId } = options;
  
  console.log('🎯 useCallSocket initialized for user:', currentUserId);
  
  // Basic call state
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  
  // WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  
  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Handle incoming call
  const handleIncomingCall = useCallback((data: any) => {
    console.log('📞 Incoming call received:', data);
    
    const callData: IncomingCall = {
      id: data.id || `call-${Date.now()}`,
      callerId: data.callerId,
      callerName: data.callerName || 'Unknown Caller',
      callerAvatar: data.callerAvatar,
      type: data.type || 'voice',
      timestamp: new Date(),
    };
    
    setIncomingCall(callData);
    setIsIncoming(true);
    
    // Play incoming call sound
    playIncomingCallSound();
  }, []);

  // Initialize local media stream
  const initLocalStream = useCallback(async (constraints: MediaStreamConstraints) => {
    try {
      console.log('🎥 Initializing local stream with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      console.log('✅ Local stream initialized:', stream);
      return stream;
    } catch (error) {
      console.error('❌ Failed to initialize local stream:', error);
      throw error;
    }
  }, []);

  // Call another user
  const callUser = useCallback(async (userId: string, stream: MediaStream) => {
    try {
      console.log(`📞 Calling user: ${userId}`);
      setIsCalling(true);
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      peerConnectionRef.current = peerConnection;
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        if (peerConnection && stream) {
          peerConnection.addTrack(track, stream);
        }
      });
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📹 Remote stream received');
        setRemoteStream(event.streams[0]);
      };
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send call offer via socket
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('call-offer', {
          targetUserId: userId,
          offer: offer,
          callerId: currentUserId,
          type: stream.getVideoTracks().length > 0 ? 'video' : 'voice'
        });
      }
      
      console.log('✅ Call offer sent successfully');
    } catch (error) {
      console.error('❌ Failed to call user:', error);
      setIsCalling(false);
      throw error;
    }
  }, [currentUserId]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      if (!incomingCall) {
        throw new Error('No incoming call to accept');
      }
      
      console.log('✅ Accepting incoming call');
      
      // Get local stream
      const stream = await initLocalStream({ 
        video: incomingCall.type === 'video', 
        audio: true 
      });
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      peerConnectionRef.current = peerConnection;
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        if (peerConnection && stream) {
          peerConnection.addTrack(track, stream);
        }
      });
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📹 Remote stream received');
        setRemoteStream(event.streams[0]);
      };
      
      // Send accept via socket
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('accept-call', { 
          callId: incomingCall.id,
          callerId: incomingCall.callerId 
        });
      }
      
      setIsInCall(true);
      setIsIncoming(false);
      setIncomingCall(null);
      stopIncomingCallSound();
      
      console.log('✅ Call accepted successfully');
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      throw error;
    }
  }, [incomingCall, initLocalStream]);

  // Reject call
  const rejectCall = useCallback((callId: string) => {
    console.log('❌ Rejecting call:', callId);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('reject-call', { callId });
    }
    setIsCallModalOpen(false);
    setIncomingCall(null);
    setIsIncoming(false);
    
    // Stop incoming call sound
    stopIncomingCallSound();
  }, []);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 Ending call');
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsInCall(false);
    setIsIncoming(false);
    setIncomingCall(null);
    
    // Send end call via socket
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('end-call');
    }
    
    console.log('✅ Call ended successfully');
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      console.log('❌ No socket available for call listeners');
      return;
    }

    console.log('🔌 Setting up call socket listeners for user:', currentUserId);
    console.log('🔌 Socket connected:', socket.connected);
    console.log('🔌 Socket ID:', socket.id);

    // Listen for incoming calls
    socket.on('incoming-call', (data: any) => {
      console.log('📞 [INCOMING-CALL] Event received:', data);
      handleIncomingCall(data);
    });

    // Listen for call offers
    socket.on('call-offer', async (data: any) => {
      console.log('📞 [CALL-OFFER] Event received:', data);
      // Handle incoming call offer
      handleIncomingCall(data);
    });

    // Listen for call accepted
    socket.on('call-accepted', (data: any) => {
      console.log('✅ [CALL-ACCEPTED] Event received:', data);
      setIsCalling(false);
      setIsInCall(true);
    });

    // Listen for call rejected
    socket.on('call-rejected', (data: any) => {
      console.log('❌ [CALL-REJECTED] Event received:', data);
      setIsCalling(false);
      endCall();
    });

    // Listen for call ended
    socket.on('call-ended', (data: any) => {
      console.log('📞 [CALL-ENDED] Event received:', data);
      endCall();
    });

    // Debug: Log all socket events
    socket.onAny((event: string, ...args: any[]) => {
      if (event.includes('call')) {
        console.log(`🔍 [CALL DEBUG] Socket event: ${event}`, args);
      }
    });

    console.log('✅ Call socket listeners setup complete');

    return () => {
      console.log('🧹 Cleaning up call socket listeners');
      socket.off('incoming-call');
      socket.off('call-offer');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-ended');
      socket.offAny();
    };
  }, [handleIncomingCall, endCall, currentUserId]);

  // Initialize audio on mount
  useEffect(() => {
    initCallAudio();
    return () => {
      cleanupCallAudio();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
      cleanupCallAudio();
    };
  }, [endCall]);

  return {
    // Basic call state
    incomingCall,
    isCallModalOpen,
    
    // WebRTC state
    localStream,
    remoteStream,
    isCalling,
    isInCall,
    isIncoming,
    
    // Call functions
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    initLocalStream,
    
    // Utility functions
    closeCallModal: () => setIsCallModalOpen(false),
  };
};