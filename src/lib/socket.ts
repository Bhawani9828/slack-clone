// socket.service.ts - Fixed Version with Complete Call Support
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export interface DeleteOptions {
  isGroupChat?: boolean;
  groupId?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentChatId: string | null = null;
  private currentUserId: string | null = null;
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private isConnecting = false;

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  // ==================== CALL-RELATED METHODS ====================
  
  callUser(data: { to: string; from: string; offer: any; type: 'video' | 'audio' }) {
    if (!this.socket) {
      console.error('Socket not connected for call');
      return false;
    }
    
    console.log('📞 Emitting call-user event:', data);
    this.socket.emit('call-user', data);
    return true;
  }

  acceptCall(data: { to: string; from: string; answer: any }) {
    if (!this.socket) {
      console.error('Socket not connected for call acceptance');
      return false;
    }
    
    console.log('✅ Emitting call-accepted event:', data);
    this.socket.emit('call-accepted', data);
    return true;
  }

  endCall(data: { to: string; from: string }) {
    if (!this.socket) {
      console.error('Socket not connected for call ending');
      return false;
    }
    
    console.log('📞 Emitting end-call event:', data);
    this.socket.emit('end-call', data);
    return true;
  }

  sendIceCandidate(data: { to: string; candidate: any }) {
    if (!this.socket) {
      console.error('Socket not connected for ICE candidate');
      return false;
    }
    
    console.log('🧊 Emitting ice-candidate event:', data);
    this.socket.emit('ice-candidate', data);
    return true;
  }

  // Call event listeners
  onIncomingCall(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('incoming-call', callback);
  }

  onCallAccepted(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('call-accepted', callback);
  }

  onCallEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('call-ended', callback);
  }

  onCallRejected(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('call-rejected', callback);
  }

  onIceCandidate(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('ice-candidate', callback);
  }

  // Remove call listeners
  offCallListeners() {
    if (!this.socket) return;
    this.socket.off('incoming-call');
    this.socket.off('call-accepted');
    this.socket.off('call-ended');
    this.socket.off('call-rejected');
    this.socket.off('ice-candidate');
  }

  // ==================== MESSAGE METHODS ====================

  setupMessageListeners(callbacks: {
    onMessage: (msg: any) => void;
    onTyping: (data: any) => void;
    onUserStatus: (data: any) => void;
    onLastMessage: (data: any) => void;
    onMessageDeleted?: (data: any) => void;
    onMessageRead?: (data: any) => void;
    onFavoriteToggled?: (data: any) => void;
    onMessageForwarded?: (data: any) => void;
    onMessageCopied?: (data: any) => void;
  }) {
    if (!this.socket) return;

    // Remove any existing listeners first
    this.socket.off('receiveMessage');
    this.socket.off('typing');
    this.socket.off('userOnline');
    this.socket.off('userOffline');
    this.socket.off('lastMessage');
    this.socket.off('messageDeleted');
    this.socket.off('messageRead');
    this.socket.off('favoriteToggled');
    this.socket.off('messageForwarded');
    this.socket.off('messageCopied');

    // Setup new listeners
    this.socket.on('receiveMessage', callbacks.onMessage);
    this.socket.on('typing', callbacks.onTyping);
    this.socket.on('userOnline', (userId) => callbacks.onUserStatus({ userId, isOnline: true }));
    this.socket.on('userOffline', (userId) => callbacks.onUserStatus({ userId, isOnline: false }));
    this.socket.on('lastMessage', callbacks.onLastMessage);
    
    // Message action listeners
    if (callbacks.onMessageDeleted) {
      this.socket.on('messageDeleted', callbacks.onMessageDeleted);
    }
    if (callbacks.onMessageRead) {
      this.socket.on('messageRead', callbacks.onMessageRead);
    }
    if (callbacks.onFavoriteToggled) {
      this.socket.on('favoriteToggled', callbacks.onFavoriteToggled);
    }
    if (callbacks.onMessageForwarded) {
      this.socket.on('messageForwarded', callbacks.onMessageForwarded);
    }
    if (callbacks.onMessageCopied) {
      this.socket.on('messageCopied', callbacks.onMessageCopied);
    }

    console.log('📡 Message listeners setup complete');
  }

  connect(userId?: string): Socket {
    if (userId) {
      this.currentUserId = userId;
    }

    // Prevent multiple connection attempts
    if (this.isConnecting) {
      console.log('Connection already in progress...');
      return this.socket as Socket;
    }

    const token = Cookies.get('auth_token');
    if (!token) {
      console.warn('No token found. Aborting socket connection.');
      return this.socket as Socket;
    }

    // Check if socket is already connected and working
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.isConnecting = true;

    // Clean up existing socket before creating new one
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      console.log('🔌 Connecting to socket server...');
      
      // Connect to your NestJS backend
      this.socket = io('http://localhost:3001/chat', {
        auth: {
          token: token
        },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', this.socket?.id);
        this.isConnecting = false;
        this.reconnectionAttempts = 0;
        
        // Auto-join user room
        if (this.currentUserId) {
          this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        this.isConnecting = false;
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          this.reconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('🚨 Socket connection error:', error);
        this.isConnecting = false;
        
        if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
          this.reconnect();
        } else {
          console.error('Max reconnection attempts reached');
        }
      });

      this.socket.on('error', (error) => {
        console.error('🚨 Socket error:', error);
      });

      // Setup basic event listeners
      this.setupBasicListeners();

    } catch (error) {
      console.error('🚨 Error creating socket connection:', error);
      this.isConnecting = false;
    }

    return this.socket as Socket;
  }

  private setupBasicListeners() {
    if (!this.socket) return;

    this.socket.on('connectionSuccess', (data) => {
      console.log('✅ Connection confirmed:', data);
    });

    this.socket.on('onlineUsers', (users) => {
      console.log('👥 Online users received:', users);
    });
  }

  private reconnect() {
    if (this.isConnecting) return;
    
    this.reconnectionAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}`);
    
    setTimeout(() => {
      this.connect();
    }, 1000 * this.reconnectionAttempts);
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  // Get current socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ==================== MESSAGE METHODS ====================

  sendMessage(messageData: any) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected for sending message');
      return false;
    }

    this.socket.emit('sendMessage', messageData);
    return true;
  }

  joinChat(chatId: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected for joining chat');
      return false;
    }

    this.currentChatId = chatId;
    this.socket.emit('joinChat', { chatId });
    return true;
  }

  leaveChat() {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    if (this.currentChatId) {
      this.socket.emit('leaveChat', { chatId: this.currentChatId });
      this.currentChatId = null;
    }
    return true;
  }

  sendTyping(receiverId: string, isTyping: boolean) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('typing', { receiverId, isTyping });
    return true;
  }

  markAsRead(messageId: string, senderId: string) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('markAsRead', { messageId, senderId });
    return true;
  }

  deleteMessage(messageId: string, hard?: boolean) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('deleteMessage', { messageId, hard });
    return true;
  }

  replyMessage(data: { originalMessageId: string; receiverId: string; content: string; type?: string }) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('replyMessage', data);
    return true;
  }

  forwardMessage(data: { messageId: string; receiverIds: string[] }) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('forwardMessage', data);
    return true;
  }

  toggleFavorite(messageId: string, isFavorite: boolean) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('toggleFavorite', { messageId, isFavorite });
    return true;
  }

  copyMessage(messageId: string) {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('copyMessage', { messageId });
    return true;
  }

  getFavorites() {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('getFavorites');
    return true;
  }

  getMessageStats() {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('getMessageStats');
    return true;
  }

  getOnlineUsers() {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    this.socket.emit('getOnlineUsers');
    return true;
  }
}

export const socketService = new SocketService();