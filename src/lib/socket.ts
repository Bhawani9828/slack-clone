// socket.service.ts - Enhanced Version with Chat Gateway Integration
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { ReplyMessagePayload } from '@/types/chatTypes';

export interface DeleteOptions {
  isGroupChat?: boolean;
  groupId?: string;
}

export interface ChatGatewayEvents {
  // Message events
  'message:sent': (data: any) => void;
  'message:received': (data: any) => void;
  'message:delivered': (data: any) => void;
  'message:read': (data: any) => void;
  'message:deleted': (data: any) => void;
  'message:edited': (data: any) => void;
  'message:favorited': (data: any) => void;
  'message:forwarded': (data: any) => void;
  'message:copied': (data: any) => void;
  
  // Chat events
  'chat:joined': (data: any) => void;
  'chat:left': (data: any) => void;
  'chat:created': (data: any) => void;
  'chat:updated': (data: any) => void;
  'chat:deleted': (data: any) => void;
  
  // User events
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'user:typing': (data: any) => void;
  'user:stopped_typing': (data: any) => void;
  
  // Call events
  'call:incoming': (data: any) => void;
  'call:accepted': (data: any) => void;
  'call:rejected': (data: any) => void;
  'call:ended': (data: any) => void;
  'call:ice_candidate': (data: any) => void;
  
  // Group events
  'group:member_added': (data: any) => void;
  'group:member_removed': (data: any) => void;
  'group:admin_changed': (data: any) => void;
  'group:settings_updated': (data: any) => void;
  
  // Notification events
  'notification:new': (data: any) => void;
  'notification:read': (data: any) => void;
  
  // System events
  'system:maintenance': (data: any) => void;
  'system:update': (data: any) => void;
  'error': (error: any) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private currentChatId: string | null = null;
  private currentUserId: string | null = null;
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private isConnecting = false;
  private eventListeners: Map<string, Function[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();

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
    onMessageEdited?: (data: any) => void;
    onChatUpdated?: (data: any) => void;
    onGroupEvent?: (data: any) => void;
    onNotification?: (data: any) => void;
  }) {
    if (!this.socket) return;

    // Remove existing listeners
    this.removeAllEventListeners();

    // Setup new listeners with gateway events
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
    if (callbacks.onMessageEdited) {
      this.socket.on('messageEdited', callbacks.onMessageEdited);
    }
    if (callbacks.onChatUpdated) {
      this.socket.on('chatUpdated', callbacks.onChatUpdated);
    }
    if (callbacks.onGroupEvent) {
      this.socket.on('groupMemberAdded', callbacks.onGroupEvent);
      this.socket.on('groupMemberRemoved', callbacks.onGroupEvent);
      this.socket.on('groupAdminChanged', callbacks.onGroupEvent);
      this.socket.on('groupSettingsUpdated', callbacks.onGroupEvent);
    }
    if (callbacks.onNotification) {
      this.socket.on('notification', callbacks.onNotification);
    }

    // Connection events
    this.socket.on('connectionSuccess', (data: any) => {
      console.log('✅ Connected to chat server:', data);
    });

    this.socket.on('onlineUsers', (users: string[]) => {
      console.log('👥 Online users received:', users.length);
    });

    console.log('📡 Chat gateway listeners setup complete');
  }

  connect(userId?: string): Socket {
    if (userId) {
      this.currentUserId = userId;
    }

    // Check if we already have a working connection
    if (this.socket && this.socket.connected && this.socket.id) {
      console.log('✅ Socket already connected and working');
      return this.socket;
    }

    const token = Cookies.get('auth_token');
    if (!token) {
      console.warn('❌ No token found');
      throw new Error('Authentication token not found');
    }

    // Clean up any existing socket
    if (this.socket) {
      this.cleanupSocket();
    }

    console.log('🔌 Creating new socket connection to chat gateway...');
    this.socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
      auth: {
        token: `Bearer ${token}`,
        userId: this.currentUserId,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectionAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.setupSocketEventHandlers();
    this.startConnectionMonitoring();

    return this.socket;
  }

  private setupSocketEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to chat gateway, Socket ID:', this.socket?.id);
      this.reconnectionAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      // Join user to their own room for receiving messages
      if (this.currentUserId) {
        this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
        console.log(`🏠 Joined user room: ${this.currentUserId}`);
      }
      
      // Restore any previous chat room
      if (this.currentChatId) {
        this.socket?.emit('joinChat', { chatId: this.currentChatId });
        console.log(`🔗 Rejoined chat: ${this.currentChatId}`);
      }
      
      // Request current online users
      this.socket?.emit('getOnlineUsers');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat gateway:', reason);
      this.stopHeartbeat();

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
      console.error('🚨 Chat gateway connection error:', error);
      this.reconnectionAttempts++;
      
      if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.emit('connection_failed', { error, attempts: this.reconnectionAttempts });
      }
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconnected to chat gateway');
      this.reconnectionAttempts = 0;
      
      // Re-join user room and sync state after reconnection
      if (this.currentUserId) {
        this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
        this.socket?.emit('getOnlineUsers');
      }
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('🚨 Chat gateway error:', error);
      this.emit('error', error);
    });

    this.socket.on('messageError', (error) => {
      console.error('🚨 Message error:', error);
      this.emit('message_error', error);
    });
  }

  private startConnectionMonitoring() {
    // Check connection status every 5 seconds
    setInterval(() => {
      if (this.socket && !this.socket.connected) {
        console.log('🔄 Socket disconnected, attempting to reconnect...');
        this.connect(this.currentUserId!);
      }
    }, 5000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        // Simple ping to keep connection alive
        this.socket.emit('ping');
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private cleanupSocket() {
    if (this.socket) {
      this.stopHeartbeat();
      this.removeAllEventListeners();
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting from chat gateway...');
    this.cleanupSocket();
    this.socket = null;
    this.reconnectionAttempts = 0;
    this.isConnecting = false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getConnectionHealth(): {
    connected: boolean;
    lastHeartbeat: number;
    reconnectionAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      lastHeartbeat: this.lastHeartbeat,
      reconnectionAttempts: this.reconnectionAttempts,
    };
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
      this.socket.emit('joinChat', { chatId });
      console.log(`🔗 Joined chat: ${chatId}`);
    } else {
      console.warn('❌ Cannot join channel: socket not connected');
    }
  }

  leaveChannel(chatId?: string) {
    const targetChatId = chatId || this.currentChatId;
    if (this.socket?.connected && targetChatId) {
      this.socket.emit('leaveChat', { chatId: targetChatId });
      console.log(`🚪 Left chat: ${targetChatId}`);
      
      if (targetChatId === this.currentChatId) {
        this.currentChatId = null;
      }
    }
  }

  async sendMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('❌ Socket not connected when trying to send message');
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('📤 Sending message via gateway:', message);
      
      // Add timestamp and client ID for deduplication
      const payload = {
        ...message,
        timestamp: Date.now(),
        clientId: `${this.currentUserId}-${Date.now()}`,
      };

      // Use sendMessage event (gateway expects this)
      this.socket.emit('sendMessage', payload, (response: any) => {
        console.log('📤 Send message response:', response);
        if (response?.error) {
          console.error('❌ Send message error:', response.error);
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });

      // Also send with message:send for compatibility
      this.socket.emit('message:send', payload);
    });
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      console.log(`💬 Sending typing indicator: receiverId=${receiverId}, isTyping=${isTyping}`);
      this.socket.emit('typing', {
        receiverId,
        isTyping,
        timestamp: Date.now(),
      });
      
      // Also send with user:typing for compatibility
      this.socket.emit('user:typing', {
        receiverId,
        isTyping,
        timestamp: Date.now(),
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
        readAt: Date.now(),
      });
      
      // Also send with message:mark_read for compatibility
      this.socket.emit('message:mark_read', {
        messageId,
        senderId,
        readAt: Date.now(),
      });
    } else {
      console.warn('❌ Cannot mark as read: socket not connected');
    }
  }

  // Enhanced Message Action Methods
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
        deletedAt: Date.now(),
        ...options,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.off("messageDeleted", onDeleted);
        reject(new Error("Delete timeout"));
      }, 10000);
    });
  }

  // Event emitter functionality
  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  on(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  private removeAllEventListeners() {
    this.eventListeners.clear();
  }

  public requestOnlineUsers() {
    if (!this.socket || !this.currentUserId) return;

    console.log('📡 Requesting online users from server...');
    this.socket.emit('getOnlineUsers', { userId: this.currentUserId });
  }

  // Call-related methods
  callUser(data: { to: string; from: string; offer: any; type: 'video' | 'audio'; fromName?: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('📞 Initiating call:', data);
      this.socket.emit('call-user', data);
    } else {
      console.warn('❌ Cannot initiate call: socket not connected');
    }
  }

  acceptCall(data: { to: string; from: string; answer: any; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('✅ Accepting call:', data);
      this.socket.emit('call-accepted', data);
    } else {
      console.warn('❌ Cannot accept call: socket not connected');
    }
  }

  rejectCall(data: { to: string; from: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('❌ Rejecting call:', data);
      this.socket.emit('call-rejected', data);
    } else {
      console.warn('❌ Cannot reject call: socket not connected');
    }
  }

  endCall(data: { to: string; from: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('📞 Ending call:', data);
      this.socket.emit('end-call', data);
    } else {
      console.warn('❌ Cannot end call: socket not connected');
    }
  }

  // Call event listeners
  onIncomingCall(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('incoming-call');
    this.socket.on('incoming-call', (data) => {
      console.log('📞 Incoming call event:', data);
      callback(data);
    });
  }

  onCallAccepted(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-accepted');
    this.socket.on('call-accepted', (data) => {
      console.log('✅ Call accepted event:', data);
      callback(data);
    });
  }

  onCallRejected(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-rejected');
    this.socket.on('call-rejected', (data) => {
      console.log('❌ Call rejected event:', data);
      callback(data);
    });
  }

  onCallEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call-ended');
    this.socket.on('call-ended', (data) => {
      console.log('📞 Call ended event:', data);
      callback(data);
    });
  }

  // Debugging helper
  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      socketId: this.socket?.id,
      currentUserId: this.currentUserId,
      currentChatId: this.currentChatId,
      reconnectionAttempts: this.reconnectionAttempts
    };
  }
}

export const socketService = new SocketService();