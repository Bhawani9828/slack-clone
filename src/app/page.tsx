"use client";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import ChatArea from "@/components/chat/ChatArea";
import Sidebar from "@/components/layout/Sidebar";
import CallModal from "@/components/modals/CallModal";
import DetailedContactInfo from "@/components/chat/DetailedContactInfo";
import { socketService } from "@/lib/socket";
import { useGroupChat } from "@/hooks/useGroupChat";
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
  backToChat,
  // Add this new action for mobile
  setIsMobileView
} from '@/lib/store/slices/sidebarSlice';
import LeftNavigation from "@/components/layout/LeftNavigation";
import { ChatGroup } from "@/types/chatTypes";
import { useCallSocket } from "@/hooks/useCallSocket";
import { useSnackbar } from "@/hooks/use-snackbar";

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
  
  const {
    activeView: sidebarView,
    chatAreaActiveTab,
    isLeftNavOpen,
    selectedUser,
    selectedGroup,
    chatType,       
  } = useSelector((state: RootState) => state.sidebar);

  const [isDark, setIsDark] = useState(false);
  const [initialSelectedUserId, setInitialSelectedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const chatusers = useSelector((state: RootState) => state.user.chatusers);
  const [callError, setCallError] = useState<string | null>(null);

  // ✅ Add mobile state management
  const [isMobile, setIsMobile] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // Call-related UI toggles (for CallModal)
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [currentCallType, setCurrentCallType] = useState<'video' | 'audio' | null>(null);
  const currentGroupId = selectedGroup?.id || "";
const { showSnackbar } = useSnackbar()
  const {
    messages: groupMessages,
    groupInfo,
    groups,
    typingUsers,
    onlineUsers,
    isConnected: isGroupConnected,
    connectionError: groupConnectionError,
    isLoadingMessages,
    hasMoreMessages,
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
    isCurrentUserAdmin,
    canManageGroup,
    participantCount,
    unreadCount,
    hasUnreadMessages,
  } = useGroupChat(currentGroupId, currentUserId);

  // Global call hook
  const {
    localStream,
    remoteStream,
    incomingCall,
    isCalling,
    isInCall,
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    initLocalStream,
    ensureSocketConnected,
  } = useCallSocket({ currentUserId });

  // ✅ Mobile detection and resize handler
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      dispatch(setIsMobileView(mobile));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [dispatch]);

  // ✅ Auto-show chat when user/group is selected on mobile
  useEffect(() => {
    if (isMobile && (selectedUser || selectedGroup)) {
      setShowChatOnMobile(true);
    }
  }, [selectedUser, selectedGroup, isMobile]);

  useEffect(() => {
    if (!currentUserId) return;
    socketService.setCurrentUserId(currentUserId);
    socketService.connect(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
  const checkMobile = () => {
    const mobile = window.innerWidth < 768; // md breakpoint
    setIsMobile(mobile);
    dispatch(setIsMobileView(mobile));

    // ✅ Mobile hone par LeftNavigation close karo
    if (mobile) {
      dispatch(setIsLeftNavOpen(false));
    }
  };

  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, [dispatch]);

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
        if (next) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    console.log("HomePage State Changes:", {
      chatType,
      selectedUser: selectedUser?.name || 'none',
      selectedGroup: selectedGroup?.name || 'none',
      chatAreaActiveTab,
      groupMessages: groupMessages?.length || 0,
      isGroupConnected,
      isMobile,
      showChatOnMobile,
    });
  }, [chatType, selectedUser, selectedGroup, chatAreaActiveTab, groupMessages, isGroupConnected, isMobile, showChatOnMobile]);

  // Auto-open group
  useEffect(() => {
    if (chatType !== "group" || selectedGroup) return;

    const lastId = localStorage.getItem("lastSelectedGroupId");
    let target = lastId
      ? groups.find((g: any) => g?._id === lastId || g?.id === lastId)
      : undefined;

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

  // Auto-open direct chat
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
    
    // ✅ Show chat on mobile when contact is selected
    if (isMobile) {
      setShowChatOnMobile(true);
    }
  };
  const handleGroupSelect = (group: ChatGroup) => {
    if (!group.id && !group._id) {
      console.error("❌ Group has no valid ID:", group);
      showSnackbar("Invalid group selected. Please try again.", "error"); // 👈 snackbar
      return;
    }

    const groupId = (group.id || group._id)!;
    if (!/^[0-9a-fA-F]{24}$/.test(groupId)) {
      console.error("❌ Invalid group ID format:", groupId);
      showSnackbar("Invalid group ID format. Please contact support.", "error"); // 👈 snackbar
      return;
    }

    dispatch(
      setSelectedGroup({
        ...group,
        id: groupId,
        members: group.members ?? [],
      })
    );
    dispatch(setChatType("group"));
    localStorage.setItem("lastSelectedGroupId", groupId);
    
    // ✅ Show chat on mobile when group is selected
    if (isMobile) {
      setShowChatOnMobile(true);
    }
  };

  // ✅ Handle back to sidebar on mobile
  const handleBackToSidebar = () => {
    if (isMobile) {
      setShowChatOnMobile(false);
      // Optionally clear selected user/group
      // dispatch(setSelectedUser(null));
      // dispatch(setSelectedGroup(null));
    }
  };

  // Group chat helpers (unchanged)
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
    if (selectedGroup?.id) startGroupTyping();
  };

  const handleGroupStopTyping = () => {
    if (selectedGroup?.id) stopGroupTyping();
  };

  const handleDeleteGroupMessage = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (success) console.log("Message deleted successfully");
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleLoadMoreGroupMessages = async () => {
    if (hasMoreMessages && !isLoadingMessages) {
      await loadMoreMessages();
    }
  };

  const handleCreateGroup = async (groupData: { name: string; description?: string; participants: string[] }) => {
    try {
      const success = await createGroup(groupData);
      if (success) console.log("Group created successfully");
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
          // ✅ Go back to sidebar on mobile after leaving group
          if (isMobile) {
            setShowChatOnMobile(false);
          }
        }
        return success;
      } catch (error) {
        console.error("Failed to leave group:", error);
        return false;
      }
    }
    return false;
  };

  const handleNavClick = (section: string, userId?: string) => {
    switch (section) {
      case "chat":
        dispatch(setActiveView("chat"));
        dispatch(setChatAreaActiveTab("chat"));
        break;
      case "status":
        dispatch(setActiveView("status"));
        if (userId) dispatch(setStatusUserId(userId));
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

  // Call handlers (unchanged)
const handleVideoCall = async (userId: string, name?: string) => {
  try {
    console.log('🎥 Starting video call to:', userId, name);

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      showSnackbar("Video calling is not supported in your browser or requires HTTPS", "error");
      setCurrentCallType(null);
      return;
    }

    setCurrentCallType("video");

    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideo = devices.some(device => device.kind === "videoinput");

    if (!hasVideo) {
      showSnackbar("No camera found. Please connect a camera and try again.", "error");
      setCurrentCallType(null);
      return;
    }

    const stream = await initLocalStream({ video: true, audio: true });
    if (!stream) {
      throw new Error("Failed to get video stream");
    }

    await callUser(userId, stream, name);
    showSnackbar("✅ Video call initiated", "success");
  } catch (error) {
    console.error("❌ Video call failed:", error);
    setCurrentCallType(null);

    const mediaError = error as DOMException;
    let errorMessage = "Failed to start video call.";

    if (mediaError.name === "NotReadableError") {
      errorMessage = "Camera is in use by another app. Close other apps and try again.";
    } else if (mediaError.name === "NotAllowedError") {
      errorMessage = "Camera access denied. Please allow camera access.";
    } else if (mediaError.name === "NotFoundError") {
      errorMessage = "No camera found. Please connect a camera.";
    }

    showSnackbar(errorMessage, "error");
  }
};


 const handleVoiceCall = async (userId: string, name?: string) => {
  try {
    console.log("📞 Starting voice call to:", userId, name);

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      showSnackbar("Voice calling is not supported in your browser or requires HTTPS", "error");
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudio = devices.some(device => device.kind === "audioinput");

    if (!hasAudio) {
      showSnackbar("No microphone found. Please connect one and try again.", "error");
      return;
    }

    const stream = await initLocalStream({ video: false, audio: true });
    if (!stream) {
      throw new Error("Failed to get audio stream");
    }

    await callUser(userId, stream, name);
    showSnackbar("✅ Voice call initiated", "success");
  } catch (error) {
    console.error("❌ Voice call failed:", error);

    const mediaError = error as DOMException;
    let errorMessage = "Failed to start voice call.";

    if (mediaError.name === "NotReadableError") {
      errorMessage = "Microphone is in use by another app. Close other apps and try again.";
    } else if (mediaError.name === "NotAllowedError") {
      errorMessage = "Microphone access denied. Please allow microphone access.";
    } else if (mediaError.name === "NotFoundError") {
      errorMessage = "No microphone found. Please connect a microphone.";
    }

    showSnackbar(errorMessage, "error");
  }
};


  // Call modal logic (unchanged)
  const isCallModalOpen = Boolean(
    incomingCall ||
    (isInCall && (localStream || remoteStream)) ||
    (isCalling && localStream) ||
    callError 
  );

  useEffect(() => {
    console.log('📊 Call State Debug:', {
      incomingCall: !!incomingCall,
      isCalling,
      isInCall,
      localStream: !!localStream,
      remoteStream: !!remoteStream,
      modalShouldBeOpen: isCallModalOpen,
      callerName: incomingCall?.fromName || selectedUser?.name || 'Unknown'
    });
  }, [incomingCall, isCalling, isInCall, localStream, remoteStream, isCallModalOpen, selectedUser]);

  const handleAcceptCall = async () => {
    try {
      await acceptCall();
      setCallError(null);
    } catch (err: any) {
      console.log("Setting callError:", err.message);
      setCallError(err.message || "Call accept failed");
    }
  };

  const getCallerInfo = () => {
    if (incomingCall) {
      return {
        name: incomingCall.fromName || 'Unknown',
        avatar: undefined,
      };
    }
    
    if (selectedUser && (isCalling || isInCall)) {
      return {
        name: selectedUser.name,
        avatar: selectedUser.profilePicture || selectedUser.avatar,
      };
    }
    
    return { name: 'Unknown', avatar: undefined };
  };

  const callerInfo = getCallerInfo();

  const handleBackToChat = () => {
    dispatch(backToChat());
  };

  const bgColor = isDark ? "bg-gray-900" : "bg-gray-100";
  const receiverId = selectedUser?.id || "";
  const channelId = currentUserId && receiverId ? generateChannelId(currentUserId, receiverId) : "";
    
  useEffect(() => {
    if (channelId && currentUserId) {
      const socket = socketService.getSocket();
      socket?.emit('joinChannel', channelId);
      return () => {
        socket?.emit('leaveChannel', channelId);
      };
    }
  }, [channelId, currentUserId]);

  return (
    <>
     <div className={`relative flex h-screen ${bgColor} ${isMobile ? 'mobile-chat-container no-scroll-x' : ''}`}>
        {/* ✅ Left Navigation - Hide on mobile when chat is open */}
        <div className={`${isMobile && showChatOnMobile ? 'hidden' : 'block'}`}>
          <LeftNavigation isDark={isDark} onToggleTheme={toggleTheme} />
        </div>
        
             <div className={`flex flex-1 transition-all duration-300 ${
        !isMobile && isLeftNavOpen ? "ml-24" : "ml-0"
      } ${isMobile ? 'main-content-mobile no-scroll-x' : ''}`}>
          {/* ✅ Sidebar - Conditional rendering based on mobile state */}
          <div className={`${
          isMobile 
            ? (showChatOnMobile ? 'hidden' : 'mobile-sidebar mobile-full-width') 
            : 'w-100'
        } transition-all duration-300 `}>
            <Sidebar
              onContactSelect={handleContactSelect}
              onGroupSelect={handleGroupSelect} 
              isDark={isDark}
              initialSelectedUserId={initialSelectedUserId}
              // ✅ Pass mobile state and handlers
              isMobile={isMobile}
              onMobileBack={handleBackToSidebar}
            />
          </div>
          
          {/* ✅ Chat Area - Conditional rendering and responsive width */}
          <div className={`${
          isMobile 
            ? (showChatOnMobile ? 'mobile-chat-area mobile-full-width' : 'hidden') 
            : 'flex-1'
        } transition-all duration-300 ${isMobile ? 'no-scroll-x' : ''}`}>
            {(selectedUser || selectedGroup) ? (
              <>
                {chatAreaActiveTab === "chat" && (
                  <>
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
                          onVideoCall={() => handleVideoCall(selectedUser.id, selectedUser.name)}
                          onVoiceCall={() => handleVoiceCall(selectedUser.id, selectedUser.name)}
                          isDark={isDark}
                          // ✅ Pass mobile state and back handler
                          isMobile={isMobile}
                          onMobileBack={handleBackToSidebar}
                        />
                      )
                    ) : null}

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
                          onVideoCall={() => handleVideoCall(selectedUser!.id, selectedUser!.name)}
                          onVoiceCall={() => handleVoiceCall(selectedUser!.id, selectedUser!.name)}
                          isDark={isDark}
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
                          // ✅ Pass mobile state and back handler
                          isMobile={isMobile}
                          onMobileBack={handleBackToSidebar}
                        />
                      )
                    ) : null}

                    {/* Fallback */}
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
                
                {/* Contact info (direct) */}
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

                {/* Group info */}
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
        
        {/* Global Call Modal */}
        <CallModal
          open={isCallModalOpen}
          onClose={() => {
            if (!isInCall || remoteStream) {
              endCall();
            }
          }}
          callError={callError}
          onAccept={handleAcceptCall}
          incomingCall={incomingCall}
          localStream={localStream}
          remoteStream={remoteStream}
          isIncoming={!!incomingCall && !isInCall}
          isInCall={isInCall || (isCalling && !!localStream)}
          onReject={rejectCall}
          onEndCall={endCall}
          onToggleMic={() => {
            if (localStream) {
              const track = localStream.getAudioTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setIsMicOn(track.enabled);
              }
            }
          }}
          onToggleVideo={() => {
            if (localStream) {
              const track = localStream.getVideoTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setIsVideoOn(track.enabled);
              }
            }
          }}
          onToggleSpeaker={() => setIsSpeakerOn(!isSpeakerOn)}
          isMicOn={isMicOn}
          isVideoOn={isVideoOn}
          isSpeakerOn={isSpeakerOn}
          callerName={incomingCall?.fromName || selectedUser?.name || 'Unknown'}
          callerAvatar={
            incomingCall 
              ? undefined 
              : selectedUser?.profilePicture || selectedUser?.avatar
          }
        />
      </div>
    </>
  );
}