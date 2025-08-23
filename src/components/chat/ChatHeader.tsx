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
} from "@mui/icons-material";
import UserAvatar from "./UserAvatar";
// Call handling is managed at page level via a global hook and modal

interface Contact {
  userId: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  profilePicture?: string;
  profilePicturePublicId?: string;
  status?: string;
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
  };
  currentUserId: string;
  onVideoCall?: (userId: string, name?: string, avatarUrl?: string) => void;
  onVoiceCall?: (userId: string, name?: string, avatarUrl?: string) => void;
  isTyping?: boolean;
  
  // ✅ Group chat specific props
  isGroupChat?: boolean;
  participantCount?: number;
  onlineCount?: number;
  canManageGroup?: boolean;
  onLeaveGroup?: () => Promise<boolean>;
  onShowGroupInfo?: () => void;
  onEditGroup?: () => void;
  onAddParticipants?: () => void;
  onShowGroupMedia?: () => void;
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
}: ChatHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Call-related state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  
  // Call handling functions
  // Call handling functions
  const handleVideoCall = async () => {
    onVideoCall?.(contact.userId || '', contact.name, contact.profilePicture || contact.avatar);
  };

 const handleVoiceCall = async () => {
    onVoiceCall?.(contact.userId || '', contact.name, contact.profilePicture || contact.avatar);
  };

  // Local state only, global modal is elsewhere
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

  return (
 <div className="chat-header px-4 py-3   flex items-center justify-between h-28">
      {/* Left - Contact Info */}
      <div className="flex items-center space-x-3">
      {contact.userId && (
  <UserAvatar
    userId={contact.userId}
    name={contact.name}
    imageUrl={contact.profilePicture || contact.avatar}
  />
)}
        <div>
          <h3 className="font-medium text-[#015a4a]">{contact.name}</h3>
          <p className="text-sm text-[#4b8d81]">
            {isTyping ? "typing..." : 
             isGroupChat ? `${participantCount} participants${onlineCount > 0 ? `, ${onlineCount} online` : ''}` :
             contact.status || "Online"}
          </p>
        </div>
      </div>

      {/* Right - Icons */}
      <div className="flex items-center space-x-2 !text-[#00a884]">
        <Tooltip title="Audio" placement="bottom" arrow>
          <IconButton className="hover:bg-[#00a8841a]">
            <VolumeUp className="!text-[#00a884]" />
          </IconButton>
        </Tooltip>

        <VerticalDivider />

        <Tooltip title="Search" placement="bottom" arrow>
          <IconButton className="hover:bg-[#00a8841a]">
            <Search className="!text-[#00a884]"/>
          </IconButton>
        </Tooltip>

        <VerticalDivider />

        <Tooltip title="Video Call" placement="bottom" arrow>
           <IconButton onClick={handleVideoCall} className="hover:bg-[#00a8841a] text-red-600">
            <VideoCall className="!text-[#00a884]" />
          </IconButton>
        </Tooltip>

        <VerticalDivider />

        <Tooltip title="Voice Call" placement="bottom" arrow>
          <IconButton onClick={handleVoiceCall} className="hover:bg-[#00a8841a]">
            <Call className="!text-[#00a884]"/>
          </IconButton>
        </Tooltip>

        <VerticalDivider />

        <Tooltip title="More Options" placement="bottom" arrow>
          <IconButton
            onClick={handleMenuClick}
            className="hover:bg-[#00a8841a] !bg-white !p-3"
          >
            <MoreVert className="!text-[#00a884]"/>
          </IconButton>
        </Tooltip>

        {/* Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
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
      ].filter(Boolean) // remove any falsey items like canManageGroup false
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
        {/* Global CallModal is rendered at page level */}
    </div>
  );
}

// Reusable vertical divider between icons
function VerticalDivider() {
  return (
    <Divider
      orientation="vertical"
      flexItem
      sx={{
        borderColor: "#00a88450",
        mx: 2,
        height: "28px",
        alignSelf: "center",
        display: "flex"
      }}
    />
  );
}


