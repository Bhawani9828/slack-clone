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
  const createPeerConnection = useCallback((stream?: MediaStream) => {
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
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated');
        const targetUserId = incomingCall?.from || '';
        if (targetUserId) {
          socketService.sendIceCandidate({
            to: targetUserId,
            candidate: event.candidate,
          });
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ WebRTC connection established');
      } else if (pc.connectionState === 'failed') {
        console.error('❌ WebRTC connection failed');
        setIsInCall(false);
        setIsCalling(false);
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
      console.log('📹 Stream details:', {
        id: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });

      setLocalStream(stream);
      return stream;
    } catch (error: any) {
      console.error('❌ Failed to get media stream:', error);
      
      let errorMessage = 'Failed to access camera/microphone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please grant permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please check your devices.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone constraints not supported.';
      } else if (error.name === 'TypeError') {
        errorMessage = 'Invalid media constraints provided.';
      }
      
      throw new Error(errorMessage);
    }
  }, []);

  // Call a user
  const callUser = useCallback(async (userId: string, stream?: MediaStream) => {
    try {
      console.log('📞 Calling user:', userId);
      
      const streamToUse = stream || localStream;
      if (!streamToUse) {
        throw new Error('Local stream not initialized. Please ensure camera/microphone permissions are granted.');
      }

      // Create peer connection
      const pc = createPeerConnection(streamToUse);
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('📤 Offer created:', offer);
      
      // Send call request via socket
      const success = socketService.callUser({
        to: userId,
        from: currentUserId,
        offer: offer,
        type: streamToUse.getVideoTracks().length > 0 ? 'video' : 'audio'
      });

      if (!success) {
        throw new Error('Failed to send call request');
      }

      setIsCalling(true);
      console.log('📞 Call request sent successfully');
      
    } catch (error) {
      console.error('❌ Failed to call user:', error);
      throw error;
    }
  }, [currentUserId, localStream, createPeerConnection]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      if (!incomingCall || !localStream) {
        throw new Error('No incoming call or local stream available');
      }

      console.log('✅ Accepting incoming call from:', incomingCall.from);
      
      // Create peer connection
      const pc = createPeerConnection(localStream);
      
      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('📤 Answer created:', answer);
      
      // Send acceptance via socket
      const success = socketService.acceptCall({
        to: incomingCall.from,
        from: currentUserId,
        answer: answer
      });

      if (!success) {
        throw new Error('Failed to send call acceptance');
      }

      setIsInCall(true);
      setIncomingCall(null);
      console.log('✅ Call accepted successfully');
      
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      throw error;
    }
  }, [incomingCall, localStream, currentUserId, createPeerConnection]);

  // End call
  const endCall = useCallback(() => {
    try {
      console.log('📞 Ending call...');
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      // Reset state
      setIsInCall(false);
      setIsCalling(false);
      setRemoteStream(null);
      
      // Notify other user via socket
      if (incomingCall?.from) {
        socketService.endCall({
          to: incomingCall.from,
          from: currentUserId
        });
      }
      
      console.log('✅ Call ended successfully');
      
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }, [localStream, incomingCall, currentUserId]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    try {
      console.log('❌ Rejecting incoming call from:', incomingCall?.from);
      
      if (incomingCall?.from) {
        socketService.getSocket()?.emit('call-rejected', {
          to: incomingCall.from,
          from: currentUserId
        });
      }
      
      setIncomingCall(null);
      console.log('✅ Call rejected successfully');
      
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
    }
  }, [incomingCall, currentUserId]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('🎤 Microphone:', audioTrack.enabled ? 'ON' : 'OFF');
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('📹 Video:', videoTrack.enabled ? 'ON' : 'OFF');
      }
    }
  }, [localStream]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    // This is a placeholder - actual speaker toggle depends on device capabilities
    console.log('🔊 Speaker toggle requested');
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!currentUserId) return;

    console.log('🧩 useCallSocket mounted - initializing socket for user:', currentUserId);
    
    // Connect to socket
    const socket = socketService.connect(currentUserId);
    socketRef.current = socket;

    // Setup call event listeners
    socketService.onIncomingCall((data) => {
      console.log('📞 Incoming call received:', data);
      setIncomingCall(data);
    });

    socketService.onCallAccepted((data) => {
      console.log('✅ Call accepted by remote user:', data);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socketService.onCallEnded((data) => {
      console.log('📞 Call ended by remote user:', data);
      setIsInCall(false);
      setIsCalling(false);
      setRemoteStream(null);
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    socketService.onCallRejected((data) => {
      console.log('❌ Call rejected by remote user:', data);
      setIsCalling(false);
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    socketService.onIceCandidate((data) => {
      console.log('🧊 ICE candidate received:', data);
      if (peerConnectionRef.current && data.candidate) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Cleanup function
    return () => {
      console.log('🧩 useCallSocket unmounting - cleaning up');
      
      // Remove call listeners
      socketService.offCallListeners();
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Reset state
      setIsInCall(false);
      setIsCalling(false);
      setIncomingCall(null);
      setRemoteStream(null);
    };
  }, [currentUserId, localStream]);

  return {
    localStream,
    remoteStream,
    incomingCall,
    isCalling,
    isInCall,
    callUser,
    acceptCall,
    endCall,
    rejectCall,
    initLocalStream,
    toggleMic,
    toggleVideo,
    toggleSpeaker,
  };
};