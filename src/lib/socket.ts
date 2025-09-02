// // socket.service.ts - Enhanced Version with Status Methods
// import { io, Socket } from 'socket.io-client';
// import Cookies from 'js-cookie';
// import { ReplyMessagePayload } from '@/types/chatTypes';

// import { updateUserOnlineStatus, updateChatUserOnlineStatus } from '@/lib/store/slices/userSlice';
// import { store } from './store';
// import { DeleteOptions, UserStatusData } from '@/types/socketServiceTypes';



// class SocketService {
//   private socket: Socket | null = null;
//   private currentChatId: string | null = null;
//   private currentUserId: string | null = null;
//   private reconnectionAttempts = 0;
//   private maxReconnectionAttempts = 5;
//   private isConnecting = false;
//   private eventListeners: Map<string, Function[]> = new Map();
//   private heartbeatInterval: NodeJS.Timeout | null = null;
//   private lastHeartbeat: number = Date.now();
//    private statusUpdateListeners: Map<string, (status: UserStatusData) => void> = new Map();

//   setCurrentUserId(userId: string) {
//     this.currentUserId = userId;
//   }

//   setupMessageListeners(callbacks: {
//     onMessage: (msg: any) => void;
//     onTyping: (data: any) => void;
//     onUserStatus: (data: any) => void;
//     onLastMessage: (data: any) => void;
//     onMessageDeleted?: (data: any) => void;
//     onMessageRead?: (data: any) => void;
//     onFavoriteToggled?: (data: any) => void;
//     onMessageForwarded?: (data: any) => void;
//     onMessageCopied?: (data: any) => void;
//     onMessageEdited?: (data: any) => void;
//     onChatUpdated?: (data: any) => void;
//     onGroupEvent?: (data: any) => void;
//     onNotification?: (data: any) => void;
//   }) {
//     if (!this.socket) return;

   
//     this.removeAllEventListeners();

    
//     this.socket.on('receiveMessage', callbacks.onMessage);
//     this.socket.on('typing', callbacks.onTyping);
    
 
//     this.socket.on('userOnline', (data: { userId: string; lastSeen?: string; isOnline: boolean }) => {
//       console.log(`🟢 User ${data.userId} is online`);
      
//       store.dispatch(updateUserOnlineStatus({ 
//         userId: data.userId, 
//         isOnline: true,
//         lastSeen: data.lastSeen 
//       }));
//       store.dispatch(updateChatUserOnlineStatus({ 
//         userId: data.userId, 
//         isOnline: true,
//         lastSeen: data.lastSeen 
//       }));
      
    
//       callbacks.onUserStatus({
//         userId: data.userId,
//         isOnline: true,
//         lastSeen: data.lastSeen,
//         type: 'online'
//       });
//     });

//     this.socket.on('userOffline', (data: { userId: string; lastSeen?: string; isOnline: boolean }) => {
//       console.log(`⚪ User ${data.userId} is offline, last seen: ${data.lastSeen}`);
      
//       store.dispatch(updateUserOnlineStatus({ 
//         userId: data.userId, 
//         isOnline: false,
//         lastSeen: data.lastSeen 
//       }));
//       store.dispatch(updateChatUserOnlineStatus({ 
//         userId: data.userId, 
//         isOnline: false,
//         lastSeen: data.lastSeen 
//       }));
      
      
//       callbacks.onUserStatus({
//         userId: data.userId,
//         isOnline: false,
//         lastSeen: data.lastSeen,
//         type: 'offline'
//       });
//     });

    
//     this.socket.on('userStatus', (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
//       console.log(`📊 User status response:`, data);
      
//       store.dispatch(updateUserOnlineStatus({ 
//         userId: data.userId, 
//         isOnline: data.isOnline,
//         lastSeen: data.lastSeen 
//       }));
//       store.dispatch(updateChatUserOnlineStatus({ 
//         userId: data.userId, 
//         isOnline: data.isOnline,
//         lastSeen: data.lastSeen 
//       }));
      
      
//       callbacks.onUserStatus({
//         userId: data.userId,
//         isOnline: data.isOnline,
//         lastSeen: data.lastSeen,
//         type: 'status_response'
//       });
//     });

//     this.socket.on('lastMessage', callbacks.onLastMessage);
    
//     // Message action listeners
//     if (callbacks.onMessageDeleted) {
//       this.socket.on('messageDeleted', callbacks.onMessageDeleted);
//     }
//     if (callbacks.onMessageRead) {
//       this.socket.on('messageRead', callbacks.onMessageRead);
//     }
//     if (callbacks.onFavoriteToggled) {
//       this.socket.on('favoriteToggled', callbacks.onFavoriteToggled);
//     }
//     if (callbacks.onMessageForwarded) {
//       this.socket.on('messageForwarded', callbacks.onMessageForwarded);
//     }
//     if (callbacks.onMessageCopied) {
//       this.socket.on('messageCopied', callbacks.onMessageCopied);
//     }
//     if (callbacks.onMessageEdited) {
//       this.socket.on('messageEdited', callbacks.onMessageEdited);
//     }
//     if (callbacks.onChatUpdated) {
//       this.socket.on('chatUpdated', callbacks.onChatUpdated);
//     }
//     if (callbacks.onGroupEvent) {
//       this.socket.on('groupMemberAdded', callbacks.onGroupEvent);
//       this.socket.on('groupMemberRemoved', callbacks.onGroupEvent);
//       this.socket.on('groupAdminChanged', callbacks.onGroupEvent);
//       this.socket.on('groupSettingsUpdated', callbacks.onGroupEvent);
//     }
//     if (callbacks.onNotification) {
//       this.socket.on('notification', callbacks.onNotification);
//     }

   
//     this.socket.on('connectionSuccess', (data: any) => {
//       console.log('✅ Connected to chat server:', data);
//     });

//     this.socket.on('onlineUsers', (users: string[]) => {
//       console.log('👥 Online users received:', users.length);
      
      
//       users.forEach(userId => {
//         store.dispatch(updateUserOnlineStatus({ 
//           userId, 
//           isOnline: true 
//         }));
//         store.dispatch(updateChatUserOnlineStatus({ 
//           userId, 
//           isOnline: true 
//         }));
//       });
//     });

    
//     this.socket.on('userStatusError', (error: any) => {
//       console.error('❌ User status error:', error);
//     });

//     console.log('📡 Chat gateway listeners setup complete');
//   }

//   connect(userId?: string): Socket {
//     if (userId) {
//       this.currentUserId = userId;
//     }

    
//     if (this.socket && this.socket.connected && this.socket.id) {
//       console.log('✅ Socket already connected and working');
//       return this.socket;
//     }

//     const token = Cookies.get('auth_token');
//     if (!token) {
//       console.warn('❌ No token found');
//       throw new Error('Authentication token not found');
//     }

    
//     if (this.socket) {
//       this.cleanupSocket();
//     }

//     console.log('🔌 Creating new socket connection to chat gateway...');
//     this.socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
//       auth: {
//         token: `Bearer ${token}`,
//         userId: this.currentUserId,
//       },
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionAttempts: this.maxReconnectionAttempts,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       timeout: 10000,
//     });

//     this.setupSocketEventHandlers();
//     this.startConnectionMonitoring();

//     return this.socket;
//   }

//   private setupSocketEventHandlers() {
//     if (!this.socket) return;

   
//     this.socket.on('connect', () => {
//       console.log('✅ Connected to chat gateway, Socket ID:', this.socket?.id);
//       this.reconnectionAttempts = 0;
//       this.lastHeartbeat = Date.now();
      
     
//       if (this.currentUserId) {
//         this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
//         console.log(`🏠 Joined user room: ${this.currentUserId}`);
//       }
      
      
//       if (this.currentChatId) {
//         this.socket?.emit('joinChat', { chatId: this.currentChatId });
//         console.log(`🔗 Rejoined chat: ${this.currentChatId}`);
//       }
      
     
//       this.socket?.emit('getOnlineUsers');
//     });

//     this.socket.on('disconnect', (reason) => {
//       console.log('❌ Disconnected from chat gateway:', reason);
//       this.stopHeartbeat();

//       if (reason === 'io server disconnect') {
        
//         setTimeout(() => {
//           if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
//             this.reconnectionAttempts++;
//             console.log(`🔄 Attempting reconnection ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}`);
//             this.socket?.connect();
//           }
//         }, 1000);
//       }
//     });

//     this.socket.on('connect_error', (error) => {
//       console.error('🚨 Chat gateway connection error:', error);
//       this.reconnectionAttempts++;
      
//       if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
//         console.error('❌ Max reconnection attempts reached');
//         this.emit('connection_failed', { error, attempts: this.reconnectionAttempts });
//       }
//     });

//     this.socket.on('reconnect', () => {
//       console.log('🔄 Reconnected to chat gateway');
//       this.reconnectionAttempts = 0;
      
      
//       if (this.currentUserId) {
//         this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
//         this.socket?.emit('getOnlineUsers');
//       }
//     });

    
//     this.socket.on('error', (error) => {
//       console.error('🚨 Chat gateway error:', error);
//       this.emit('error', error);
//     });

//     this.socket.on('messageError', (error) => {
//       console.error('🚨 Message error:', error);
//       this.emit('message_error', error);
//     });
//   }

//   private startConnectionMonitoring() {
    
//     setInterval(() => {
//       if (this.socket && !this.socket.connected) {
//         console.log('🔄 Socket disconnected, attempting to reconnect...');
//         this.connect(this.currentUserId!);
//       }
//     }, 5000);
//   }

//   private startHeartbeat() {
//     this.stopHeartbeat();
//     this.heartbeatInterval = setInterval(() => {
//       if (this.socket?.connected) {
       
//         this.socket.emit('ping');
//       }
//     }, 30000); 
//   }

//   private stopHeartbeat() {
//     if (this.heartbeatInterval) {
//       clearInterval(this.heartbeatInterval);
//       this.heartbeatInterval = null;
//     }
//   }

//   private cleanupSocket() {
//     if (this.socket) {
//       this.stopHeartbeat();
//       this.removeAllEventListeners();
//       this.socket.removeAllListeners();
//       this.socket.disconnect();
//     }
//   }

//   disconnect() {
//     console.log('🔌 Disconnecting from chat gateway...');
//     this.cleanupSocket();
//     this.socket = null;
//     this.reconnectionAttempts = 0;
//     this.isConnecting = false;
//   }

//   getSocket(): Socket | null {
//     return this.socket;
//   }

//   isConnected(): boolean {
//     return this.socket?.connected ?? false;
//   }

//   getConnectionHealth(): {
//     connected: boolean;
//     lastHeartbeat: number;
//     reconnectionAttempts: number;
//   } {
//     return {
//       connected: this.isConnected(),
//       lastHeartbeat: this.lastHeartbeat,
//       reconnectionAttempts: this.reconnectionAttempts,
//     };
//   }

//   joinChannel(chatId: string) {
//     if (this.socket && this.socket.connected) {
      
//       if (this.currentChatId && this.currentChatId !== chatId) {
//         this.socket.emit('leaveChat', { chatId: this.currentChatId });
//         console.log(`Left chat: ${this.currentChatId}`);
//       }

      
//       this.currentChatId = chatId;
//       this.socket.emit('joinChat', { chatId });
//       console.log(`Joined chat: ${chatId}`);
//     } else {
//       console.warn('Cannot join channel: socket not connected');
//     }
//   }

//   leaveChannel(chatId?: string) {
//     const targetChatId = chatId || this.currentChatId;
//     if (this.socket?.connected && targetChatId) {
//       this.socket.emit('leaveChat', { chatId: targetChatId });
//       console.log(`Left chat: ${targetChatId}`);
      
//       if (targetChatId === this.currentChatId) {
//         this.currentChatId = null;
//       }
//     }
//   }

//   async sendMessage(message: any): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.socket?.connected) {
//         console.error('Socket not connected when trying to send message');
//         reject(new Error('Socket not connected'));
//         return;
//       }

//       console.log('Sending message via gateway:', message);
      
      
//       const payload = {
//         ...message,
//         timestamp: Date.now(),
//         clientId: `${this.currentUserId}-${Date.now()}`,
//       };

     
//       this.socket.emit('sendMessage', payload, (response: any) => {
//         console.log('Send message response:', response);
//         if (response?.error) {
//           console.error('Send message error:', response.error);
//           reject(new Error(response.error));
//         } else {
//           resolve();
//         }
//       });

    
//       this.socket.emit('message:send', payload);
//     });
//   }

//   sendTypingIndicator(receiverId: string, isTyping: boolean) {
//     if (this.socket && this.socket.connected) {
//       console.log(`Sending typing indicator: receiverId=${receiverId}, isTyping=${isTyping}`);
//       this.socket.emit('typing', {
//         receiverId,
//         isTyping,
//         timestamp: Date.now(),
//       });
      
//       // Also send with user:typing for compatibility
//       this.socket.emit('user:typing', {
//         receiverId,
//         isTyping,
//         timestamp: Date.now(),
//       });
//     } else {
//       console.warn('Cannot send typing indicator: socket not connected');
//     }
//   }

//   markAsRead(messageId: string, senderId: string) {
//     if (this.socket && this.socket.connected) {
//       console.log(`Marking as read: messageId=${messageId}, senderId=${senderId}`);
//       this.socket.emit('markAsRead', {
//         messageId,
//         senderId,
//         readAt: Date.now(),
//       });
      
//       // Also send with message:mark_read for compatibility
//       this.socket.emit('message:mark_read', {
//         messageId,
//         senderId,
//         readAt: Date.now(),
//       });
//     } else {
//       console.warn('Cannot mark as read: socket not connected');
//     }
//   }

 
//   requestUserStatus(userId: string) {
//     if (this.socket && this.socket.connected) {
//       console.log(`Requesting status for user: ${userId}`);
//       this.socket.emit('getUserStatus', { userId });
//     } else {
//       console.warn('Cannot request user status: socket not connected');
//     }
//   }

  
//   getCurrentUserStatus(): { isOnline: boolean; userId: string | null } {
//     return {
//       isOnline: this.socket?.connected || false,
//       userId: this.currentUserId,
//     };
//   }

  
//   deleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.socket?.connected) {
//         return reject(new Error("Socket not connected"));
//       }

//       const onDeleted = (data: any) => {
//         if (data?.messageId === messageId) {
//           this.socket?.off("messageDeleted", onDeleted);
//           resolve();
//         }
//       };

//       this.socket.on("messageDeleted", onDeleted);

//       this.socket.emit("deleteMessage", {
//         messageId,
//         hard: false,
//         deletedAt: Date.now(),
//         ...options,
//       });

//       // Timeout after 10 seconds
//       setTimeout(() => {
//         this.socket?.off("messageDeleted", onDeleted);
//         reject(new Error("Delete timeout"));
//       }, 10000);
//     });
//   }

 
//   forwardMessage(messageId: string, receiverIds: string[]): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.socket?.connected) {
//         return reject(new Error("Socket not connected"));
//       }

//       const onForwarded = (data: any) => {
//         if (data?.originalMessageId === messageId) {
//           this.socket?.off("messageForwarded", onForwarded);
//           resolve();
//         }
//       };

//       this.socket.on("messageForwarded", onForwarded);

//       this.socket.emit("forwardMessage", {
//         messageId,
//         receiverIds,
//         timestamp: Date.now(),
//       });

//       setTimeout(() => {
//         this.socket?.off("messageForwarded", onForwarded);
//         reject(new Error("Forward timeout"));
//       }, 10000);
//     });
//   }

  
//   replyMessage(payload: ReplyMessagePayload): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.socket?.connected) {
//         return reject(new Error("Socket not connected"));
//       }

//       const onDelivered = (data: any) => {
//         if (data?.replyTo === payload.originalMessageId) {
//           this.socket?.off("messageDelivered", onDelivered);
//           resolve();
//         }
//       };

//       this.socket.on("messageDelivered", onDelivered);

//       this.socket.emit("replyMessage", {
//         ...payload,
//         timestamp: Date.now(),
//       });

//       setTimeout(() => {
//         this.socket?.off("messageDelivered", onDelivered);
//         reject(new Error("Reply timeout"));
//       }, 10000);
//     });
//   }

  
//   toggleFavorite(messageId: string, isFavorite: boolean): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.socket?.connected) {
//         return reject(new Error("Socket not connected"));
//       }

//       const onToggled = (data: any) => {
//         if (data?.messageId === messageId) {
//           this.socket?.off("favoriteToggled", onToggled);
//           resolve();
//         }
//       };

//       this.socket.on("favoriteToggled", onToggled);

//       this.socket.emit("toggleFavorite", {
//         messageId,
//         isFavorite,
//         timestamp: Date.now(),
//       });

//       setTimeout(() => {
//         this.socket?.off("favoriteToggled", onToggled);
//         reject(new Error("Toggle favorite timeout"));
//       }, 10000);
//     });
//   }


//   private emit(event: string, data?: any) {
//     const listeners = this.eventListeners.get(event) || [];
//     listeners.forEach(listener => listener(data));
//   }

//   on(event: string, callback: Function) {
//     const listeners = this.eventListeners.get(event) || [];
//     listeners.push(callback);
//     this.eventListeners.set(event, listeners);
//   }

//   off(event: string, callback?: Function) {
//     if (!callback) {
//       this.eventListeners.delete(event);
//       return;
//     }

//     const listeners = this.eventListeners.get(event) || [];
//     const index = listeners.indexOf(callback);
//     if (index > -1) {
//       listeners.splice(index, 1);
//       this.eventListeners.set(event, listeners);
//     }
//   }

//   private removeAllEventListeners() {
//     this.eventListeners.clear();
//   }

//   public requestOnlineUsers() {
//     if (!this.socket || !this.currentUserId) return;

//     console.log('Requesting online users from server...');
//     this.socket.emit('getOnlineUsers', { userId: this.currentUserId });
//   }









//   //video and audio Call-related methods
//   callUser(data: { to: string; from: string; offer: any; type: 'video' | 'audio'; fromName?: string; callId?: string }) {
//     if (this.socket && this.socket.connected) {
//       console.log('Initiating call:', data);
//       this.socket.emit('call-user', data);
//     } else {
//       console.warn('Cannot initiate call: socket not connected');
//     }
//   }

//   acceptCall(data: { to: string; from: string; answer: any; callId?: string }) {
//     if (this.socket && this.socket.connected) {
//       console.log('Accepting call:', data);
//       this.socket.emit('call-accepted', data);
//     } else {
//       console.warn('Cannot accept call: socket not connected');
//     }
//   }

//   rejectCall(data: { to: string; from: string; callId?: string }) {
//     if (this.socket && this.socket.connected) {
//       console.log('Rejecting call:', data);
//       this.socket.emit('call-rejected', data);
//     } else {
//       console.warn('Cannot reject call: socket not connected');
//     }
//   }

//   endCall(data: { to: string; from: string; callId?: string }) {
//     if (this.socket && this.socket.connected) {
//       console.log('Ending call:', data);
//       this.socket.emit('end-call', data);
//     } else {
//       console.warn('Cannot end call: socket not connected');
//     }
//   }

//   // Call event listeners
//   onIncomingCall(callback: (data: any) => void) {
//     if (!this.socket) return;
    
//     this.socket.off('incoming-call');
//     this.socket.on('incoming-call', (data) => {
//       console.log('Incoming call event:', data);
//       callback(data);
//     });
//   }

//   onCallAccepted(callback: (data: any) => void) {
//     if (!this.socket) return;
    
//     this.socket.off('call-accepted');
//     this.socket.on('call-accepted', (data) => {
//       console.log('Call accepted event:', data);
//       callback(data);
//     });
//   }

//   onCallRejected(callback: (data: any) => void) {
//     if (!this.socket) return;
    
//     this.socket.off('call-rejected');
//     this.socket.on('call-rejected', (data) => {
//       console.log('Call rejected event:', data);
//       callback(data);
//     });
//   }

//   onCallEnded(callback: (data: any) => void) {
//     if (!this.socket) return;
    
//     this.socket.off('call-ended');
//     this.socket.on('call-ended', (data) => {
//       console.log('Call ended event:', data);
//       callback(data);
//     });
//   }

//   // Debugging helper
//   getConnectionStatus() {
//     return {
//       connected: this.socket?.connected || false,
//       socketId: this.socket?.id,
//       currentUserId: this.currentUserId,
//       currentChatId: this.currentChatId,
//       reconnectionAttempts: this.reconnectionAttempts
//     };
//   }
// }

// export const socketService = new SocketService();






// socket.service.ts - Refactored Version
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { ReplyMessagePayload } from '@/types/chatTypes';

import { updateUserOnlineStatus, updateChatUserOnlineStatus } from '@/lib/store/slices/userSlice';
import { store } from './store';
import { DeleteOptions, UserStatusData } from '@/types/socketServiceTypes';

// Import utility classes
import { ChatUtils } from '@/utils/chatUtils';
import { CallUtils } from '@/utils/callUtils';
import { StatusUtils } from '@/utils/statusUtils';

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

  // Utility instances
  private chatUtils: ChatUtils;
  private callUtils: CallUtils;
  private statusUtils: StatusUtils;

  constructor() {
    // Initialize utility classes
    this.chatUtils = new ChatUtils(null);
    this.callUtils = new CallUtils(null);
    this.statusUtils = new StatusUtils(null);
  }

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

    this.removeAllEventListeners();

    // Basic message listeners
    this.socket.on('receiveMessage', callbacks.onMessage);
    this.socket.on('typing', callbacks.onTyping);
    
    // User status listeners
    this.socket.on('userOnline', (data: { userId: string; lastSeen?: string; isOnline: boolean }) => {
      console.log(`🟢 User ${data.userId} is online`);
      
      store.dispatch(updateUserOnlineStatus({ 
        userId: data.userId, 
        isOnline: true,
        lastSeen: data.lastSeen 
      }));
      store.dispatch(updateChatUserOnlineStatus({ 
        userId: data.userId, 
        isOnline: true,
        lastSeen: data.lastSeen 
      }));
      
      callbacks.onUserStatus({
        userId: data.userId,
        isOnline: true,
        lastSeen: data.lastSeen,
        type: 'online'
      });

      // Notify status listeners
      this.statusUtils.notifyStatusListeners(data.userId, {
        userId: data.userId,
        isOnline: true,
        lastSeen: data.lastSeen,
        type: 'online'
      });
    });

    this.socket.on('userOffline', (data: { userId: string; lastSeen?: string; isOnline: boolean }) => {
      console.log(`⚪ User ${data.userId} is offline, last seen: ${data.lastSeen}`);
      
      store.dispatch(updateUserOnlineStatus({ 
        userId: data.userId, 
        isOnline: false,
        lastSeen: data.lastSeen 
      }));
      store.dispatch(updateChatUserOnlineStatus({ 
        userId: data.userId, 
        isOnline: false,
        lastSeen: data.lastSeen 
      }));
      
      callbacks.onUserStatus({
        userId: data.userId,
        isOnline: false,
        lastSeen: data.lastSeen,
        type: 'offline'
      });

      // Notify status listeners
      this.statusUtils.notifyStatusListeners(data.userId, {
        userId: data.userId,
        isOnline: false,
        lastSeen: data.lastSeen,
        type: 'offline'
      });
    });

    this.socket.on('userStatus', (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      console.log(`📊 User status response:`, data);
      
      store.dispatch(updateUserOnlineStatus({ 
        userId: data.userId, 
        isOnline: data.isOnline,
        lastSeen: data.lastSeen 
      }));
      store.dispatch(updateChatUserOnlineStatus({ 
        userId: data.userId, 
        isOnline: data.isOnline,
        lastSeen: data.lastSeen 
      }));
      
      callbacks.onUserStatus({
        userId: data.userId,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
        type: 'status_response'
      });

      // Notify status listeners
      this.statusUtils.notifyStatusListeners(data.userId, {
        userId: data.userId,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
        type: 'status_response'
      });
    });

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

    // Connection success listener
    this.socket.on('connectionSuccess', (data: any) => {
      console.log('✅ Connected to chat server:', data);
    });

    this.socket.on('onlineUsers', (users: string[]) => {
      console.log('👥 Online users received:', users.length);
      
      users.forEach(userId => {
        store.dispatch(updateUserOnlineStatus({ 
          userId, 
          isOnline: true 
        }));
        store.dispatch(updateChatUserOnlineStatus({ 
          userId, 
          isOnline: true 
        }));
      });
    });

    this.socket.on('userStatusError', (error: any) => {
      console.error('❌ User status error:', error);
    });

    console.log('📡 Chat gateway listeners setup complete');
  }

  connect(userId?: string): Socket {
    if (userId) {
      this.currentUserId = userId;
    }

    if (this.socket && this.socket.connected && this.socket.id) {
      console.log('✅ Socket already connected and working');
      return this.socket;
    }

    const token = Cookies.get('auth_token');
    if (!token) {
      console.warn('❌ No token found');
      throw new Error('Authentication token not found');
    }

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

    // Update utility classes with new socket
    this.updateUtilSockets();
    
    this.setupSocketEventHandlers();
    this.startConnectionMonitoring();

    return this.socket;
  }

  private updateUtilSockets() {
    this.chatUtils.updateSocket(this.socket);
    this.callUtils.updateSocket(this.socket);
    this.statusUtils.updateSocket(this.socket);
  }

  private setupSocketEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat gateway, Socket ID:', this.socket?.id);
      this.reconnectionAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      if (this.currentUserId) {
        this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
        console.log(`🏠 Joined user room: ${this.currentUserId}`);
      }
      
      if (this.currentChatId) {
        this.socket?.emit('joinChat', { chatId: this.currentChatId });
        console.log(`🔗 Rejoined chat: ${this.currentChatId}`);
      }
      
      this.socket?.emit('getOnlineUsers');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat gateway:', reason);
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
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
      
      if (this.currentUserId) {
        this.socket?.emit('joinUserRoom', { userId: this.currentUserId });
        this.socket?.emit('getOnlineUsers');
      }
    });

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
        this.socket.emit('ping');
      }
    }, 30000);
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
    
    // Clear utility sockets
    this.updateUtilSockets();
  }

  // Delegated methods to utility classes
  
  // Chat methods
  async sendMessage(message: any): Promise<void> {
    return this.chatUtils.sendMessage(message, this.currentUserId);
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean) {
    this.chatUtils.sendTypingIndicator(receiverId, isTyping);
  }

  markAsRead(messageId: string, senderId: string) {
    this.chatUtils.markAsRead(messageId, senderId);
  }

  deleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
    return this.chatUtils.deleteMessage(messageId, options);
  }

  forwardMessage(messageId: string, receiverIds: string[]): Promise<void> {
    return this.chatUtils.forwardMessage(messageId, receiverIds);
  }

  replyMessage(payload: ReplyMessagePayload): Promise<void> {
    return this.chatUtils.replyMessage(payload);
  }

  toggleFavorite(messageId: string, isFavorite: boolean): Promise<void> {
    return this.chatUtils.toggleFavorite(messageId, isFavorite);
  }

  joinChannel(chatId: string) {
    const newChatId = this.chatUtils.joinChannel(chatId, this.currentChatId);
    if (newChatId) {
      this.currentChatId = newChatId;
    }
  }

  leaveChannel(chatId?: string) {
    const targetChatId = chatId || this.currentChatId;
    if (targetChatId) {
      this.chatUtils.leaveChannel(targetChatId);
      if (targetChatId === this.currentChatId) {
        this.currentChatId = null;
      }
    }
  }

  // Call methods
  callUser(data: { to: string; from: string; offer: any; type: 'video' | 'audio'; fromName?: string; callId?: string }) {
    this.callUtils.callUser(data);
  }

  acceptCall(data: { to: string; from: string; answer: any; callId?: string }) {
    this.callUtils.acceptCall(data);
  }

  rejectCall(data: { to: string; from: string; callId?: string }) {
    this.callUtils.rejectCall(data);
  }

  endCall(data: { to: string; from: string; callId?: string }) {
    this.callUtils.endCall(data);
  }

  onIncomingCall(callback: (data: any) => void) {
    this.callUtils.onIncomingCall(callback);
  }

  onCallAccepted(callback: (data: any) => void) {
    this.callUtils.onCallAccepted(callback);
  }

  onCallRejected(callback: (data: any) => void) {
    this.callUtils.onCallRejected(callback);
  }

  onCallEnded(callback: (data: any) => void) {
    this.callUtils.onCallEnded(callback);
  }

  sendIceCandidate(data: { to: string; candidate: RTCIceCandidate; callId?: string }) {
    this.callUtils.sendIceCandidate(data);
  }

  onIceCandidate(callback: (data: any) => void) {
    this.callUtils.onIceCandidate(callback);
  }

  // Status methods
  requestUserStatus(userId: string) {
    this.statusUtils.requestUserStatus(userId);
  }

  getCurrentUserStatus(): { isOnline: boolean; userId: string | null } {
    return this.statusUtils.getCurrentUserStatus(this.currentUserId);
  }

  requestOnlineUsers() {
    this.statusUtils.requestOnlineUsers(this.currentUserId);
  }

  addStatusListener(userId: string, callback: (status: UserStatusData) => void) {
    this.statusUtils.addStatusListener(userId, callback);
  }

  removeStatusListener(userId: string) {
    this.statusUtils.removeStatusListener(userId);
  }

  setUserStatus(status: 'online' | 'offline' | 'away' | 'busy', customMessage?: string) {
    this.statusUtils.setUserStatus(status, customMessage);
  }

  broadcastActivity(activity: {
    type: 'typing' | 'last_seen' | 'in_chat';
    chatId?: string;
    data?: any;
  }) {
    this.statusUtils.broadcastActivity(activity);
  }

  // Socket utility methods
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

  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      socketId: this.socket?.id,
      currentUserId: this.currentUserId,
      currentChatId: this.currentChatId,
      reconnectionAttempts: this.reconnectionAttempts,
      chatUtils: this.chatUtils.constructor.name,
      callUtils: this.callUtils.constructor.name,
      statusUtils: this.statusUtils.constructor.name,
    };
  }

  // Event management
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


   logCopyAction(messageId: string): Promise<void> {
    return this.chatUtils.logCopyAction(messageId);
  }

  getFavoriteMessages(): Promise<any[]> {
    return this.chatUtils.getFavoriteMessages();
  }

  // Cleanup method for utilities
  cleanup() {
    this.callUtils.removeAllCallListeners();
    this.statusUtils.clearAllStatusListeners();
    this.removeAllEventListeners();
  }
}

export const socketService = new SocketService();