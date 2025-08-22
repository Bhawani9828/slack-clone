


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
  clientMessageId?: string;
}

// ✅ Add GroupMessage interface
export interface GroupMessage {
  _id: string;
  senderId: string;
  groupId: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  createdAt: string;
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  replyTo?: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

// ✅ Add GroupInfo interface
export interface GroupInfo {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  participants: Array<{
    userId: string;
    role: "admin" | "member";
    joinedAt: string;
  }>;
  admins: string[];
  groupImage?: string;
    avatar?: string; 
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: { 
    content: string; 
    senderId: string; 
    createdAt: string; 
  };
  unreadCount?: number;
}


// ✅ Add CreateGroupData interface
export interface CreateGroupData {
  name: string;
  description?: string;
  participants: string[];
  groupImage?: string;
}

// ✅ Add UpdateGroupData interface
export interface UpdateGroupData {
  name?: string;
  description?: string;
  groupImage?: string;
}

// ✅ Add GroupStats interface
export interface GroupStats {
  totalMessages: number;
  totalParticipants: number;
  totalFiles: number;
  totalImages: number;
  messagesByType: Record<string, number>;
  participantStats: Array<{
    userId: string;
    messageCount: number;
    lastActivity: string;
  }>;
}

export interface ChatUser {
  id: string;
  _id?: string;
  name: string;
  username?: string;
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

export interface ChatGroup {
  id?: string;
  _id?: string;
  name: string;              
  description?: string;      
  avatar?: string;           
  members?: ChatUser[];        
  adminId?: string;          
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;      
  time?: string; 
  unreadCount?: number;             
}

// ✅ Updated ChatAreaProps with group support
export interface ChatAreaProps {
  contact: ChatUser | ChatGroup;
  channelId: string;
  receiverId: string;
  currentUserId: string;
  senderId: string;
  currentUserName: string;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  
  // ✅ Add these new group chat props
  groupInfo?: GroupInfo | null;
  isGroupChat?: boolean;
  groupMessages?: GroupMessage[];
  typingUsers?: string[];
  onlineUsers?: string[];
  onSendGroupMessage?: (content: string, type?: "text" | "image" | "video" | "file") => Promise<void>;
  onGroupTyping?: () => void;
  onGroupStopTyping?: () => void;
  onDeleteGroupMessage?: (messageId: string) => Promise<void>;
  onLoadMoreMessages?: () => Promise<void>;
  isLoadingMessages?: boolean;
  hasMoreMessages?: boolean;
  isCurrentUserAdmin?: boolean;
  canManageGroup?: boolean;
  participantCount?: number;
  onLeaveGroup?: () => Promise<boolean>;
  onAddParticipants?: (participantIds: string[]) => Promise<boolean>;
  onRemoveParticipant?: (participantId: string) => Promise<boolean>;
  onChangeAdminStatus?: (userId: string, makeAdmin: boolean) => Promise<boolean>;
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
 type: "text" | "image" | "file" | "video";
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
  clientMessageId?: string;
} 




export interface ApiResponse {
  success: boolean
  data: UserProfile
  message: string
  timestamp: string
}