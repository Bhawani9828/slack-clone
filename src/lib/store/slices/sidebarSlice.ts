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

interface ChatGroup {
  id: string;
  name: string;
  members: ChatUser[];
  avatar?: string;
}

interface SidebarState {
  activeView: "chat" | "status" | "notifications" | "documents" | "contacts" | "settings";
  chatAreaActiveTab: "chat" | "call" | "contact";
  searchQuery: string;
  activeCallFilter: "all" | "incoming" | "outgoing" | "missed";
  isLeftNavOpen: boolean;
  selectedUser: ChatUser | null;
  selectedGroup: ChatGroup | null;   
  chatType: "direct" | "group" | null; 
  showStatusView: boolean;
  statusUserId: string | null;
}

const initialState: SidebarState = {
  activeView: "chat",
  chatAreaActiveTab: "chat",
  searchQuery: "",
  activeCallFilter: "all",
  isLeftNavOpen: true,
  selectedUser: null,
  selectedGroup: null,   // ✅
  chatType: "direct",      // ✅
  showStatusView: false,
  statusUserId: null,
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
     setChatType: (state, action: PayloadAction<"direct" | "group">) => {
      state.chatType = action.payload;
    },
    setActiveView: (state, action: PayloadAction<SidebarState["activeView"]>) => {
      state.activeView = action.payload;
    },
    setChatAreaActiveTab: (state, action: PayloadAction<SidebarState["chatAreaActiveTab"]>) => {
      state.chatAreaActiveTab = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setActiveCallFilter: (state, action: PayloadAction<SidebarState["activeCallFilter"]>) => {
      state.activeCallFilter = action.payload;
    },
    setIsLeftNavOpen: (state, action: PayloadAction<boolean>) => {
      state.isLeftNavOpen = action.payload;
    },
    setSelectedUser: (state, action: PayloadAction<ChatUser | null>) => {
      state.selectedUser = action.payload;
      state.chatType = action.payload ? "direct" : null; // ✅ जब user चुना direct chat
      state.selectedGroup = null; // clear group
    },
    setSelectedGroup: (state, action: PayloadAction<ChatGroup | null>) => {
      state.selectedGroup = action.payload;
      state.chatType = action.payload ? "group" : null; // ✅ जब group चुना group chat
      state.selectedUser = null; // clear user
    },
    setShowStatusView: (state, action: PayloadAction<boolean>) => {
      state.showStatusView = action.payload;
    },
    setStatusUserId: (state, action: PayloadAction<string | null>) => {
      state.statusUserId = action.payload;
    },
    backToChat: (state) => {
      state.activeView = "chat";
      state.showStatusView = false;
      state.statusUserId = null;
      state.selectedUser = null;
      state.selectedGroup = null;
      state.chatType = null;
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
  setSelectedGroup,  
  setShowStatusView,
  setChatType,
  setStatusUserId,
  backToChat
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
