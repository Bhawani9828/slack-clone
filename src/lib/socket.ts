// socket.service.ts - Fixed Version with Better Call Handling
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { ReplyMessagePayload } from '@/types/chatTypes';

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
      console.log('🔄 Connection already in progress...');
      return this.socket as Socket;
    }

    const token = Cookies.get('auth_token');
    if (!token) {
      console.warn('❌ No token found. Aborting socket connection.');
      return this.socket as Socket;
    }

    // Check if socket is already connected and working
    if (this.socket && this.socket.connected) {
      console.log('✅ Socket already connected');
      return this.socket;
    }

    this.isConnecting = true;

    // Clean up existing socket before creating new one
    if (this.socket) {
      console.log('🧹 Cleaning up existing socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    console.log('🔌 Creating new socket connection...');
    this.socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
      auth: {
        token: `Bearer ${token}`,
        userId: this.currentUserId,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectionAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      forceNew: true,
      timeout: 10000,
    });

    this.setupSocketEventHandlers();
    this.isConnecting = false;

    return this.socket;
  }

  private setupSocketEventHandlers() {
    if (!this.socket) return;

    // Debug events (only for call-related events to reduce noise)
    this.socket.onAny((event, ...args) => {
      if (event.includes('call') || event.includes('ice')) {
        console.log(`📡 [Socket Event] ${event}:`, args);
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat namespace, Socket ID:', this.socket?.id);
      this.reconnectionAttempts = 0;
      
      // Join user to their own room for receiving messages
      if (this.currentUserId) {
        this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
        console.log(`🏠 Joined user room: ${this.currentUserId}`);
      }
      
      // Request current online users when connected
      setTimeout(() => {
        this.socket?.emit('getOnlineUsers');
      }, 500);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        setTimeout(() => {
          if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
            this.reconnectionAttempts++;
            console.log(`🔄 Attempting reconnection ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}`);
            this.socket?.connect();
          }
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Connection error:', error);
      this.reconnectionAttempts++;
      
      if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
        console.error('❌ Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconnected to server');
      this.reconnectionAttempts = 0;
      
      // Re-join user room after reconnection
      if (this.currentUserId) {
        this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
      }
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🚨 Reconnection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectionAttempts = 0;
      this.isConnecting = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinChannel(chatId: string) {
    if (this.socket && this.socket.connected) {
      // Leave any previous room to avoid duplicate messages
      if (this.currentChatId && this.currentChatId !== chatId) {
        this.socket.emit('leaveChat', { chatId: this.currentChatId });
        console.log(`🚪 Left chat: ${this.currentChatId}`);
      }

      // Join new chat
      this.currentChatId = chatId;
      this.socket.emit('joinChat', {
        userId: this.currentUserId,
        chatId,
      });
      console.log(`🔗 Joined chat: ${chatId}`);
    } else {
      console.warn('❌ Cannot join channel: socket not connected');
    }
  }

  sendMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('❌ Socket not connected when trying to send message');
        reject('Socket not connected');
        return;
      }

      console.log('📤 Sending message:', message);
      
      const payload = { ...message };
      this.socket.emit('sendMessage', payload, (response: any) => {
        console.log('📤 Send message response:', response);
        if (response?.error) {
          console.error('❌ Send message error:', response.error);
          reject(response.error);
        } else {
          resolve();
        }
      });
    });
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      console.log(`💬 Sending typing indicator: receiverId=${receiverId}, isTyping=${isTyping}`);
      this.socket.emit('typing', {
        receiverId,
        isTyping,
      });
    } else {
      console.warn('❌ Cannot send typing indicator: socket not connected');
    }
  }

  markAsRead(messageId: string, senderId: string) {
    if (this.socket && this.socket.connected) {
      console.log(`👁️ Marking as read: messageId=${messageId}, senderId=${senderId}`);
      this.socket.emit('markAsRead', {
        messageId,
        senderId,
      });
    } else {
      console.warn('❌ Cannot mark as read: socket not connected');
    }
  }

  // Message Action Methods
  deleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onDeleted = (data: any) => {
        if (data?.messageId === messageId) {
          this.socket?.off("messageDeleted", onDeleted);
          resolve();
        }
      };

      this.socket.on("messageDeleted", onDeleted);

      this.socket.emit("deleteMessage", {
        messageId,
        hard: false,
        ...options,
      });
    });
  }

  hardDeleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onDeleted = (data: any) => {
        if (data?.messageId === messageId) {
          this.socket?.off("messageDeleted", onDeleted);
          resolve();
        }
      };

      this.socket.on("messageDeleted", onDeleted);

      this.socket.emit("deleteMessage", {
        messageId,
        hard: true,
        ...options,
      });
    });
  }

  async replyToMessage(data: ReplyMessagePayload): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.replyToMessageViaAPI(data).then(resolve).catch(reject);
        return;
      }

      const payload = { ...data } as any;

      this.socket.emit('replyMessage', payload, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  async forwardMessage(data: {
    messageId: string;
    receiverIds: string[];
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.forwardMessageViaAPI(data).then(resolve).catch(reject);
        return;
      }

      const payload = { ...data } as any;

      this.socket.emit('forwardMessage', payload, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  async toggleFavorite(data: {
    messageId: string;
    isFavorite: boolean;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.toggleFavoriteViaAPI(data).then(resolve).catch(reject);
        return;
      }

      this.socket.emit('toggleFavorite', data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  async logCopyAction(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.logCopyActionViaAPI(messageId).then(resolve).catch(reject);
        return;
      }

      this.socket.emit('copyMessage', { messageId }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  async getFavoriteMessages(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.getFavoriteMessagesViaAPI().then(resolve).catch(reject);
        return;
      }

      this.socket.emit('getFavorites');
      
      const handleFavorites = (data: any) => {
        this.socket?.off('favoriteMessages', handleFavorites);
        resolve(data.messages || []);
      };

      this.socket.on('favoriteMessages', handleFavorites);

      setTimeout(() => {
        this.socket?.off('favoriteMessages', handleFavorites);
        reject(new Error('Timeout getting favorite messages'));
      }, 10000);
    });
  }

  // REST API Fallback Methods
  private async deleteMessageViaAPI(messageId: string, userId: string): Promise<void> {
    const token = Cookies.get('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
  }

  private async hardDeleteMessageViaAPI(messageId: string, userId: string): Promise<void> {
    const token = Cookies.get('auth_token');
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/messages/hard-delete/${messageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
  }

  private async replyToMessageViaAPI(data: any): Promise<any> {
    const token = Cookies.get('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to send reply');
    }

    return response.json();
  }

  private async forwardMessageViaAPI(data: any): Promise<void> {
    const token = Cookies.get('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/forward`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to forward message');
    }
  }

  private async toggleFavoriteViaAPI(data: any): Promise<void> {
    const token = Cookies.get('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle favorite');
    }
  }

  private async logCopyActionViaAPI(messageId: string): Promise<void> {
    const token = Cookies.get('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId }),
    });

    if (!response.ok) {
      throw new Error('Failed to log copy');
    }
  }

  private async getFavoriteMessagesViaAPI(): Promise<any[]> {
    const token = Cookies.get('auth_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/favorites`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch favorite messages');
    }

    const data = await response.json();
    return data.messages || [];
  }

  // Request online users list
  requestOnlineUsers() {
    if (this.socket && this.socket.connected) {
      console.log('👥 Requesting online users...');
      this.socket.emit('getOnlineUsers');
    }
  }

  // Event listeners with better error handling
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  onMessageReceived(callback: (message: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('receiveMessage');
    this.socket.on('receiveMessage', (message) => {
      console.log('📥 Message received via socket:', message);
      callback(message);
    });
  }

  

  // Call-related methods with better error handling
  callUser(data: { to: string; from: string; offer: any; type: 'video' | 'audio'; fromName?: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('📞 Initiating call via socket:', data);
      this.socket.emit('call-user', data);
    } else {
      console.warn('❌ Cannot initiate call: socket not connected');
    }
  }

  acceptCall(data: { to: string; from: string; answer: any; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('✅ Accepting call via socket:', data);
      this.socket.emit('call-accepted', data);
    } else {
      console.warn('❌ Cannot accept call: socket not connected');
    }
  }

  rejectCall(data: { to: string; from: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('❌ Rejecting call via socket:', data);
      this.socket.emit('call-rejected', data);
    } else {
      console.warn('❌ Cannot reject call: socket not connected');
    }
  }

  endCall(data: { to: string; from: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('📞 Ending call via socket:', data);
      this.socket.emit('end-call', data);
    } else {
      console.warn('❌ Cannot end call: socket not connected');
    }
  }

  sendIceCandidate(data: { to: string; from: string; candidate: any; callId?: string }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ice-candidate', data);
    } else {
      console.warn('❌ Cannot send ICE candidate: socket not connected');
    }
  }
  

  // Improved call event listeners with proper cleanup
  onIncomingCall(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('incoming-call');
    this.socket.on('incoming-call', (data) => {
      console.log('📞 Incoming call event received:', data);
      callback(data);
    });
  }

  onCallAccepted(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-accepted');
    this.socket.on('call-accepted', (data) => {
      console.log('✅ Call accepted event received:', data);
      callback(data);
    });
  }

  onCallRejected(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-rejected');
    this.socket.on('call-rejected', (data) => {
      console.log('❌ Call rejected event received:', data);
      callback(data);
    });
  }

  onCallEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-ended');
    this.socket.on('call-ended', (data) => {
      console.log('📞 Call ended event received:', data);
      callback(data);
    });
  }

  onIceCandidate(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('ice-candidate');
    this.socket.on('ice-candidate', callback);
  }

  // Other event listeners
  onMessageDelivered(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('messageDelivered');
    this.socket.on('messageDelivered', callback);
  }

  onMessageRead(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('messageRead');
    this.socket.on('messageRead', callback);
  }

  onUserOnline(callback: (userId: string) => void) {
    if (!this.socket) return;
    
    this.socket.off('userOnline');
    this.socket.on('userOnline', callback);
  }

  onUserOffline(callback: (userId: string) => void) {
    if (!this.socket) return;
    
    this.socket.off('userOffline');
    this.socket.on('userOffline', callback);
  }

  onOnlineUsers(callback: (userIds: string[]) => void) {
    if (!this.socket) return;
    
    this.socket.off('onlineUsers');
    this.socket.on('onlineUsers', callback);
  }

  onUserTyping(callback: (data: { userId: string; receiverId: string; isTyping: boolean }) => void) {
    if (!this.socket) return;
    
    this.socket.off('typing');
    this.socket.on('typing', callback);
  }

  onLastMessageUpdate(callback: (data: { chatId: string; lastMessage: string }) => void) {
    if (!this.socket) return;
    
    this.socket.off('lastMessage');
    this.socket.on('lastMessage', callback);
  }

  // Remove specific listeners
  offMessageReceived(callback?: (message: any) => void) {
    this.socket?.off('receiveMessage', callback);
  }

  offMessageDelivered(callback?: (data: any) => void) {
    this.socket?.off('messageDelivered', callback);
  }

  offMessageRead(callback?: (data: any) => void) {
    this.socket?.off('messageRead', callback);
  }

  offUserOnline(callback?: (userId: string) => void) {
    this.socket?.off('userOnline', callback);
  }

  offUserOffline(callback?: (userId: string) => void) {
    this.socket?.off('userOffline', callback);
  }

  offOnlineUsers(callback?: (userIds: string[]) => void) {
    this.socket?.off('onlineUsers', callback);
  }

  offUserTyping(callback?: (data: { userId: string; receiverId: string; isTyping: boolean }) => void) {
    this.socket?.off('typing', callback);
  }

  offIncomingCall(callback?: (data: any) => void) {
    this.socket?.off('incoming-call', callback);
  }

  offCallAccepted(callback?: (data: any) => void) {
    this.socket?.off('call-accepted', callback);
  }

  offCallRejected(callback?: (data: any) => void) {
    this.socket?.off('call-rejected', callback);
  }

  offCallEnded(callback?: (data: any) => void) {
    this.socket?.off('call-ended', callback);
  }

  offIceCandidate(callback?: (data: any) => void) {
    this.socket?.off('ice-candidate', callback);
  }
}

export const socketService = new SocketService();