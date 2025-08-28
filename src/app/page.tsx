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
const [isClient, setIsClient] = useState(false);
  // Mobile state management
  const [isMobile, setIsMobile] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // Call-related UI states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [currentCallType, setCurrentCallType] = useState<'video' | 'audio' | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{
    camera: boolean;
    microphone: boolean;
    checking: boolean;
  }>({ camera: false, microphone: false, checking: false });

  const currentGroupId = selectedGroup?.id || "";
  const { showSnackbar } = useSnackbar();

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

   useEffect(() => {
    setIsClient(true);
  }, []);

  // Mobile detection and resize handler
  useEffect(() => {
    if (!isClient) return;

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      dispatch(setIsMobileView(mobile));

      if (mobile) {
        dispatch(setIsLeftNavOpen(false));
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [dispatch, isClient]);

  useEffect(() => {
    if (!currentUserId) return;
    socketService.setCurrentUserId(currentUserId);
    socketService.connect(currentUserId);
  }, [currentUserId]);

   useEffect(() => {
    if (!isClient) return;

    const userId = localStorage.getItem("currentUserId") || "665a3e2855e5679c37d44c12";
    const userName = localStorage.getItem("currentUserName") || "Current User";
    setCurrentUserId(userId);
    setCurrentUserName(userName);

    const lastUserId = localStorage.getItem("lastSelectedUserId");
    if (lastUserId) {
      setInitialSelectedUserId(lastUserId);
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;

    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      setIsDark(saved === "dark");
    } else {
      // Check system preference only on client
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      localStorage.setItem("theme", prefersDark ? "dark" : "light");
    }
  }, [isClient]);

 const toggleTheme = () => {
    if (!isClient) return;

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

   if (!isClient) {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

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
    
    if (isMobile) {
      setShowChatOnMobile(true);
    }
  };

  const handleGroupSelect = (group: ChatGroup) => {
    if (!group.id && !group._id) {
      console.error("Invalid group selected:", group);
      showSnackbar("Invalid group selected. Please try again.", "error");
      return;
    }

    const groupId = (group.id || group._id)!;
    if (!/^[0-9a-fA-F]{24}$/.test(groupId)) {
      console.error("Invalid group ID format:", groupId);
      showSnackbar("Invalid group ID format. Please contact support.", "error");
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
    
    if (isMobile) {
      setShowChatOnMobile(true);
    }
  };

  const handleBackToSidebar = () => {
    if (isMobile) {
      setShowChatOnMobile(false);
    }
  };

  // Group chat helpers
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

  const handleLeaveGroup = async (): Promise<boolean> => {
    if (selectedGroup?.id) {
      try {
        const success = await leaveGroup();
        if (success) {
          dispatch(setSelectedGroup(null));
          dispatch(setChatType("direct"));
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

  // Device check helper
  const checkDevices = async (): Promise<{ camera: boolean; microphone: boolean }> => {
    try {
      // Check if we're in a browser environment and navigator exists
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        console.warn('Navigator not available - likely running on server');
        return { camera: false, microphone: false };
      }

      // Check if mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('MediaDevices API not supported');
        return { camera: false, microphone: false };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === "videoinput");
      const hasMicrophone = devices.some(device => device.kind === "audioinput");
      
      return { camera: hasCamera, microphone: hasMicrophone };
    } catch (error) {
      console.error("Error checking devices:", error);
      return { camera: false, microphone: false };
    }
  };

  // Call handlers with proper error handling
   const handleVideoCall = async (userId: string, name?: string) => {
    try {
      console.log('Starting video call to:', userId, name);
      setCallError(null);
      setCurrentCallType("video");
      
      setDeviceStatus({ camera: false, microphone: false, checking: true });

      // Safe navigator check
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error("Video calling is not available on this platform");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Video calling is not supported in your browser");
      }

      const deviceCheck = await checkDevices();
      setDeviceStatus({ ...deviceCheck, checking: false });

      if (!deviceCheck.camera) {
        throw new Error("No camera found. Please connect a camera and try again.");
      }

      if (!deviceCheck.microphone) {
        throw new Error("No microphone found. Please connect a microphone and try again.");
      }

      const stream = await initLocalStream({ video: true, audio: true });
      if (!stream) {
        throw new Error("Failed to get video stream");
      }

      // Update states based on actual stream tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      setIsVideoOn(videoTrack ? videoTrack.enabled : false);
      setIsMicOn(audioTrack ? audioTrack.enabled : true);

      await callUser(userId, stream, name);
      showSnackbar("Video call initiated", "success");
      
    } catch (error) {
      console.error("Video call failed:", error);
      setCurrentCallType(null);
      setDeviceStatus({ camera: false, microphone: false, checking: false });

      const mediaError = error as Error;
      let errorMessage = mediaError.message || "Failed to start video call";

      if (mediaError.name === "NotReadableError") {
        errorMessage = "Camera is in use by another app. Close other apps and try again.";
      } else if (mediaError.name === "NotAllowedError") {
        errorMessage = "Camera and microphone access denied. Please allow access and try again.";
      } else if (mediaError.name === "NotFoundError") {
        errorMessage = "No camera or microphone found. Please connect devices and try again.";
      }

      setCallError(errorMessage);
      showSnackbar(errorMessage, "error");
    }
  };

   const handleVoiceCall = async (userId: string, name?: string) => {
    try {
      console.log("Starting voice call to:", userId, name);
      setCallError(null);
      setCurrentCallType("audio");
      
      setDeviceStatus({ camera: false, microphone: false, checking: true });

      // Safe navigator check
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error("Voice calling is not available on this platform");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Voice calling is not supported in your browser");
      }

      const deviceCheck = await checkDevices();
      setDeviceStatus({ ...deviceCheck, checking: false });

      if (!deviceCheck.microphone) {
        throw new Error("No microphone found. Please connect a microphone and try again.");
      }

      const stream = await initLocalStream({ video: false, audio: true });
      if (!stream) {
        throw new Error("Failed to get audio stream");
      }

      // Update mic state based on actual stream
      const audioTrack = stream.getAudioTracks()[0];
      setIsMicOn(audioTrack ? audioTrack.enabled : true);
      setIsVideoOn(false); // Audio call

      await callUser(userId, stream, name);
      showSnackbar("Voice call initiated", "success");
      
    } catch (error) {
      console.error("Voice call failed:", error);
      setCurrentCallType(null);
      setDeviceStatus({ camera: false, microphone: false, checking: false });

      const mediaError = error as Error;
      let errorMessage = mediaError.message || "Failed to start voice call";

      if (mediaError.name === "NotReadableError") {
        errorMessage = "Microphone is in use by another app. Close other apps and try again.";
      } else if (mediaError.name === "NotAllowedError") {
        errorMessage = "Microphone access denied. Please allow access and try again.";
      } else if (mediaError.name === "NotFoundError") {
        errorMessage = "No microphone found. Please connect a microphone and try again.";
      }

      setCallError(errorMessage);
      showSnackbar(errorMessage, "error");
    }
  };

  // Call modal logic
  const isCallModalOpen = Boolean(
    incomingCall ||
    (isInCall && (localStream || remoteStream)) ||
    (isCalling && localStream) ||
    callError 
  );

  const handleAcceptCall = async () => {
    try {
      setCallError(null);
      await acceptCall();
      
      // Update UI states after accepting
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];
        
        setIsVideoOn(videoTrack ? videoTrack.enabled : false);
        setIsMicOn(audioTrack ? audioTrack.enabled : true);
      }
      
    } catch (err: any) {
      console.error("Call accept failed:", err);
      const errorMessage = err.message || "Failed to accept call";
      setCallError(errorMessage);
      showSnackbar(errorMessage, "error");
    }
  };

  const handleEndCall = () => {
    endCall();
    setCurrentCallType(null);
    setCallError(null);
    setDeviceStatus({ camera: false, microphone: false, checking: false });
  };

  // Media controls
  const handleToggleMic = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoOn(track.enabled);
      }
    }
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
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
        {/* Left Navigation */}
        <div className={`${isMobile && showChatOnMobile ? 'hidden' : 'block'}`}>
          <LeftNavigation isDark={isDark} onToggleTheme={toggleTheme} />
        </div>
        
        <div className={`flex flex-1 transition-all duration-300 ${
          !isMobile && isLeftNavOpen ? "ml-24" : "ml-0"
        } ${isMobile ? 'main-content-mobile no-scroll-x' : ''}`}>
          
          {/* Sidebar */}
          <div className={`${
            isMobile 
              ? (showChatOnMobile ? 'hidden' : 'mobile-sidebar mobile-full-width') 
              : 'w-100'
          } transition-all duration-300`}>
            <Sidebar
              onContactSelect={handleContactSelect}
              onGroupSelect={handleGroupSelect} 
              isDark={isDark}
              initialSelectedUserId={initialSelectedUserId}
              isMobile={isMobile}
              onMobileBack={handleBackToSidebar}
            />
          </div>
          
          {/* Chat Area */}
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