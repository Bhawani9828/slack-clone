// lib/store/slices/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getApi } from '@/axios/apiService';
import API_ENDPOINTS from '@/axios/apiEndpoints';
import { formatLastSeen } from '@/lib/utils';

const DEFAULT_AVATAR = 'https://randomuser.me/api/portraits/men/75.jpg';

// Define interfaces with all required properties
interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  channelId: string;
  createdAt: string;
  isRead: boolean;
  isDelivered: boolean;
  updatedAt: string;
  __v: number;
}

interface ChatUser {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  profilePicture?: string;
  avatar: string;
  isOnline: boolean;
  isTyping: boolean;
  callType?: "voice" | "video" | "missed";
  status?: string;
}

interface UserProfile {
  _id: string;
  mobileNumber: string;
  name: string;
  isVerified: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  profilePicture?: string;
  profilePicturePublicId?: string;
  status?: string;
  isOnline?: boolean;
}

interface UserState {
  currentUser: UserProfile | null;
  chatusers: ChatUser[];
  isLoadingUsers: boolean;
  error: string | null;
}

interface LastMessageResponse {
  lastMessage: Message;
  unreadCount: number;
  userId?: string;
  
}

const initialState: UserState = {
  currentUser: null,
  chatusers: [],
  isLoadingUsers: false,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getApi<{ data: UserProfile }>(API_ENDPOINTS.USER_PROFILE);
      console.log('API user response:', data); // Debug log
      if (!data) {
        throw new Error('No user data received');
      }
      const { isOnline } = formatLastSeen(data.lastSeen);
      return { ...data, isOnline };
    } catch (error: any) {
      console.error('Error fetching current user:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchChatUsers = createAsyncThunk(
  'user/fetchChatUsers',
  async (searchQuery: string = "", { rejectWithValue }) => {
    try {
      const endpoint = searchQuery.trim() 
        ? API_ENDPOINTS.USER_SEARCH(searchQuery.trim()) 
        : API_ENDPOINTS.TOP_TEN_USER;
      
      const [usersResponse, messagesResponse] = await Promise.all([
        getApi<UserProfile[]>(endpoint),
        getApi<LastMessageResponse[]>(API_ENDPOINTS.LAST_MESSAGES)
      ]);

      if (usersResponse && Array.isArray(usersResponse)) {
        return usersResponse.map((user) => {
          const { time, isOnline } = formatLastSeen(user.lastSeen);
          
          
          // Find messages for this user with proper typing
          const userMessages = messagesResponse.filter((msg) => 
            msg.lastMessage?.receiverId === user._id || 
            msg.lastMessage?.senderId === user._id
          );
          
          // Get most recent message
          const lastMsg = userMessages[0]?.lastMessage;
          
          return {
            id: user._id,
            name: user.name,
            lastMessage: lastMsg?.content || "",
            time: lastMsg?.createdAt ? 
              new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
              time,
            unreadCount: lastMsg?.isRead === false ? 1 : 0,
            profilePicture: user.profilePicture,
            avatar: user.profilePicture || DEFAULT_AVATAR,
            isOnline,
            isTyping: false,
            status: user.status
          };
        });
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching chat users:', error);
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateUserOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      if (state.currentUser && state.currentUser._id === action.payload.userId) {
        state.currentUser.isOnline = action.payload.isOnline;
      }
    },
// lib/store/slices/userSlice.ts - Updated reducer

updateChatUserLastMessage: (state, action: PayloadAction<{
  chatId: string;
  lastMessage: string;
  time: string;
  markRead?: boolean;
  timestamp?: string | number;
  senderId?: string; // Add senderId parameter
}>) => {
  const { chatId, lastMessage, time, markRead, senderId } = action.payload;
  const index = state.chatusers.findIndex(chat => chat.id === chatId);
  
  if (index >= 0) {
    let formattedMessage = lastMessage;
    
    // FIXED: Format message based on sender - but only if not already formatted
    if (senderId && state.currentUser && !lastMessage.startsWith('You: ')) {
      if (senderId === state.currentUser._id) {
        // Message sent by current user - show "You: message"
        formattedMessage = `You: ${lastMessage}`;
      } else {
        // Message received from other user - show just the message content
        formattedMessage = lastMessage;
      }
    }
    
    state.chatusers[index] = {
      ...state.chatusers[index],
      lastMessage: formattedMessage,
      time: time,
      ...(markRead !== undefined && { 
        unreadCount: markRead ? 0 : (state.chatusers[index].unreadCount || 0) + (senderId !== state.currentUser?._id ? 1 : 0)
      })
    };
    
    // Sort chatusers by timestamp to keep latest messages on top
    state.chatusers.sort((a, b) => {
      const timeA = new Date(a.time || 0).getTime();
      const timeB = new Date(b.time || 0).getTime();
      return timeB - timeA;
    });
  }
},
    updateChatUserTypingStatus: (state, action: PayloadAction<{ userId: string; isTyping: boolean }>) => {
      const index = state.chatusers.findIndex(chat => chat.id === action.payload.userId);
      if (index >= 0) {
        state.chatusers[index].isTyping = action.payload.isTyping;
      }
    },
    updateChatUserOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      const index = state.chatusers.findIndex(chat => chat.id === action.payload.userId);
      if (index >= 0) {
        state.chatusers[index].isOnline = action.payload.isOnline;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(fetchChatUsers.pending, (state) => {
        state.isLoadingUsers = true;
        state.error = null;
      })
      .addCase(fetchChatUsers.fulfilled, (state, action) => {
        state.isLoadingUsers = false;
        state.chatusers = action.payload;
      })
      .addCase(fetchChatUsers.rejected, (state, action) => {
        state.isLoadingUsers = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateUserOnlineStatus,
  updateChatUserLastMessage,
  updateChatUserTypingStatus,
  updateChatUserOnlineStatus,
} = userSlice.actions;

export default userSlice.reducer;