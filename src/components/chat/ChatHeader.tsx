"use client";

import { useState } from "react";
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

interface Contact {
  userId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  profilePicture?: string;
  profilePicturePublicId?: string;
  status?: string;
}

interface ChatHeaderProps {
  contact: Contact;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  isTyping?: boolean;
}

export default function ChatHeader({
  contact,
  onVideoCall,
  onVoiceCall,
  isTyping,
}: ChatHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className="bg-[#e3f7f3] px-4 py-3 border-b border-gray-200 flex  items-center justify-between h-28">
      {/* Left - Contact Info */}
      <div className="flex items-center space-x-3">
        <UserAvatar
  userId={contact.userId}
  name={contact.name}
  imageUrl={contact.profilePicture || contact.avatar}
/>
        <div>
          <h3 className="font-medium text-[#015a4a]">{contact.name}</h3>
          <p className="text-sm text-[#4b8d81]">
            {isTyping ? "typing..." : contact.status || "Online"}
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
          <IconButton onClick={onVideoCall}  className="hover:bg-[#00a8841a] text-red-600">
            <VideoCall className="!text-[#00a884]" />
          </IconButton>
        </Tooltip>

        <VerticalDivider />

        <Tooltip title="Voice Call" placement="bottom" arrow>
          <IconButton onClick={onVoiceCall} className="hover:bg-[#00a8841a]">
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
          <MenuItem onClick={handleMenuClose}>Contact info</MenuItem>
          <MenuItem onClick={handleMenuClose}>Select messages</MenuItem>
          <MenuItem onClick={handleMenuClose}>Mute notifications</MenuItem>
          <MenuItem onClick={handleMenuClose}>Clear messages</MenuItem>
          <MenuItem onClick={handleMenuClose}>Delete chat</MenuItem>
        </Menu>
      </div>
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
        display:"flex"
      }}
    />
  );
}
