import { useEffect, useCallback, useState } from 'react';
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

export const useCallSocket = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

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
    setIsCallModalOpen(true);
    
    // Play incoming call sound
    playIncomingCallSound();
  }, []);

  // Accept call
  const acceptCall = useCallback((callId: string) => {
    console.log('✅ Accepting call:', callId);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('accept-call', { callId });
    }
    setIsCallModalOpen(false);
    setIncomingCall(null);
    
    // Stop incoming call sound
    stopIncomingCallSound();
  }, []);

  // Reject call
  const rejectCall = useCallback((callId: string) => {
    console.log('❌ Rejecting call:', callId);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('reject-call', { callId });
    }
    setIsCallModalOpen(false);
    setIncomingCall(null);
    
    // Stop incoming call sound
    stopIncomingCallSound();
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Listen for incoming calls
    socket.on('incoming-call', handleIncomingCall);

    // Listen for call accepted
    socket.on('call-accepted', (data: any) => {
      console.log('✅ Call accepted:', data);
      setIsCallModalOpen(false);
      setIncomingCall(null);
    });

    // Listen for call rejected
    socket.on('call-rejected', (data: any) => {
      console.log('❌ Call rejected:', data);
      setIsCallModalOpen(false);
      setIncomingCall(null);
    });

    // Listen for call ended
    socket.on('call-ended', (data: any) => {
      console.log('📞 Call ended:', data);
      setIsCallModalOpen(false);
      setIncomingCall(null);
    });

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-ended');
    };
  }, [handleIncomingCall]);

  // Initialize audio on mount
  useEffect(() => {
    initCallAudio();
    return () => {
      cleanupCallAudio();
    };
  }, []);

  return {
    incomingCall,
    isCallModalOpen,
    acceptCall,
    rejectCall,
    closeCallModal: () => setIsCallModalOpen(false),
  };
};