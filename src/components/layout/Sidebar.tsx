// components/layout/Sidebar.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { Avatar, IconButton, TextField, InputAdornment } from "@mui/material";
import {
  MoreVert,
  Search,
  Chat,
  Add,
  PersonAdd,
  Phone,
  Call,
  Contacts,
  PersonSearchRounded,
  Group,
  PlusOne,
  GroupAddRounded
} from "@mui/icons-material";

import { getApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import DocumentView from "../sidebarComponets/DocumentView";
import StatusView from "../sidebarComponets/StatusView";
import ContactView from "../sidebarComponets/ContactView";
import NotificationView from "../sidebarComponets/NotificationView";
import ChatListView from "../sidebarComponets/ChatListView";
import CallListView from "../sidebarComponets/CallListView";
import ContactListView from "../sidebarComponets/ContactListView";
import SettingsView from "../sidebarComponets/SettingsView";
import StatusCarousel from "../status/StatusCarousel";
import { fetchChatUsers,fetchCurrentUser  } from '@/lib/store/slices/userSlice';
import {
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
} from '@/lib/store/slices/sidebarSlice';
import { AppDispatch } from "@/lib/store";
import CreateGroupDialog from "../group/CreateGroupDialog";
import GroupListView from "../group/GroupListView";
import { ChatGroup } from "@/types/chatTypes";

interface RootState {
  sidebar: {
    activeView: "chat" | "status" | "notifications" | "documents" | "contacts" | "settings";
    chatAreaActiveTab: "chat" | "call" | "contact";
    searchQuery: string;
    activeCallFilter: "all" | "incoming" | "outgoing" | "missed";
    isLeftNavOpen: boolean;
    selectedUser: any;
    selectedGroup: any;
    chatType: "direct" | "group" | null;
    showStatusView: boolean;
    statusUserId: string | null;
  };
  user: {
    currentUser: any;
    chatusers: any[];
    isLoadingUsers: boolean;
    error: string | null;
  };
}

export default function Sidebar({
  onContactSelect,
  onGroupSelect,
  isDark,
  initialSelectedUserId
}: {
  onContactSelect?: (contactId: string) => void;
   onGroupSelect?: (group: ChatGroup) => void;
  isDark: boolean;
  initialSelectedUserId: string | null;
}) {
  const dispatch = useDispatch<AppDispatch>();
    // const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
 
  const {
    activeView,
    chatAreaActiveTab,
    searchQuery,
    activeCallFilter,
    isLeftNavOpen,
    selectedUser,
    selectedGroup,
    chatType,
    showStatusView,
    statusUserId
  } = useSelector((state: RootState) => state.sidebar);

  const { chatusers, isLoadingUsers,  currentUser } = useSelector((state: RootState) => state.user);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const initialSelectionMade = useRef(false);

  useEffect(() => {
    dispatch(fetchChatUsers(searchQuery));
  }, [searchQuery, dispatch]);

  useEffect(() => {
    if (initialSelectedUserId && chatusers.length > 0 && !initialSelectionMade.current) {
      const userToSelect = chatusers.find((user) => user.id === initialSelectedUserId);
      if (userToSelect) {
        dispatch(setSelectedUser(userToSelect));
        onContactSelect?.(userToSelect.id);
        initialSelectionMade.current = true;
      }
    }
  }, [chatusers, initialSelectedUserId, dispatch, onContactSelect]);

  useEffect(() => {
  // Fetch current user first
  dispatch(fetchCurrentUser())
    .then(() => {
      // Then fetch chat users
      return dispatch(fetchChatUsers(searchQuery));
    })
    .catch(error => {
      console.error('Initialization error:', error);
    });
}, [searchQuery, dispatch]);

  const handleContactSelect = (id: string) => {
    const user = chatusers.find((u) => u.id === id);
    if (user) {
      dispatch(setSelectedUser(user));
      onContactSelect?.(id);
    }
  };

const handleGroupClick = (group: ChatGroup) => {
 onGroupSelect?.(group);
};

  const handleCreateGroup = async (groupData: {
    name: string;
    description?: string;
    participants: string[];
    groupImage?: string;
  }) => {
    try {
      console.log('Creating group:', groupData);
      // TODO: Implement API call to create group
      // const response = await postApi(API_ENDPOINTS.CREATE_GROUP, groupData);
      // console.log('Group created:', response);
      
      // For now, just log the data
      alert(`Group "${groupData.name}" created with ${groupData.participants.length} participants!`);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleBackToChat = () => {
    dispatch(backToChat());
  };

  // Styling variables
  const bgColor = isDark ? "bg-[#020d0b]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const currentUserId = currentUser?._id || '';
  
  // Conditional rendering based on Redux state
  if (activeView === "documents") {
    return <DocumentView isDark={isDark} onBackToChat={handleBackToChat} />
  }

  if (showStatusView) {
    return (
      <StatusView 
        isDark={isDark}
        onBackToChat={() => dispatch(setShowStatusView(false))} 
        currentUserId={currentUserId}
        statusUserId={statusUserId}
      />
    );
  }

  if (activeView === "contacts") {
    return <ContactView isDark={isDark} onBackToChat={handleBackToChat} onContactSelect={onContactSelect} />
  }

  if (activeView === "notifications") {
    return <NotificationView isDark={isDark} onBackToChat={handleBackToChat} />
  }

  if (activeView === "settings") {
    return <SettingsView isDark={isDark} onBackToChat={handleBackToChat} />
  }

  // Default Chat View
  return (
    <div className={`h-screen w-100 ${bgColor} border-r ${borderColor} flex flex-col`}>
      {/* Header */}
      <div className={` px-4 py-3 border-b ${borderColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar 
              src={currentUser?.profilePicture || `https://ui-avatars.com/api/?name=${currentUser?.name || 'User'}&background=01aa85&color=fff`} 
              className="!w-14 !h-14"
            />
            <div>
              <h3 className={`font-medium ${textColor}`}>
                {currentUser?.name || 'Loading...'}
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {currentUser?.status || (currentUser?.isVerified ? 'Verified' : 'Not Verified')}
              </p>
            </div>
          </div>
          <IconButton
            className={`${isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-200"}`}
            onClick={() => dispatch(setIsLeftNavOpen(!isLeftNavOpen))}
          >
            <MoreVert />
          </IconButton>
        </div>
        
        {/* Status Section */}
        <div className="mb-4">
          <StatusCarousel 
            onViewAll={() => {
              dispatch(setStatusUserId(null));
              dispatch(setShowStatusView(true));
            }}
            onStatusClick={(userId) => {
              dispatch(setStatusUserId(userId));
              dispatch(setShowStatusView(true));
            }}
            currentUserId={currentUserId}
          />
        </div>
      </div>
        
      {/* Tab Navigation */}
      <div className={`px-4 py-2 ${bgColor} border-b ${borderColor}`}>
       <div className="flex items-center justify-between mb-3">
  <h4 className={`font-medium ${textColor}`}>
    Message ({chatusers.length})
  </h4>
  <div className="flex items-center space-x-2">
   

    {/* Add Group Button */}
    <IconButton
      size="small"
      onClick={() => setShowCreateGroupDialog(true)}
      type="button"
      className={`${
        isDark ? "text-gray-300 !bg-[#043429]" : "text-gray-600 !bg-gray-200"
      }`}
    >
      <GroupAddRounded
        className={`${isDark ? "!text-white" : "!text-black"}`}
      />
    </IconButton>
  </div>
</div>
        
        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => dispatch(setChatAreaActiveTab("chat"))}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              chatAreaActiveTab === "chat"
                ? "bg-[#01aa85] green_shadow text-white"
                : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
            }`}
          >
            <Chat className="!w-4 !h-4 mr-1 inline" />
            Chat
          </button>
          <button
            onClick={() => dispatch(setChatAreaActiveTab("call"))}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              chatAreaActiveTab === "call"
                ? "bg-[#01aa85] green_shadow text-white"
                : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
            }`}
            style={
              chatAreaActiveTab === "call"
                ? { boxShadow: "-1px 10px 16px -10px #01aa85" }
                : {}
            }
          >
            <Call className="!w-4 !h-4 mr-1 inline" />
            Call
          </button>
          <button
            onClick={() => dispatch(setChatAreaActiveTab("contact"))}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              chatAreaActiveTab === "contact"
                ? "bg-[#01aa85] green_shadow text-white"
                : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
            }`}
          >
            <Contacts className="!w-4 !h-4 mr-1 inline" />
            Contact
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => dispatch(setChatType("direct"))}
            className={`px-4 py-2 w-full rounded-lg text-sm font-medium transition-colors ${
              chatType === 'direct'
                ? "bg-[#01aa85] text-white"
                : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => dispatch(setChatType("group"))}
            className={`px-4 py-2 rounded-lg w-full text-sm font-medium transition-colors ${
              chatType === 'group'
                ? "bg-[#01aa85] text-white"
                : `${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`
            }`}
          >
            <Group className="!w-4 !h-4 mr-1 inline" />
            Group
          </button>
           
 
        </div>
      </div>
      
      {/* Search */}
      <div className={`px-4 py-3 border-b ${borderColor}`}>
        <TextField
        
          fullWidth
          size="small"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          InputProps={{
            spellCheck: false,
            startAdornment: (
              <InputAdornment position="start">
                <Search className={`${isDark ? "text-gray-400" : "text-gray-400"}`} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              backgroundColor: isDark ? "#374151" : "#f5f5f5",
              color: isDark ? "white" : "black",
              "& fieldset": {
                borderColor: "transparent",
              },
              "&:hover fieldset": {
                borderColor: "#01aa85",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#01aa85",
              },
            },
          }}
        />
      </div>
      
      {/* Chat List / Call List / Contact List */}
      <div className="flex-1 overflow-y-auto">
             {chatAreaActiveTab === "chat" && (
          <>
            {chatType === 'direct' ? (
              <ChatListView
                searchQuery={searchQuery}
                isDark={isDark}
                isLoading={isLoadingUsers}
                onContactClick={handleContactSelect}
              />
            ) : (
            <GroupListView
  searchQuery={searchQuery}
  isDark={isDark}
   onGroupClick={(groupInfo) =>
    handleGroupClick({
      ...groupInfo,
      members: [], // add empty members
    })
  }
  currentUserId={currentUser?._id} // from Redux user slice
  selectedGroupId={selectedGroup?._id || null} // from Redux sidebar slice
/>
            )}
          </>
        )}

        {chatAreaActiveTab === "call" && (
          <CallListView
            activeCallFilter={activeCallFilter}
            setActiveCallFilter={(filter) => dispatch(setActiveCallFilter(filter))}
            isDark={isDark}
            
          />
        )}

        {chatAreaActiveTab === "contact" && (
          <ContactListView
            isDark={isDark}
            onContactClick={handleContactSelect}
          />
        )}
      </div>
      
      {/* Floating Add Button */}
      {/* <div className="absolute bottom-20 right-6">
        <IconButton
          className="bg-[#01aa85] !text-white hover:bg-[#20b858] shadow-lg"
          sx={{
            width: 56,
            height: 56,
            backgroundColor: "#01aa85",
           
          }}
        >
          {chatAreaActiveTab === "chat" && <Add />}
          {chatAreaActiveTab === "call" && <Phone />}
          {chatAreaActiveTab === "contact" && <PersonAdd />}
        </IconButton>
      </div> */}

          {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onClose={() => setShowCreateGroupDialog(false)}
        onCreateGroup={handleCreateGroup}
        isDark={isDark}
      />
    </div>
  )
}