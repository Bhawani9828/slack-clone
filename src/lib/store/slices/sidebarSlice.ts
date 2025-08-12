import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatUser {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  avatar: string;
  isOnline?: boolean;
  isTyping?: boolean;
  callType?: "voice" | "video" | "missed";
  profilePicture?: string;
  status?: string;
}

interface SidebarState {
  activeView: "chat" | "status" | "notifications" | "documents" | "contacts" | "settings";
  chatAreaActiveTab: "chat" | "call" | "contact";
  searchQuery: string;
  activeCallFilter: "all" | "incoming" | "outgoing" | "missed";
  isLeftNavOpen: boolean;
  selectedUser: ChatUser | null;
  showStatusView: boolean;
  statusUserId: string | null;
}

const initialState: SidebarState = {
  activeView: "chat",
  chatAreaActiveTab: "chat",
  searchQuery: "",
  activeCallFilter: "all",
  isLeftNavOpen: true, // Default to open as per original code's behavior
  selectedUser: null,
  showStatusView: false,
  statusUserId: null,
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    setActiveView: (state, action: PayloadAction<"chat" | "status" | "notifications" | "documents" | "contacts" | "settings">) => {
      state.activeView = action.payload;
    },
    setChatAreaActiveTab: (state, action: PayloadAction<"chat" | "call" | "contact">) => {
      state.chatAreaActiveTab = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setActiveCallFilter: (state, action: PayloadAction<"all" | "incoming" | "outgoing" | "missed">) => {
      state.activeCallFilter = action.payload;
    },
    setIsLeftNavOpen: (state, action: PayloadAction<boolean>) => {
      state.isLeftNavOpen = action.payload;
    },
    setSelectedUser: (state, action: PayloadAction<ChatUser | null>) => {
      state.selectedUser = action.payload;
    },
    setShowStatusView: (state, action: PayloadAction<boolean>) => {
      state.showStatusView = action.payload;
    },
    setStatusUserId: (state, action: PayloadAction<string | null>) => {
      state.statusUserId = action.payload;
    },
    // Action to reset sidebar view to chat
    backToChat: (state) => {
      state.activeView = "chat";
      state.showStatusView = false;
      state.statusUserId = null;
    }
  },
});

export const {
  setActiveView,
  setChatAreaActiveTab,
  setSearchQuery,
  setActiveCallFilter,
  setIsLeftNavOpen,
  setSelectedUser,
  setShowStatusView,
  setStatusUserId,
  backToChat
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
