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
    this.socket.on('message:received', callbacks.onMessage);
    this.socket.on('user:typing', callbacks.onTyping);
    this.socket.on('user:online', (userId) => callbacks.onUserStatus({ userId, isOnline: true }));
    this.socket.on('user:offline', (userId) => callbacks.onUserStatus({ userId, isOnline: false }));
    this.socket.on('chat:last_message_updated', callbacks.onLastMessage);
    
    // Message action listeners
    if (callbacks.onMessageDeleted) {
      this.socket.on('message:deleted', callbacks.onMessageDeleted);
    }
    if (callbacks.onMessageRead) {
      this.socket.on('message:read', callbacks.onMessageRead);
    }
    if (callbacks.onFavoriteToggled) {
      this.socket.on('message:favorited', callbacks.onFavoriteToggled);
    }
    if (callbacks.onMessageForwarded) {
      this.socket.on('message:forwarded', callbacks.onMessageForwarded);
    }
    if (callbacks.onMessageCopied) {
      this.socket.on('message:copied', callbacks.onMessageCopied);
    }
    if (callbacks.onMessageEdited) {
      this.socket.on('message:edited', callbacks.onMessageEdited);
    }
    if (callbacks.onChatUpdated) {
      this.socket.on('chat:updated', callbacks.onChatUpdated);
    }
    if (callbacks.onGroupEvent) {
      this.socket.on('group:member_added', callbacks.onGroupEvent);
      this.socket.on('group:member_removed', callbacks.onGroupEvent);
      this.socket.on('group:admin_changed', callbacks.onGroupEvent);
      this.socket.on('group:settings_updated', callbacks.onGroupEvent);
    }
    if (callbacks.onNotification) {
      this.socket.on('notification:new', callbacks.onNotification);
    }

    console.log('📡 Chat gateway listeners setup complete');
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
      this.cleanupSocket();
    }

    console.log('🔌 Creating new socket connection to chat gateway...');
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
      upgrade: true,
    });

    this.setupSocketEventHandlers();
    this.isConnecting = false;

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
        this.socket?.emit('user:join', { userId: this.currentUserId });
        console.log(`🏠 Joined user room: ${this.currentUserId}`);
      }
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Request current online users and sync state
      setTimeout(() => {
        this.socket?.emit('user:get_online_users');
        this.socket?.emit('chat:sync_state');
      }, 500);
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
        this.socket?.emit('user:join', { userId: this.currentUserId });
        this.socket?.emit('chat:sync_state');
        this.requestOnlineUsers();
      }
    });

    // Heartbeat/health check
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('🚨 Chat gateway error:', error);
      this.emit('error', error);
    });

    // Gateway specific events
    this.socket.on('gateway:health', (data) => {
      console.log('💚 Gateway health check:', data);
    });

    this.socket.on('gateway:rate_limit', (data) => {
      console.warn('⚠️ Rate limit warning:', data);
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        
        // Check if we haven't received a pong in too long
        if (Date.now() - this.lastHeartbeat > 30000) {
          console.warn('⚠️ Heartbeat timeout, reconnecting...');
          this.socket.disconnect().connect();
        }
      }
    }, 10000);
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
        this.socket.emit('chat:leave', { chatId: this.currentChatId, userId: this.currentUserId });
        console.log(`🚪 Left chat: ${this.currentChatId}`);
      }

      // Join new chat
      this.currentChatId = chatId;
      this.socket.emit('chat:join', {
        userId: this.currentUserId,
        chatId,
      });
      console.log(`🔗 Joined chat: ${chatId}`);
    } else {
      console.warn('❌ Cannot join channel: socket not connected');
    }
  }

  leaveChannel(chatId?: string) {
    const targetChatId = chatId || this.currentChatId;
    if (this.socket?.connected && targetChatId) {
      this.socket.emit('chat:leave', { chatId: targetChatId, userId: this.currentUserId });
      console.log(`🚪 Left chat: ${targetChatId}`);
      
      if (targetChatId === this.currentChatId) {
        this.currentChatId = null;
      }
    }
  }

  sendMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('❌ Socket not connected when trying to send message');
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('📤 Sending message via gateway:', message);
      
      const payload = {
        ...message,
        timestamp: Date.now(),
        clientId: `${this.currentUserId}-${Date.now()}`, // For deduplication
      };

      this.socket.emit('message:send', payload, (response: any) => {
        console.log('📤 Send message response:', response);
        if (response?.error) {
          console.error('❌ Send message error:', response.error);
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  editMessage(messageId: string, newContent: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('message:edit', {
        messageId,
        content: newContent,
        editedAt: Date.now(),
      }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      console.log(`💬 Sending typing indicator: receiverId=${receiverId}, isTyping=${isTyping}`);
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
      this.socket.emit('message:mark_read', {
        messageId,
        senderId,
        readAt: Date.now(),
      });
    } else {
      console.warn('❌ Cannot mark as read: socket not connected');
    }
  }

  // Enhanced Message Action Methods with Gateway Events
  deleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onDeleted = (data: any) => {
        if (data?.messageId === messageId) {
          this.socket?.off("message:deleted", onDeleted);
          resolve();
        }
      };

      this.socket.on("message:deleted", onDeleted);

      this.socket.emit("message:delete", {
        messageId,
        hard: false,
        deletedAt: Date.now(),
        ...options,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.off("message:deleted", onDeleted);
        reject(new Error("Delete timeout"));
      }, 10000);
    });
  }

  hardDeleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onDeleted = (data: any) => {
        if (data?.messageId === messageId) {
          this.socket?.off("message:deleted", onDeleted);
          resolve();
        }
      };

      this.socket.on("message:deleted", onDeleted);

      this.socket.emit("message:delete", {
        messageId,
        hard: true,
        deletedAt: Date.now(),
        ...options,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.off("message:deleted", onDeleted);
        reject(new Error("Hard delete timeout"));
      }, 10000);
    });
  }

  // Chat management methods
  createChat(data: { type: 'private' | 'group', participants: string[], name?: string }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('chat:create', data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  updateChat(chatId: string, updates: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('chat:update', { chatId, ...updates }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  // Group management methods
  addMemberToGroup(groupId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('group:add_member', { groupId, userId }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('group:remove_member', { groupId, userId }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
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
  this.socket.emit('user:get_online_users', { userId: this.currentUserId });
}

  // Keep existing methods for backward compatibility...
  async replyToMessage(data: ReplyMessagePayload): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.replyToMessageViaAPI(data).then(resolve).catch(reject);
        return;
      }

      const payload = { ...data };
      this.socket.emit('message:reply', payload, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // [Keep all other existing methods...]
  
  // Call-related methods remain the same but with gateway events
  callUser(data: { to: string; from: string; offer: any; type: 'video' | 'audio'; fromName?: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('📞 Initiating call via gateway:', data);
      this.socket.emit('call:initiate', data);
    } else {
      console.warn('❌ Cannot initiate call: socket not connected');
    }
  }

  acceptCall(data: { to: string; from: string; answer: any; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('✅ Accepting call via gateway:', data);
      this.socket.emit('call:accept', data);
    } else {
      console.warn('❌ Cannot accept call: socket not connected');
    }
  }

  rejectCall(data: { to: string; from: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('❌ Rejecting call via gateway:', data);
      this.socket.emit('call:reject', data);
    } else {
      console.warn('❌ Cannot reject call: socket not connected');
    }
  }

  endCall(data: { to: string; from: string; callId?: string }) {
    if (this.socket && this.socket.connected) {
      console.log('📞 Ending call via gateway:', data);
      this.socket.emit('call:end', data);
    } else {
      console.warn('❌ Cannot end call: socket not connected');
    }
  }

  // Enhanced call event listeners for gateway
  onIncomingCall(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call:incoming');
    this.socket.on('call:incoming', (data) => {
      console.log('📞 Incoming call event from gateway:', data);
      callback(data);
    });
  }

  onCallAccepted(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call:accepted');
    this.socket.on('call:accepted', (data) => {
      console.log('✅ Call accepted event from gateway:', data);
      callback(data);
    });
  }

  onCallRejected(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call:rejected');
    this.socket.on('call:rejected', (data) => {
      console.log('❌ Call rejected event from gateway:', data);
      callback(data);
    });
  }

  onCallEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.off('call:ended');
    this.socket.on('call:ended', (data) => {
      console.log('📞 Call ended event from gateway:', data);
      callback(data);
    });
  }

  // Keep all REST API fallback methods...
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

  // Request gateway status
  requestGatewayStatus() {
    if (this.socket?.connected) {
      this.socket.emit('gateway:status');
    }
  }

  // Sync state with gateway
  syncState() {
    if (this.socket?.connected) {
      this.socket.emit('chat:sync_state');
    }
  }
}

export const socketService = new SocketService();