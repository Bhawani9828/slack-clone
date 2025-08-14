// lib/store/optimizedChatSlice.ts
import { ChatUser, Message, UserProfile } from '@/types/chatTypes';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';







interface ChatState {
  // Core data
  messages: Message[];
  chatUsers: ChatUser[];
  currentUser: UserProfile | null;
  selectedUser: ChatUser | null;
  typingStatus: Record<string, boolean>;
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Online status
  onlineUsers: string[];
  
  // Typing indicators
  typingUsers: Record<string, boolean>; // userId -> isTyping
  
  // Unread counts
  unreadCounts: Record<string, number>; // userId -> count
  
  // Current chat context
  currentChat: {
    channelId: string | null;
    receiverId: string | null;
    contact: ChatUser | null;
  };
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  chatUsers: [],
  currentUser: null,
  selectedUser: null,
  isConnected: false,
  connectionError: null,
  onlineUsers: [],
  typingUsers: {},
  unreadCounts: {},
  currentChat: {
    channelId: null,
    receiverId: null,
    contact: null,
  },
  isLoading: false,
  error: null,
  typingStatus: {},
  
};

export const optimizedChatSlice = createSlice({
  name: 'optimizedChat',
  initialState,
  reducers: {


    // Connection management
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      
      if (!action.payload) {
        // Reset dependent state when disconnected
        state.onlineUsers = [];
        state.typingUsers = {};
        state.connectionError = null;
      }
    },

    setConnectionError: (state, action: PayloadAction<string | null>) => {
      state.connectionError = action.payload;
    },

    // User management
    setCurrentUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.currentUser = action.payload;
    },

    setChatUsers: (state, action: PayloadAction<ChatUser[]>) => {
      state.chatUsers = action.payload.map(user => ({
        ...user,
        isOnline: state.onlineUsers.includes(user._id || user.id || ''),
      }));
    },

    setSelectedUser: (state, action: PayloadAction<ChatUser | null>) => {
      state.selectedUser = action.payload;
      
      // Clear unread count for selected user
      if (action.payload) {
        const userId = action.payload._id || action.payload.id || '';
        state.unreadCounts[userId] = 0;
      }
    },

    // Message management
    setMessages: (state, action: PayloadAction<Message[]>) => {
      // Sort messages by timestamp to ensure correct order
      state.messages = action.payload.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      // Prevent duplicates - check by _id or content+timestamp
      const isDuplicate = state.messages.some(existingMsg => 
        existingMsg._id === message._id ||
        (
          existingMsg.content === message.content &&
          existingMsg.senderId === message.senderId &&
          existingMsg.receiverId === message.receiverId &&
          Math.abs(new Date(existingMsg.createdAt).getTime() - new Date(message.createdAt).getTime()) < 1000
        )
      );

      if (!isDuplicate) {
        // Insert message in correct chronological position
        const insertIndex = state.messages.findIndex(msg => 
          new Date(msg.createdAt).getTime() > new Date(message.createdAt).getTime()
        );
        
        if (insertIndex === -1) {
          state.messages.push(message);
        } else {
          state.messages.splice(insertIndex, 0, message);
        }
      }
    },

    removeMessage: (
  state,
  action: PayloadAction<{ messageId: string }>
) => {
  state.messages = state.messages.filter(
    msg => msg._id !== action.payload.messageId
  );
},

    updateMessageStatus: (state, action: PayloadAction<{
      messageId: string;
      status: 'delivered' | 'read' | "error";
    }>) => {
      const { messageId, status } = action.payload;
      const message = state.messages.find(msg => msg._id === messageId);
      
      if (message) {
        if (status === 'delivered') {
          message.isDelivered = true;
        } else if (status === 'read') {
          message.isRead = true;
          message.isDelivered = true; // Read implies delivered
        }
      }
    },

    clearMessages: (state) => {
      state.messages = [];
    },

    // Online status management
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = [...new Set(action.payload.filter(Boolean))];
      
      // Update chat users online status
      state.chatUsers = state.chatUsers.map(user => ({
        ...user,
        isOnline: state.onlineUsers.includes(user._id || user.id || ''),
      }));
    },

    userOnline: (state, action: PayloadAction<string | string[]>) => {
      const userIds = Array.isArray(action.payload) ? action.payload : [action.payload];
      
      userIds.forEach(userId => {
        if (userId && !state.onlineUsers.includes(userId)) {
          state.onlineUsers.push(userId);
        }
      });

      // Update specific chat users
      state.chatUsers = state.chatUsers.map(user => ({
        ...user,
        isOnline: state.onlineUsers.includes(user._id || user.id || ''),
      }));
    },

    userOffline: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      
      if (userId) {
        state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
        
        // Update chat users
        state.chatUsers = state.chatUsers.map(user => ({
          ...user,
          isOnline: user._id === userId || user.id === userId ? false : user.isOnline,
        }));
      }
    },

    // Typing indicators
    setTypingStatus: (state, action: PayloadAction<{
      userId: string;
      isTyping: boolean;
    }>) => {
      const { userId, isTyping } = action.payload;
      
      if (isTyping) {
        state.typingUsers[userId] = true;
      } else {
        delete state.typingUsers[userId];
      }
    },

    clearTypingStatus: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      if (userId && state.typingUsers[userId]) {
        delete state.typingUsers[userId];
      }
    },

    clearAllTyping: (state) => {
      state.typingUsers = {};
    },

    // Unread counts
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      if (userId) {
        state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
      }
    },

    clearUnreadCount: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      if (userId) {
        state.unreadCounts[userId] = 0;
      }
    },

    setUnreadCount: (state, action: PayloadAction<{
      userId: string;
      count: number;
    }>) => {
      const { userId, count } = action.payload;
      state.unreadCounts[userId] = Math.max(0, count);
    },

    // Current chat context
    setCurrentChat: (state, action: PayloadAction<{
      channelId: string;
      receiverId: string;
      contact: ChatUser;
    }>) => {
      state.currentChat = action.payload;
      
      // Clear unread count for current chat
      const userId = action.payload.receiverId;
      if (userId) {
        state.unreadCounts[userId] = 0;
      }
    },

    clearCurrentChat: (state) => {
      state.currentChat = {
        channelId: null,
        receiverId: null,
        contact: null,
      };
    },

    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetChatState: (state) => {
      return {
        ...initialState,
        currentUser: state.currentUser, // Preserve current user
      };
    },

    // Bulk operations for better performance
    bulkUpdateMessages: (state, action: PayloadAction<{
      updates: Array<{
        messageId: string;
        updates: Partial<Message>;
      }>;
    }>) => {
      const { updates } = action.payload;
      
      updates.forEach(({ messageId, updates: msgUpdates }) => {
        const message = state.messages.find(msg => msg._id === messageId);
        if (message) {
          Object.assign(message, msgUpdates);
        }
      });
    },

    // Optimized message filtering for current conversation
    filterMessagesForConversation: (state, action: PayloadAction<{
      userId1: string;
      userId2: string;
    }>) => {
      const { userId1, userId2 } = action.payload;
      
      state.messages = state.messages.filter(message => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      );
    },

    // Update last message for chat list
    updateLastMessage: (state, action: PayloadAction<{
      userId: string;
      lastMessage: string;
      time: string;
      incrementUnread?: boolean;
      message: Message;
    }>) => {
      const { userId, message } = action.payload;
      
      // Find and update the chat user's last message info
      const chatUser = state.chatUsers.find(user => 
        (user._id === userId || user.id === userId)
      );
      
      if (chatUser) {
        (chatUser as any).lastMessage = message.content;
        (chatUser as any).lastMessageTime = message.createdAt;
        (chatUser as any).lastMessageType = message.type;
      }
    },

    // Sort chat users by last message time
    sortChatUsersByActivity: (state) => {
      state.chatUsers.sort((a, b) => {
        const aTime = (a as any).lastMessageTime || '1970-01-01';
        const bTime = (b as any).lastMessageTime || '1970-01-01';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    },
  },
});

// Export actions
export const {
  // Connection
  setConnected,
  setConnectionError,
  
  // Users
  setCurrentUser,
  setChatUsers,
  setSelectedUser,
  
  // Messages
  setMessages,
  addMessage,
  removeMessage,
  updateMessageStatus,
  clearMessages,
  bulkUpdateMessages,
  filterMessagesForConversation,
  updateLastMessage,
  
  // Online status
  setOnlineUsers,
  userOnline,
  userOffline,
  
  // Typing
  setTypingStatus,
  clearTypingStatus,
  clearAllTyping,
  
  // Unread counts
  incrementUnreadCount,
  clearUnreadCount,
  setUnreadCount,
  
  // Current chat
  setCurrentChat,
  clearCurrentChat,
  
  // UI state
  setLoading,
  setError,
  clearError,
  
  // Utilities
  resetChatState,
  sortChatUsersByActivity,
} = optimizedChatSlice.actions;

// Selectors for better performance
export const selectMessages = (state: { optimizedChat: ChatState }) => state.optimizedChat.messages;
export const selectChatUsers = (state: { optimizedChat: ChatState }) => state.optimizedChat.chatUsers;
export const selectCurrentUser = (state: { optimizedChat: ChatState }) => state.optimizedChat.currentUser;
export const selectSelectedUser = (state: { optimizedChat: ChatState }) => state.optimizedChat.selectedUser;
export const selectIsConnected = (state: { optimizedChat: ChatState }) => state.optimizedChat.isConnected;
export const selectOnlineUsers = (state: { optimizedChat: ChatState }) => state.optimizedChat.onlineUsers;
export const selectTypingUsers = (state: { optimizedChat: ChatState }) => state.optimizedChat.typingUsers;
export const selectUnreadCounts = (state: { optimizedChat: ChatState }) => state.optimizedChat.unreadCounts;
export const selectCurrentChat = (state: { optimizedChat: ChatState }) => state.optimizedChat.currentChat;

// Computed selectors
export const selectConversationMessages = (userId1: string, userId2: string) => 
  (state: { optimizedChat: ChatState }) =>
    state.optimizedChat.messages.filter(message =>
      (message.senderId === userId1 && message.receiverId === userId2) ||
      (message.senderId === userId2 && message.receiverId === userId1)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

export const selectUnreadCount = (userId: string) =>
  (state: { optimizedChat: ChatState }) =>
    state.optimizedChat.unreadCounts[userId] || 0;

export const selectIsUserOnline = (userId: string) =>
  (state: { optimizedChat: ChatState }) =>
    state.optimizedChat.onlineUsers.includes(userId);

export const selectIsUserTyping = (userId: string) =>
  (state: { optimizedChat: ChatState }) =>
    state.optimizedChat.typingUsers[userId] || false;

export default optimizedChatSlice.reducer;