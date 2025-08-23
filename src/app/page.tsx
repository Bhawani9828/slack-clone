"use client";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import ChatArea from "@/components/chat/ChatArea";
import Sidebar from "@/components/layout/Sidebar";
import VideoCallModal from "@/components/modals/VideoCallModal";
import CallModal from "@/components/modals/CallModal";
import DetailedContactInfo from "@/components/chat/DetailedContactInfo";
import { socketService } from "@/lib/socket";
import { useGroupChat } from "@/hooks/useGroupChat"; // Add this import
import type { RootState } from '@/lib/store/index';
import {
  setActiveView,
  setChatAreaActiveTab,
  setIsLeftNavOpen,
  setSelectedUser,
  setSelectedGroup,
  setShowStatusView,
  setStatusUserId,
  setChatType,
  backToChat
} from '@/lib/store/slices/sidebarSlice';
import LeftNavigation from "@/components/layout/LeftNavigation";
import { ChatGroup } from "@/types/chatTypes";

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
  profilePicturePublicId?: string;
  status?: string;
}

export default function HomePage() {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const {
    activeView: sidebarView,
    chatAreaActiveTab,
    isLeftNavOpen,
    selectedUser,
    selectedGroup,
    chatType,       
  } = useSelector((state: RootState) => state.sidebar);

  // Local state for non-Redux managed state
  const [isDark, setIsDark] = useState(false);
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [initialSelectedUserId, setInitialSelectedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
 const chatusers = useSelector((state: RootState) => state.user.chatusers);

 // Call-related state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  // Get current group ID for the hook
  const currentGroupId = selectedGroup?.id || "";

  // ✅ Initialize group chat hook
  const {
    // State
    messages: groupMessages,
    groupInfo,
    groups,
    typingUsers,
    onlineUsers,
    isConnected: isGroupConnected,
    connectionError: groupConnectionError,
    isLoadingMessages,
    hasMoreMessages,
    
    // Functions
    sendGroupMessage,
    loadMoreMessages,
    deleteMessage,
    markMessagesAsRead,
    startTyping: startGroupTyping,
    stopTyping: stopGroupTyping,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    addParticipants,
    removeParticipant,
    changeAdminStatus,
    
    // Computed values
    isCurrentUserAdmin,
    canManageGroup,
    participantCount,
    unreadCount,
    hasUnreadMessages,
  } = useGroupChat(currentGroupId, currentUserId);

    // Initialize call socket hook
  // Call handling is owned by ChatHeader via useCallSocket

  

  useEffect(() => {
    const userId = localStorage.getItem("currentUserId") || "665a3e2855e5679c37d44c12";
    const userName = localStorage.getItem("currentUserName") || "Current User";
    setCurrentUserId(userId);
    setCurrentUserName(userName);

    const lastUserId = localStorage.getItem("lastSelectedUserId");
    if (lastUserId) {
      setInitialSelectedUserId(lastUserId);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      setIsDark(saved === "dark");
    } else if (typeof window !== "undefined" && window.matchMedia) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      localStorage.setItem("theme", prefersDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
        if (next) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch {}
      return next;
    });
  };

  // ✅ Add debug useEffect to track state changes
  useEffect(() => {
    console.log("HomePage State Changes:", {
      chatType,
      selectedUser: selectedUser?.name || 'none',
      selectedGroup: selectedGroup?.name || 'none',
      chatAreaActiveTab,
      groupMessages: groupMessages?.length || 0,
      isGroupConnected,
    });
  }, [chatType, selectedUser, selectedGroup, chatAreaActiveTab, groupMessages, isGroupConnected]);

   // Auto-open the most recent/last-opened group when switching to group tab
  useEffect(() => {
    if (chatType !== "group" || selectedGroup) return;

    // Try last opened group first
    const lastId = localStorage.getItem("lastSelectedGroupId");
    let target = lastId
      ? groups.find((g: any) => g?._id === lastId || g?.id === lastId)
      : undefined;

    // Otherwise, pick the most recently active group
    if (!target && groups && groups.length > 0) {
      const sorted = [...groups].sort((a: any, b: any) => {
        const ta = new Date(a?.lastMessage?.createdAt || a?.updatedAt || a?.createdAt || 0).getTime();
        const tb = new Date(b?.lastMessage?.createdAt || b?.updatedAt || b?.createdAt || 0).getTime();
        return tb - ta;
      });
      target = sorted[0];
    }

     if (target) {
      const chatGroup: ChatGroup = {
        id: (target as any)._id || (target as any).id,
        _id: (target as any)._id || (target as any).id,
        name: (target as any).name,
        description: (target as any).description,
        avatar: (target as any).groupImage || (target as any).avatar,
        members: (target as any).participants || (target as any).members || [],
      };
      handleGroupSelect(chatGroup);
    }
  }, [chatType, groups, selectedGroup]);


 // Auto-open the most recent/last-opened direct chat when switching to direct tab
  useEffect(() => {
    if (chatType !== "direct" || selectedUser) return;

    const lastUserId = localStorage.getItem("lastSelectedUserId");

    let userToOpen = lastUserId
      ? chatusers.find((u: any) => u?.id === lastUserId)
      : undefined;

    if (!userToOpen && Array.isArray(chatusers) && chatusers.length > 0) {
      const sorted = [...chatusers].sort((a: any, b: any) => {
        const ta = new Date(a?.time || 0).getTime();
        const tb = new Date(b?.time || 0).getTime();
        return tb - ta;
      });
      userToOpen = sorted[0];
    }

    if (userToOpen) {
      dispatch(setSelectedUser(userToOpen as any));
      dispatch(setActiveView("chat"));
      dispatch(setChatAreaActiveTab("chat"));
      localStorage.setItem("lastSelectedUserId", userToOpen.id);
    }
  }, [chatType, selectedUser, chatusers, dispatch]);

  const generateChannelId = (user1Id: string, user2Id: string) => {
    const sortedIds = [user1Id, user2Id].sort();
    return `channel_${sortedIds[0]}_${sortedIds[1]}`;
  };

  const handleContactSelect = (contactId: string) => {
    dispatch(setActiveView("chat"));
    dispatch(setChatAreaActiveTab("chat"));
    localStorage.setItem("lastSelectedUserId", contactId);
  };

  // ✅ Enhanced group select handler with group chat initialization
const handleGroupSelect = (group: ChatGroup) => {
  // Don't generate temp IDs! Use the actual group ID from database
  if (!group.id && !group._id) {
    console.error("❌ Group has no valid ID:", group);
    alert("Invalid group selected. Please try again.");
    return;
  }

  const groupId = (group.id || group._id)!;
  
  // Validate it's a proper ObjectId format
  if (!isValidObjectId(groupId)) {
    console.error("❌ Invalid group ID format:", groupId);
    alert("Invalid group ID format. Please contact support.");
    return;
  }

  console.log("✅ Selecting group with valid ID:", groupId);
  
  dispatch(
  setSelectedGroup({
    ...group,
    id: groupId,
    members: group.members ?? [], 
  })
);
  dispatch(setChatType("group"));
  localStorage.setItem("lastSelectedGroupId", groupId);
};

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};



  // ✅ Group message handlers
 const handleSendGroupMessage = async (msg: { content: string; type?: "text" | "image" | "video" | "file"; fileUrl?: string; fileName?: string; fileSize?: string; replyTo?: string }) => {
    
   if (!selectedGroup?.id || !msg.content.trim()) return;

    try {
      await sendGroupMessage({
         content: msg.content.trim(),
        type: msg.type || "text",
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        replyTo: msg.replyTo,
      });
    } catch (error) {
      console.error("Failed to send group message:", error);
    }
  };

  const handleGroupTyping = () => {
    if (selectedGroup?.id) {
      startGroupTyping();
    }
  };

  const handleGroupStopTyping = () => {
    if (selectedGroup?.id) {
      stopGroupTyping();
    }
  };

  const handleDeleteGroupMessage = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (success) {
        console.log("Message deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleLoadMoreGroupMessages = async () => {
    if (hasMoreMessages && !isLoadingMessages) {
      await loadMoreMessages();
    }
  };

  // ✅ Group management handlers
  const handleCreateGroup = async (groupData: { name: string; description?: string; participants: string[] }) => {
    try {
      const success = await createGroup(groupData);
      if (success) {
        console.log("Group created successfully");
      }
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

 const handleLeaveGroup = async (): Promise<boolean> => {
  if (selectedGroup?.id) {
    try {
      const success = await leaveGroup();
      if (success) {
        dispatch(setSelectedGroup(null));
        dispatch(setChatType("direct"));
      }
      return success; // ✅ return boolean
    } catch (error) {
      console.error("Failed to leave group:", error);
      return false;   // ✅ always return a boolean
    }
  }
  return false; // ✅ fallback
};

  const handleNavClick = (section: string, userId?: string) => {
    switch (section) {
      case "chat":
        dispatch(setActiveView("chat"));
        dispatch(setChatAreaActiveTab("chat"));
        break;
      case "status":
        dispatch(setActiveView("status"));
        if (userId) {
          dispatch(setStatusUserId(userId));
        }
        break;
      case "notifications":
        dispatch(setActiveView("notifications"));
        break;
      case "archive":
        dispatch(setActiveView("documents"));
        break;
      case "starred":
        dispatch(setActiveView("contacts"));
        break;
      case "settings":
        dispatch(setActiveView("settings"));
        break;
      case "theme":
        setIsDark(!isDark);
        break;
      case "logout":
        console.log("Logout clicked");
        break;
    }
  };

  const handleVideoCall = () => {
    setVideoCallModalOpen(true);
  };

  const handleVoiceCall = () => {
    console.log("Starting voice call...");
  };

  const handleBackToChat = () => {
    dispatch(backToChat());
  };

  const bgColor = isDark ? "bg-gray-900" : "bg-gray-100";
  const receiverId = selectedUser?.id || "";
  
  const channelId =
    currentUserId && receiverId ? generateChannelId(currentUserId, receiverId) : "";
    
  useEffect(() => {
    if (channelId && currentUserId) {
      console.log("Joining channel:", channelId);
      const socket = socketService.getSocket();
      socket?.emit('joinChannel', channelId);
      
      return () => {
        console.log("Leaving channel:", channelId);
        socket?.emit('leaveChannel', channelId);
      };
    }
  }, [channelId, currentUserId]);

  return (
    <>
      <div className={`relative flex h-screen ${bgColor}`}>
         <LeftNavigation isDark={isDark} onToggleTheme={toggleTheme} />
        
        <div className={`flex flex-1 transition-all duration-300 ${isLeftNavOpen ? "ml-24" : "ml-0"}`}>
          <Sidebar
            onContactSelect={handleContactSelect}
            onGroupSelect={handleGroupSelect} 
            isDark={isDark}
            initialSelectedUserId={initialSelectedUserId}
          />
          
          <div className="flex-1">
            {/* ✅ Enhanced main content rendering with group chat */}
            {(selectedUser || selectedGroup) ? (
              <>
                {chatAreaActiveTab === "chat" && (
                  <>
                    {/* Direct Chat */}
                    {chatType === "direct" && selectedUser ? (
                      !currentUserId || !selectedUser.id ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-gray-600">Loading direct chat...</p>
                          </div>
                        </div>
                      ) : (
                        <ChatArea
                          contact={{
                            ...selectedUser,
                            profilePicture: selectedUser?.profilePicture || selectedUser?.avatar,
                          }}
                          channelId={generateChannelId(currentUserId, selectedUser.id)}
                          receiverId={selectedUser.id}
                          senderId={currentUserId}
                          currentUserId={currentUserId}
                          currentUserName={currentUserName}
                          onVideoCall={handleVideoCall}
                          onVoiceCall={handleVoiceCall}
                          isDark={isDark}
                        />
                      )
                    ) : null}

                    {/* ✅ Enhanced Group Chat with all functions */}
                    {chatType === "group" && selectedGroup ? (
                      !currentUserId || !selectedGroup.id ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-gray-600">Loading group chat...</p>
                            {groupConnectionError && (
                              <p className="text-red-500 mt-2">{groupConnectionError}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <ChatArea
                          contact={{
                            id: selectedGroup.id,
                            name: selectedGroup.name,
                            avatar: selectedGroup.avatar || `https://ui-avatars.com/api/?name=${selectedGroup.name}&background=01aa85&color=fff`,
                            profilePicture: selectedGroup.avatar,
                            lastMessage: '',
                            time: '',
                            unreadCount: unreadCount,
                          }}
                          channelId={selectedGroup.id}
                          receiverId={selectedGroup.id}
                          senderId={currentUserId}
                          currentUserId={currentUserId}
                          currentUserName={currentUserName}
                          onVideoCall={handleVideoCall}
                          onVoiceCall={handleVoiceCall}
                          isDark={isDark}
                          // ✅ Pass group-specific props
                          isGroupChat={true}
                          groupMessages={groupMessages}
                          typingUsers={typingUsers}
                          onlineUsers={onlineUsers}
                          onSendGroupMessage={handleSendGroupMessage}
                          onGroupTyping={handleGroupTyping}
                          onGroupStopTyping={handleGroupStopTyping}
                          onDeleteGroupMessage={handleDeleteGroupMessage}
                          onLoadMoreMessages={handleLoadMoreGroupMessages}
                          isLoadingMessages={isLoadingMessages}
                          hasMoreMessages={hasMoreMessages}
                          isCurrentUserAdmin={isCurrentUserAdmin}
                          canManageGroup={canManageGroup}
                          participantCount={participantCount}
                          groupInfo={groupInfo}
                          onLeaveGroup={handleLeaveGroup}
                          onAddParticipants={addParticipants}
                          onRemoveParticipant={removeParticipant}
                          onChangeAdminStatus={changeAdminStatus}
                        />
                      )
                    ) : null}

                    {/* ✅ Enhanced fallback */}
                    {(!chatType || (chatType === "direct" && !selectedUser) || (chatType === "group" && !selectedGroup)) && (
                      <div className={`h-full flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-[#f0f2f5]"}`}>
                        <div className="text-center">
                          <h2 className={`text-xl ${isDark ? "text-gray-300" : "text-gray-600"} mb-2`}>
                            WhatsApp Web
                          </h2>
                          <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {chatType === "group" 
                              ? "Select a group to start chatting" 
                              : "Select a contact to start chatting"}
                          </p>
                          {/* Show connection status for groups */}
                          {chatType === "group" && !isGroupConnected && (
                            <p className="text-yellow-500 mt-2">
                              Connecting to group chat...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {chatAreaActiveTab === "call" && <div />}
                
                {/* ✅ Contact info tab - only for direct chats */}
                {chatAreaActiveTab === "contact" && selectedUser && chatType === "direct" && (
                  <DetailedContactInfo
                    contact={{
                      name: selectedUser.name,
                      avatar: selectedUser.avatar,
                      gender: "Not specified",
                      birthday: "Not specified",
                      favoriteBook: "Not specified",
                      personality: "Not specified",
                      city: "Not specified",
                      mobileNo: "Not specified",
                      email: "Not specified",
                      website: "Not specified",
                      interest: "Not specified",
                    }}
                  />
                )}

                {/* ✅ Group info tab - only for group chats */}
                {chatAreaActiveTab === "contact" && selectedGroup && chatType === "group" && (
                  <div className="h-full bg-white p-6">
                    <div className="text-center mb-6">
                      <img 
                        src={selectedGroup.avatar || `https://ui-avatars.com/api/?name=${selectedGroup.name}&background=01aa85&color=fff`}
                        alt={selectedGroup.name}
                        className="w-20 h-20 rounded-full mx-auto mb-4"
                      />
                      <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
                      <p className="text-gray-600">
                        {participantCount} participants • {onlineUsers.length} online
                      </p>
                      {isCurrentUserAdmin && (
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 inline-block">
                          Admin
                        </span>
                      )}
                    </div>

                    {/* Group actions */}
                    <div className="space-y-2">
                      {canManageGroup && (
                        <button 
                          onClick={() => console.log("Edit group")}
                          className="w-full text-left p-3 hover:bg-gray-100 rounded"
                        >
                          Edit Group
                        </button>
                      )}
                      <button 
                        onClick={handleLeaveGroup}
                        className="w-full text-left p-3 hover:bg-gray-100 rounded text-red-600"
                      >
                        Leave Group
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`h-full flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-[#f0f2f5]"}`}>
                <div className="text-center">
                  <h2 className={`text-xl ${isDark ? "text-gray-300" : "text-gray-600"} mb-2`}>
                    WhatsApp Web
                  </h2>
                  <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Select a contact or group to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <VideoCallModal
          open={videoCallModalOpen}
          onClose={() => setVideoCallModalOpen(false)}
          contact={{
            name: "Josephin water",
            location: "AMERICA, CALIFORNIA",
            avatar: "/placeholder.svg?height=50&width=50",
          }}
        />
      </div>
    </>
  );
}