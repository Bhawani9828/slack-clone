// utils/callUtils.ts
import { Socket } from 'socket.io-client';

export interface CallData {
  to: string;
  from: string;
  offer?: any;
  answer?: any;
  type?: 'video' | 'audio';
  fromName?: string;
  callId?: string;
}

export class CallUtils {
  constructor(private socket: Socket | null) {}

  updateSocket(socket: Socket | null) {
    this.socket = socket;
  }

  callUser(data: CallData) {
    if (this.socket && this.socket.connected) {
      console.log('Initiating call:', data);
      this.socket.emit('call-user', data);
    } else {
      console.warn('Cannot initiate call: socket not connected');
    }
  }

  acceptCall(data: CallData) {
    if (this.socket && this.socket.connected) {
      console.log('Accepting call:', data);
      this.socket.emit('call-accepted', data);
    } else {
      console.warn('Cannot accept call: socket not connected');
    }
  }

  rejectCall(data: CallData) {
    if (this.socket && this.socket.connected) {
      console.log('Rejecting call:', data);
      this.socket.emit('call-rejected', data);
    } else {
      console.warn('Cannot reject call: socket not connected');
    }
  }

  endCall(data: CallData) {
    if (this.socket && this.socket.connected) {
      console.log('Ending call:', data);
      this.socket.emit('end-call', data);
    } else {
      console.warn('Cannot end call: socket not connected');
    }
  }

  // Call event listeners
  onIncomingCall(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('incoming-call');
    this.socket.on('incoming-call', (data) => {
      console.log('Incoming call event:', data);
      callback(data);
    });
  }

  onCallAccepted(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-accepted');
    this.socket.on('call-accepted', (data) => {
      console.log('Call accepted event:', data);
      callback(data);
    });
  }

  onCallRejected(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-rejected');
    this.socket.on('call-rejected', (data) => {
      console.log('Call rejected event:', data);
      callback(data);
    });
  }

  onCallEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-ended');
    this.socket.on('call-ended', (data) => {
      console.log('Call ended event:', data);
      callback(data);
    });
  }

  // ICE candidate exchange methods
  sendIceCandidate(data: { to: string; candidate: RTCIceCandidate; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('Sending ICE candidate:', data);
      this.socket.emit('ice-candidate', data);
    } else {
      console.warn('Cannot send ICE candidate: socket not connected');
    }
  }

  onIceCandidate(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('ice-candidate');
    this.socket.on('ice-candidate', (data) => {
      console.log('Received ICE candidate:', data);
      callback(data);
    });
  }

  // Call status methods
  updateCallStatus(data: { callId: string; status: 'ringing' | 'connected' | 'ended'; to?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('Updating call status:', data);
      this.socket.emit('call-status', data);
    } else {
      console.warn('Cannot update call status: socket not connected');
    }
  }

  onCallStatus(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-status');
    this.socket.on('call-status', (data) => {
      console.log('Call status update:', data);
      callback(data);
    });
  }

  // Cleanup method to remove all call-related listeners
  removeAllCallListeners() {
    if (!this.socket) return;

    const callEvents = [
      'incoming-call',
      'call-accepted',
      'call-rejected', 
      'call-ended',
      'ice-candidate',
      'call-status'
    ];

    callEvents.forEach(event => {
      this.socket?.off(event);
    });

    console.log('Removed all call event listeners');
  }
}