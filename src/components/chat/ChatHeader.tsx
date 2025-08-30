"use client";

import { useEffect, useState } from "react";
import type React from "react";
import {
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Search,
  VideoCall,
  Call,
  MoreVert,
  VolumeUp,
  Apps,
  ArrowBack,
} from "@mui/icons-material";
import UserAvatar from "./UserAvatar";
import { formatLastSeen } from "@/lib/utils"; // Your existing utility function

interface Contact {
  userId: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  profilePicture?: string;
  profilePicturePublicId?: string;
  status?: string;
  lastSeen?: string; // Add lastSeen field
}

interface ChatHeaderProps {
  contact: {
    id?: string;
    _id?: string;
    name: string;
    avatar?: string;
    profilePicture?: string;
    status?: string;
    isOnline?: boolean;
    isTyping?: boolean;
    userId?: string;
    lastSeen?: string; // Add lastSeen to contact
  };
  currentUserId: string;
  onVideoCall?: (userId: string, name?: string, avatarUrl?: string) => void;
  onVoiceCall?: (userId: string, name?: string, avatarUrl?: string) => void;
  isTyping?: boolean;
  isMobile?: boolean;
  onMobileBack?: () => void;
  
  isGroupChat?: boolean;
  participantCount?: number;
  onlineCount?: number;
  canManageGroup?: boolean;
  onLeaveGroup?: () => Promise<boolean>;
  onShowGroupInfo?: () => void;
  onEditGroup?: () => void;
  onAddParticipants?: () => void;
  onShowGroupMedia?: () => void;

  // Socket service for real-time status updates
  socketService?: {
    requestUserStatus: (userId: string) => void;
    on: (event: string, callback: Function) => void;
    off: (event: string, callback?: Function) => void;
  };
}

export default function ChatHeader({
  contact,
  currentUserId,
  onVideoCall,
  onVoiceCall,
  isTyping,
  isGroupChat = false,
  participantCount = 0,
  onlineCount = 0,
  canManageGroup = false,
  onLeaveGroup,
  onShowGroupInfo,
  onEditGroup,
  onAddParticipants,
  onShowGroupMedia,
  isMobile = false,
  onMobileBack,
  socketService
}: ChatHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  
  // Local state for real-time status updates
  const [userStatus, setUserStatus] = useState({
    isOnline: contact.isOnline || false,
    lastSeen: contact.lastSeen || undefined,
  });

  // Update local status when contact prop changes
  useEffect(() => {
    setUserStatus({
      isOnline: contact.isOnline || false,
      lastSeen: contact.lastSeen,
    });
  }, [contact.isOnline, contact.lastSeen]);

  // Request and listen for real-time status updates
  useEffect(() => {
    if (!socketService || !contact.userId || isGroupChat) return;

    // Request current status
    socketService.requestUserStatus(contact.userId);

    // Listen for status updates
    const handleUserOnline = (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      if (data.userId === contact.userId) {
        console.log(`User ${contact.userId} came online`);
        setUserStatus({
          isOnline: true,
          lastSeen: data.lastSeen,
        });
      }
    };

    const handleUserOffline = (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      if (data.userId === contact.userId) {
        console.log(`User ${contact.userId} went offline, last seen: ${data.lastSeen}`);
        setUserStatus({
          isOnline: false,
          lastSeen: data.lastSeen,
        });
      }
    };

    const handleUserStatus = (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      if (data.userId === contact.userId) {
        console.log(`Status update for ${contact.userId}:`, data);
        setUserStatus({
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        });
      }
    };

    // Register listeners
    socketService.on('userOnline', handleUserOnline);
    socketService.on('userOffline', handleUserOffline);
    socketService.on('userStatus', handleUserStatus);

    // Cleanup listeners on unmount
    return () => {
      socketService.off('userOnline', handleUserOnline);
      socketService.off('userOffline', handleUserOffline);
      socketService.off('userStatus', handleUserStatus);
    };
  }, [contact.userId, socketService, isGroupChat]);

  // Poll for status updates every 30 seconds
  useEffect(() => {
    if (!socketService || !contact.userId || isGroupChat) return;

    const interval = setInterval(() => {
      socketService.requestUserStatus(contact.userId!);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [contact.userId, socketService, isGroupChat]);

  const handleVideoCall = async () => {
    onVideoCall?.(contact.userId || '', contact.name, contact.profilePicture || contact.avatar);
  };

  const handleVoiceCall = async () => {
    onVoiceCall?.(contact.userId || '', contact.name, contact.profilePicture || contact.avatar);
  };

  useEffect(() => {
    setIsCallModalOpen(false);
  }, [contact?.userId]);

  const handleLeaveGroup = async () => {
    if (onLeaveGroup && confirm("Are you sure you want to leave this group?")) {
      try {
        const success = await onLeaveGroup();
        if (success) {
          console.log("Left group successfully");
        }
      } catch (error) {
        console.error("Failed to leave group:", error);
      }
    }
    handleMenuClose();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleGroupInfo = () => {
    onShowGroupInfo?.();
    handleMenuClose();
  };

  const handleEditGroup = () => {
    onEditGroup?.();
    handleMenuClose();
  };

  const handleAddParticipants = () => {
    onAddParticipants?.();
    handleMenuClose();
  };

  const handleGroupMedia = () => {
    onShowGroupMedia?.();
    handleMenuClose();
  };

  // Generate status text based on current state
  const getStatusText = () => {
    if (isTyping) {
      return "typing...";
    }
    
    if (isGroupChat) {
      return `${participantCount} participants${onlineCount > 0 ? `, ${onlineCount} online` : ''}`;
    }
    
    // Use real-time status for individual chats
    const { time, isOnline } = formatLastSeen(userStatus.lastSeen, userStatus.isOnline);
    
    if (isOnline) {
      return "Online";
    } else {
      return time; // This will show "last seen today at 10:30 AM" etc.
    }
  };

  return (
    <div className={`chat-header px-3 py-2 flex items-center justify-between ${
      isMobile ? 'min-h-16 h-16' : 'h-28'
    } bg-white shadow-sm`}>
      {/* Left - Contact Info */}
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {/* Mobile Back Button */}
        {isMobile && onMobileBack && (
          <IconButton
            onClick={onMobileBack}
            size="small"
            className="text-gray-600 hover:bg-gray-100 p-1"
          >
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
        
        {contact.userId && (
          <div className="flex-shrink-0">
            <UserAvatar
              userId={contact.userId}
              name={contact.name}
              imageUrl={contact.profilePicture || contact.avatar}
              size={isMobile ? 'small' : 'medium'}
              showOnlineStatus={true}
              isOnline={userStatus.isOnline} 
            />
          </div>
        )}
        
        <div className="min-w-0 flex-1">
          <h3 className={`font-medium text-[#015a4a] truncate ${
            isMobile ? 'text-sm' : 'text-base'
          }`}>
            {contact.name}
          </h3>
          <p className={`truncate ${
            isMobile ? 'text-xs' : 'text-sm'
          } ${
            userStatus.isOnline || isTyping ? 'text-[#4b8d81]' : 'text-gray-500'
          }`}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Right - Icons */}
      <div className="flex items-center flex-shrink-0">
        {/* Show fewer icons on mobile */}
        {!isMobile && (
          <>
            <Tooltip title="Audio" placement="bottom" arrow>
              <IconButton className="hover:bg-[#00a8841a] p-2">
                <VolumeUp className="!text-[#00a884]" fontSize="small" />
              </IconButton>
            </Tooltip>

            <VerticalDivider />

            <Tooltip title="Search" placement="bottom" arrow>
              <IconButton className="hover:bg-[#00a8841a] p-2">
                <Search className="!text-[#00a884]" fontSize="small" />
              </IconButton>
            </Tooltip>

            <VerticalDivider />
          </>
        )}

        <Tooltip title="Video Call" placement="bottom" arrow>
          <IconButton 
            onClick={handleVideoCall} 
            className={`hover:bg-[#00a8841a] ${isMobile ? 'p-1' : 'p-2'}`}
          >
            <VideoCall 
              className="!text-[#00a884]" 
              fontSize={isMobile ? "small" : "medium"} 
            />
          </IconButton>
        </Tooltip>

        {!isMobile && <VerticalDivider />}

        <Tooltip title="Voice Call" placement="bottom" arrow>
          <IconButton 
            onClick={handleVoiceCall} 
            className={`hover:bg-[#00a8841a] ${isMobile ? 'p-1 ml-1' : 'p-2'}`}
          >
            <Call 
              className="!text-[#00a884]" 
              fontSize={isMobile ? "small" : "medium"} 
            />
          </IconButton>
        </Tooltip>

        {!isMobile && <VerticalDivider />}

        <Tooltip title="More Options" placement="bottom" arrow>
          <IconButton
            onClick={handleMenuClick}
            className={`hover:bg-[#00a8841a] !bg-white ${isMobile ? 'p-1 ml-1' : 'p-2'}`}
          >
            <MoreVert 
              className="!text-[#00a884]" 
              fontSize={isMobile ? "small" : "medium"} 
            />
          </IconButton>
        </Tooltip>

        {/* Menu */}
        <Menu 
          anchorEl={anchorEl} 
          open={Boolean(anchorEl)} 
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {/* Add Search and Audio options to mobile menu */}
          {isMobile && [
            <MenuItem key="search" onClick={handleMenuClose}>Search</MenuItem>,
            <MenuItem key="audio" onClick={handleMenuClose}>Audio Settings</MenuItem>,
            <Divider key="mobile-divider" />
          ]}
          
          {isGroupChat
            ? [
                <MenuItem key="group-info" onClick={handleGroupInfo}>Group Info</MenuItem>,
                canManageGroup && <MenuItem key="edit-group" onClick={handleEditGroup}>Edit Group</MenuItem>,
                canManageGroup && <MenuItem key="add-participants" onClick={handleAddParticipants}>Add Participants</MenuItem>,
                <MenuItem key="group-media" onClick={handleGroupMedia}>Group Media</MenuItem>,
                <MenuItem key="select-messages" onClick={handleMenuClose}>Select messages</MenuItem>,
                <MenuItem key="mute-notifications" onClick={handleMenuClose}>Mute notifications</MenuItem>,
                <MenuItem key="clear-messages" onClick={handleMenuClose}>Clear messages</MenuItem>,
                <Divider key="divider" />,
                <MenuItem key="leave-group" onClick={handleLeaveGroup} sx={{ color: '#dc2626' }}>
                  Leave Group
                </MenuItem>
              ].filter(Boolean)
            : [
                <MenuItem key="contact-info" onClick={handleMenuClose}>Contact info</MenuItem>,
                <MenuItem key="select-messages" onClick={handleMenuClose}>Select messages</MenuItem>,
                <MenuItem key="mute-notifications" onClick={handleMenuClose}>Mute notifications</MenuItem>,
                <MenuItem key="clear-messages" onClick={handleMenuClose}>Clear messages</MenuItem>,
                <MenuItem key="delete-chat" onClick={handleMenuClose}>Delete chat</MenuItem>,
              ]
          }
        </Menu>
      </div>
    </div>
  );
}

function VerticalDivider() {
  return (
    <Divider
      orientation="vertical"
      flexItem
      sx={{
        borderColor: "#00a88450",
        mx: 1,
        height: "20px",
        alignSelf: "center",
        display: "flex"
      }}
    />
  );
}