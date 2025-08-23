"use client";

import { useState, useEffect } from "react";
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
import CallModal from "../CallModal";

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
      
      // Don't open modal immediately - wait for call state
      console.log('📞 Call initiated, waiting for response...');
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
      
      // Don't open modal immediately - wait for call state
      console.log('📞 Call initiated, waiting for response...');
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

  // Show call modal when there's an incoming call, when in a call, or when calling
  useEffect(() => {
    if (incomingCall || isInCall || isCalling) {
      console.log('📱 Opening call modal:', { incomingCall, isInCall, isCalling });
      setIsCallModalOpen(true);
    } else {
      console.log('📱 Closing call modal');
      setIsCallModalOpen(false);
    }
  }, [incomingCall, isInCall, isCalling]);

  return (
    <div className="bg-[#e3f7f3] px-4 py-3 border-b border-gray-200 flex items-center justify-between h-28">
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
          {isGroupChat ? (
            // Group Chat Menu
            <>
              <MenuItem onClick={handleGroupInfo}>Group Info</MenuItem>
              
              {canManageGroup && (
                <>
                  <MenuItem onClick={handleEditGroup}>Edit Group</MenuItem>
                  <MenuItem onClick={handleAddParticipants}>Add Participants</MenuItem>
                </>
              )}
              
              <MenuItem onClick={handleGroupMedia}>Group Media</MenuItem>
              <MenuItem onClick={handleMenuClose}>Select messages</MenuItem>
              <MenuItem onClick={handleMenuClose}>Mute notifications</MenuItem>
              <MenuItem onClick={handleMenuClose}>Clear messages</MenuItem>
              
              <Divider />
              
              <MenuItem 
                onClick={handleLeaveGroup}
                sx={{ color: '#dc2626' }} // Red color for leave group
              >
                Leave Group
              </MenuItem>
            </>
          ) : (
            // Individual Chat Menu
            <>
              <MenuItem onClick={handleMenuClose}>Contact info</MenuItem>
              <MenuItem onClick={handleMenuClose}>Select messages</MenuItem>
              <MenuItem onClick={handleMenuClose}>Mute notifications</MenuItem>
              <MenuItem onClick={handleMenuClose}>Clear messages</MenuItem>
              <MenuItem onClick={handleMenuClose}>Delete chat</MenuItem>
            </>
          )}
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


// components/ChatHeader.tsx - Enhanced with Group Chat Support
// "use client";

// interface ChatHeaderProps {
//   contact: {
//     id?: string;
//     _id?: string;
//     name: string;
//     avatar?: string;
//     profilePicture?: string;
//     status?: string;
//     isOnline?: boolean;
//     isTyping?: boolean;
//     userId?: string;
//   };
//   onVideoCall?: () => void;
//   onVoiceCall?: () => void;
//   isTyping?: boolean;
  
//   // ✅ Group chat specific props
//   isGroupChat?: boolean;
//   participantCount?: number;
//   onlineCount?: number;
//   canManageGroup?: boolean;
//   onLeaveGroup?: () => Promise<boolean>;
//   onShowGroupInfo?: () => void;
// }

// export default function ChatHeader({
//   contact,
//   onVideoCall,
//   onVoiceCall,
//   isTyping,
//   isGroupChat = false,
//   participantCount = 0,
//   onlineCount = 0,
//   canManageGroup = false,
//   onLeaveGroup,
//   onShowGroupInfo,
// }: ChatHeaderProps) {
  
//   const handleLeaveGroup = async () => {
//     if (onLeaveGroup && confirm("Are you sure you want to leave this group?")) {
//       try {
//         const success = await onLeaveGroup();
//         if (success) {
//           console.log("Left group successfully");
//         }
//       } catch (error) {
//         console.error("Failed to leave group:", error);
//       }
//     }
//   };

//   return (
//     <div className="bg-white border-b border-gray-200 px-4 py-3">
//       <div className="flex items-center justify-between">
//         {/* Left side - Contact/Group info */}
//         <div className="flex items-center space-x-3">
//           {/* Avatar */}
//           <div className="relative">
//             <img
//               src={contact.avatar || contact.profilePicture || 
//                 `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=01aa85&color=fff`}
//               alt={contact.name}
//               className="w-10 h-10 rounded-full object-cover"
//             />
//             {/* Online indicator - only for direct chats */}
//             {!isGroupChat && contact.isOnline && (
//               <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
//             )}
//           </div>

//           {/* Contact/Group details */}
//           <div className="flex-1">
//             <h3 className="font-semibold text-gray-900 truncate">
//               {contact.name}
//             </h3>
            
//             {/* ✅ Enhanced status for groups */}
//             <p className="text-sm text-gray-500">
//               {isGroupChat ? (
//                 isTyping ? (
//                   <span className="text-green-600">
//                     {typeof isTyping === 'boolean' ? 'Someone is typing...' : isTyping}
//                   </span>
//                 ) : (
//                   <span>
//                     {participantCount} participants
//                     {onlineCount > 0 && `, ${onlineCount} online`}
//                   </span>
//                 )
//               ) : (
//                 isTyping ? (
//                   <span className="text-green-600">typing...</span>
//                 ) : (
//                   contact.status || (contact.isOnline ? "Online" : "Offline")
//                 )
//               )}
//             </p>
//           </div>
//         </div>

//         {/* Right side - Action buttons */}
//         <div className="flex items-center space-x-2">
//           {/* ✅ Group-specific actions */}
//           {isGroupChat ? (
//             <>
//               {/* Group info button */}
//               <button
//                 onClick={onShowGroupInfo}
//                 className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
//                 title="Group info"
//               >
//                 👥
//               </button>
              
//               {/* Group call button */}
//               <button
//                 onClick={onVideoCall}
//                 className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
//                 title="Group video call"
//               >
//                 📹
//               </button>

//               {/* Group menu */}
//               <div className="relative group">
//                 <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
//                   ⋮
//                 </button>
                
//                 {/* Dropdown menu */}
//                 <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
//                   <div className="py-2">
//                     <button 
//                       onClick={onShowGroupInfo}
//                       className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
//                     >
//                       Group Info
//                     </button>
                    
//                     {canManageGroup && (
//                       <>
//                         <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
//                           Edit Group
//                         </button>
//                         <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
//                           Add Participants
//                         </button>
//                       </>
//                     )}
                    
//                     <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
//                       Group Media
//                     </button>
                    
//                     <hr className="my-1" />
                    
//                     <button 
//                       onClick={handleLeaveGroup}
//                       className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
//                     >
//                       Leave Group
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </>
//           ) : (
//             <>
//               {/* Direct chat actions */}
//               <button
//                 onClick={onVideoCall}
//                 className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
//                 title="Video call"
//               >
//                 📹
//               </button>
              
//               <button
//                 onClick={onVoiceCall}
//                 className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
//                 title="Voice call"
//               >
//                 📞
//               </button>
              
//               <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
//                 ⋮
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ✅ Group typing indicator banner */}
//       {isGroupChat && isTyping && (
//         <div className="mt-2 text-xs text-green-600 animate-pulse">
//           {typeof isTyping === 'string' ? isTyping : 'Someone is typing...'}
//         </div>
//       )}
//     </div>
//   );
// }