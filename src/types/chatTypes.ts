


// types/chatTypes.ts

export type MessageType = 'text' | 'image' | 'file' | 'video'; 


export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  createdAt: string;
  isSent?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  reaction?: string;
  avatar?: string;
  isRead?: boolean;
  isDelivered?: boolean;
  isError?: boolean;
  channelId: string; 
  replyTo?: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface ChatUser {
  id?: string;
  _id?: string;
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
  email?: string;
  lastSeen?: string;
}

export interface ChatAreaProps {
  contact: ChatUser;
  channelId: string;
  receiverId: string;
  currentUserId: string;
  senderId: string;
  currentUserName: string;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
}

export interface UserProfile {
  _id: string;
  mobileNumber: string;
  name: string;
  isVerified: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  profilePicture?: string;  
  profilePicturePublicId?: string;  
  status?: string;  
   avatar?: string;
}

export interface BaseMessage {
  _id: string;
  senderId: string | { _id: string; name?: string; username?: string };
  receiverId: string;
  content: string;
  type: MessageType;
  createdAt: string;
  channelId?: string;
}



export interface ApiMessage extends BaseMessage {

  _id: string;
  // senderId?: string;
  receiverId: string;
  content: string;
  type: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  channelId: string;
  createdAt: string;
  isRead?: boolean;
  isDelivered?: boolean;
  updatedAt?: string;
  __v?: number;
  isSent?: boolean;
  isError?: boolean;
    replyTo?: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
} 




export interface ApiResponse {
  success: boolean
  data: UserProfile
  message: string
  timestamp: string
}