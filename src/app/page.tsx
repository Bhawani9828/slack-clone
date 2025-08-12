"use client";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import ChatArea from "@/components/chat/ChatArea";
import Sidebar from "@/components/layout/Sidebar";

import VideoCallModal from "@/components/modals/VideoCallModal";
import DetailedContactInfo from "@/components/chat/DetailedContactInfo";
import { socketService } from "@/lib/socket";
import type { RootState } from '@/lib/store/index';
import {
  setActiveView,
  setChatAreaActiveTab,
  setIsLeftNavOpen,
  setSelectedUser,
  setShowStatusView,
  setStatusUserId,
  backToChat
} from '@/lib/store/slices/sidebarSlice';
import LeftNavigation from "@/components/layout/LeftNavigation";

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
    selectedUser
  } = useSelector((state: RootState) => state.sidebar);

  // Local state for non-Redux managed state
  const [isDark, setIsDark] = useState(false);
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [initialSelectedUserId, setInitialSelectedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");

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

  const generateChannelId = (user1Id: string, user2Id: string) => {
    const sortedIds = [user1Id, user2Id].sort();
    return `channel_${sortedIds[0]}_${sortedIds[1]}`;
  };

  const handleContactSelect = (contactId: string) => {
    dispatch(setActiveView("chat"));
    dispatch(setChatAreaActiveTab("chat"));
    localStorage.setItem("lastSelectedUserId", contactId);
  };

  // This function is no longer needed since LeftNavigation handles its own navigation
  // But keeping it for any external navigation needs
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
        // Implement logout
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
    <div className={`relative flex h-screen ${bgColor}`}>
      <LeftNavigation
        isDark={isDark}
      />
      <div
        className={`flex flex-1 transition-all duration-300 ${
          isLeftNavOpen ? "ml-24" : "ml-0"
        }`}
      >
        <Sidebar
          onContactSelect={handleContactSelect}
          isDark={isDark}
          initialSelectedUserId={initialSelectedUserId}
        />
        <div className="flex-1">
          {selectedUser ? (
            <>
              {chatAreaActiveTab === "chat" && (
                !currentUserId || !receiverId ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-600">Loading chat...</p>
                    </div>
                  </div>
                ) : (
                  <ChatArea
                    contact={{
                      ...selectedUser,
                      profilePicture: selectedUser?.profilePicture || selectedUser?.avatar,
                    }}
                    channelId={channelId}
                    receiverId={receiverId}
                    currentUserId={currentUserId}
                    senderId={currentUserId}
                    currentUserName={currentUserName}
                    onVideoCall={handleVideoCall}
                    onVoiceCall={handleVoiceCall}
                  />
                )
              )}
              {chatAreaActiveTab === "call" && <div />}
              {chatAreaActiveTab === "contact" && (
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
            </>
          ) : (
            <div
              className={`h-full flex items-center justify-center ${
                isDark ? "bg-gray-800" : "bg-[#f0f2f5]"
              }`}
            >
              <div className="text-center">
                <h2
                  className={`text-xl ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  } mb-2`}
                >
                  WhatsApp Web
                </h2>
                <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Select a contact to start chatting
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
  );
}