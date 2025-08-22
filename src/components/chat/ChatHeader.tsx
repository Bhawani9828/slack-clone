"use client";

import { useEffect, useRef, useState } from "react";
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
import { useCallSocket } from "@/hooks/useCallSocket";
import CallModal from "../modals/CallModal";

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
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
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
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  // Get current user ID from contact or context (you may need to adjust this)
  const currentUserId = "current-user-id"; // Replace with actual current user ID
  
  const {
    localStream,
    remoteStream,
    incomingCall,
    isCalling,
  
    isInCall,
    callUser,
    acceptCall,
    endCall,
    initLocalStream,
  } = useCallSocket({ currentUserId });

  
  // Call handling functions
  // Call handling functions
  const handleVideoCall = async () => {
    try {
      console.log('🎥 Starting video call...');
      const stream = await initLocalStream({ video: true, audio: true });
      
      if (!stream) {
        throw new Error('Failed to get media stream');
      }
      
      console.log('✅ Media stream obtained, initiating call...');
      console.log('📹 Stream details:', {
        id: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });
         // Pass the stream directly to callUser
      await callUser(contact.userId || '', stream);
      setIsCallModalOpen(true);
    } catch (error: any) {
      console.error('Failed to initiate video call:', error);
      
      let errorMessage = 'Failed to start video call. ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your camera and microphone permissions.';
      }
      
      alert(errorMessage);
    }
  };

 const handleVoiceCall = async () => {
    try {
      console.log('🎤 Starting voice call...');
      const stream = await initLocalStream({ video: false, audio: true });
      
      if (!stream) {
        throw new Error('Failed to get media stream');
      }
      
      console.log('✅ Media stream obtained, initiating call...');
      console.log('🎤 Stream details:', {
        id: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });
        // Pass the stream directly to callUser
      await callUser(contact.userId || '', stream);
      setIsCallModalOpen(true);
    } catch (error: any) {
      console.error('Failed to initiate voice call:', error);
      
      let errorMessage = 'Failed to start voice call. ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your microphone permissions.';
      }
      
      alert(errorMessage);
    }
  };

 const handleAcceptCall = async () => {
    try {
      await acceptCall();
      setIsCallModalOpen(true);
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      // Reject the call
      setIsCallModalOpen(false);
    }
  };



  const handleEndCall = () => {
    endCall();
    setIsCallModalOpen(false);
  };

  const handleToggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

   const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // You can implement speaker toggle logic here
  };

  // Show call modal when there's an incoming call or when in a call
 useEffect(() => {
    if (incomingCall || isInCall || isCalling) {
      console.log('📱 Opening call modal:', { incomingCall, isInCall, isCalling });
      setIsCallModalOpen(true);
    } else {
      console.log('📱 Closing call modal');
      setIsCallModalOpen(false);
    }
  }, [incomingCall, isInCall, isCalling]);

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
        {/* Call Modal */}
       <CallModal
        open={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        incomingCall={incomingCall}
        localStream={localStream}
        remoteStream={remoteStream}
        isIncoming={!!incomingCall}
        isInCall={isInCall}
        isCalling={isCalling}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEndCall={handleEndCall}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleSpeaker={handleToggleSpeaker}
        isMicOn={isMicOn}
        isVideoOn={isVideoOn}
        isSpeakerOn={isSpeakerOn}
        callerName={contact.name}
        callerAvatar={contact.profilePicture || contact.avatar}
      />
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


