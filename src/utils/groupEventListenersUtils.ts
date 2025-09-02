// utils/groupEventListenersUtils.ts
import { Socket } from 'socket.io-client';

export interface Group {
  _id: string;
  name: string;
  description?: string;
  groupImage?: string;
  participants: any[];
  admins: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  lastMessage?: any;
}

export interface GroupMessage {
  _id: string;
  groupId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  replyTo?: string;
  readBy?: string[];
  createdAt: string;
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export class GroupEventListenersUtils {
  constructor(private socket: Socket | null) {}

  updateSocket(socket: Socket | null) {
    this.socket = socket;
  }

  // Group Management Events
  onGroupCreated(callback: (group: any) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (group: any) => {
      console.log("Group created event received:", group);
      callback(group);
    };
    this.socket.on("groupCreated", handler);
    return () => this.socket?.off("groupCreated", handler);
  }

  onUserGroups(callback: (data: { success: boolean; data: Group[] }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group[] }) => callback(data);
    this.socket.on("userGroups", handler);
    return () => this.socket?.off("userGroups", handler);
  }

  onGroupDetails(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group }) => callback(data);
    this.socket.on("groupDetails", handler);
    return () => this.socket?.off("groupDetails", handler);
  }

  onGroupUpdated(callback: (data: { groupId: string; updates: any; updatedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; updates: any; updatedBy: string; timestamp: string }) => callback(data);
    this.socket.on("groupUpdated", handler);
    return () => this.socket?.off("groupUpdated", handler);
  }

  onParticipantsAdded(callback: (data: { groupId: string; newParticipants: string[]; addedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; newParticipants: string[]; addedBy: string; timestamp: string }) => callback(data);
    this.socket.on("participantsAdded", handler);
    return () => this.socket?.off("participantsAdded", handler);
  }

  onParticipantRemoved(callback: (data: { groupId: string; removedParticipant: string; removedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; removedParticipant: string; removedBy: string; timestamp: string }) => callback(data);
    this.socket.on("participantRemoved", handler);
    return () => this.socket?.off("participantRemoved", handler);
  }

  onRemovedFromGroup(callback: (data: { groupId: string; removedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; removedBy: string; timestamp: string }) => callback(data);
    this.socket.on("removedFromGroup", handler);
    return () => this.socket?.off("removedFromGroup", handler);
  }

  onAdminStatusChanged(callback: (data: { groupId: string; userId: string; isAdmin: boolean; changedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; userId: string; isAdmin: boolean; changedBy: string; timestamp: string }) => callback(data);
    this.socket.on("adminStatusChanged", handler);
    return () => this.socket?.off("adminStatusChanged", handler);
  }

  onParticipantLeft(callback: (data: { groupId: string; leftParticipant: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; leftParticipant: string; timestamp: string }) => callback(data);
    this.socket.on("participantLeft", handler);
    return () => this.socket?.off("participantLeft", handler);
  }

  onGroupDeleted(callback: (data: { groupId: string; deletedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; deletedBy: string; timestamp: string }) => callback(data);
    this.socket.on("groupDeleted", handler);
    return () => this.socket?.off("groupDeleted", handler);
  }

  onGroupSearchResults(callback: (data: { success: boolean; data: Group[] }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group[] }) => callback(data);
    this.socket.on("groupSearchResults", handler);
    return () => this.socket?.off("groupSearchResults", handler);
  }

  onGroupStats(callback: (data: { success: boolean; data: any }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: any }) => callback(data);
    this.socket.on("groupStats", handler);
    return () => this.socket?.off("groupStats", handler);
  }

  // Message Events
  onMessageReceived(callback: (message: GroupMessage) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (message: GroupMessage) => callback(message);
    this.socket.on("receiveGroupMessage", handler);
    return () => this.socket?.off("receiveGroupMessage", handler);
  }

  onGroupMessages(callback: (data: { success: boolean; data: GroupMessage[]; pagination: any }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: GroupMessage[]; pagination: any }) => callback(data);
    this.socket.on("groupMessages", handler);
    return () => this.socket?.off("groupMessages", handler);
  }

  onMessageSentConfirmation(callback: (data: { messageId: string; groupId: string; success?: boolean }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { messageId: string; groupId: string; success?: boolean }) => callback(data);
    this.socket.on("groupMessageSent", handler);
    return () => this.socket?.off("groupMessageSent", handler);
  }

  onGroupMessageDeleted(callback: (data: { groupId: string; messageId: string; deletedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; messageId: string; deletedBy: string; timestamp: string }) => callback(data);
    this.socket.on("groupMessageDeleted", handler);
    return () => this.socket?.off("groupMessageDeleted", handler);
  }

  onMessagesRead(callback: (data: { messageIds: string[]; groupId: string; readBy: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { messageIds: string[]; groupId: string; readBy: string }) => callback(data);
    this.socket.on("groupMessagesRead", handler);
    return () => this.socket?.off("groupMessagesRead", handler);
  }

  onAllMessagesRead(callback: (data: { groupId: string; readBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; readBy: string; timestamp: string }) => callback(data);
    this.socket.on("allGroupMessagesRead", handler);
    return () => this.socket?.off("allGroupMessagesRead", handler);
  }

  // Room Events
  onJoinedGroup(callback: (data: { groupId: string; groupName: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; groupName: string }) => callback(data);
    this.socket.on("joinedGroupRoom", handler);
    return () => this.socket?.off("joinedGroupRoom", handler);
  }

  onLeftGroup(callback: (data: { groupId: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string }) => callback(data);
    this.socket.on("leftGroupRoom", handler);
    return () => this.socket?.off("leftGroupRoom", handler);
  }

  // Typing Events
  onUserTyping(callback: (data: { groupId: string; userId: string; userName: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; userId: string; userName: string; timestamp: string }) => callback(data);
    this.socket.on("groupUserTyping", handler);
    return () => this.socket?.off("groupUserTyping", handler);
  }

  onUserStoppedTyping(callback: (data: { groupId: string; userId: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; userId: string; timestamp: string }) => callback(data);
    this.socket.on("groupUserStoppedTyping", handler);
    return () => this.socket?.off("groupUserStoppedTyping", handler);
  }

  // Online Status Events
  onGroupOnlineUsers(callback: (data: { groupId: string; onlineUsers: string[]; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; onlineUsers: string[]; timestamp: string }) => callback(data);
    this.socket.on("groupOnlineUsers", handler);
    return () => this.socket?.off("groupOnlineUsers", handler);
  }

  // Reaction Events
  onGroupMessageReactionAdded(callback: (data: { groupId: string; messageId: string; reaction: string; userId: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { groupId: string; messageId: string; reaction: string; userId: string; timestamp: string }) => callback(data);
    this.socket.on("groupMessageReactionAdded", handler);
    return () => this.socket?.off("groupMessageReactionAdded", handler);
  }

  // Error Events
  onGroupError(callback: (data: { error: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (errorData: { error: string }) => {
      console.error("Group error event received:", errorData);
      callback(errorData);
    };
    this.socket.on("groupChatError", handler);
    return () => this.socket?.off("groupChatError", handler);
  }

  // Acknowledgment Events
  onGroupCreatedAck(callback: (data: { success: boolean; group: Group }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; group: Group }) => callback(data);
    this.socket.on("groupCreatedAck", handler);
    return () => this.socket?.off("groupCreatedAck", handler);
  }

  onGroupUpdateAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group }) => callback(data);
    this.socket.on("groupUpdateAck", handler);
    return () => this.socket?.off("groupUpdateAck", handler);
  }

  onParticipantsAddedAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group }) => callback(data);
    this.socket.on("participantsAddedAck", handler);
    return () => this.socket?.off("participantsAddedAck", handler);
  }

  onParticipantRemovedAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group }) => callback(data);
    this.socket.on("participantRemovedAck", handler);
    return () => this.socket?.off("participantRemovedAck", handler);
  }

  onAdminStatusChangedAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: Group }) => callback(data);
    this.socket.on("adminStatusChangedAck", handler);
    return () => this.socket?.off("adminStatusChangedAck", handler);
  }

  onLeftGroupAck(callback: (data: { success: boolean; groupId: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; groupId: string }) => callback(data);
    this.socket.on("leftGroupAck", handler);
    return () => this.socket?.off("leftGroupAck", handler);
  }

  onGroupDeletedAck(callback: (data: { success: boolean; groupId: string }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; groupId: string }) => callback(data);
    this.socket.on("groupDeletedAck", handler);
    return () => this.socket?.off("groupDeletedAck", handler);
  }

  onGroupMessageDeletedAck(callback: (data: { success: boolean; data: any }) => void): () => void {
    if (!this.socket) return () => {};
    const handler = (data: { success: boolean; data: any }) => callback(data);
    this.socket.on("groupMessageDeletedAck", handler);
    return () => this.socket?.off("groupMessageDeletedAck", handler);
  }

  // Utility methods for listener management
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  removeListener(event: string): void {
    this.socket?.off(event);
  }

  removeListeners(events: string[]): void {
    events.forEach((event) => this.socket?.off(event));
  }
}