// utils/groupMessagingUtils.ts
import { Socket } from 'socket.io-client';

export interface SendGroupMessagePayload {
  groupId: string;
  channelId?: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  replyTo?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
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

export class GroupMessagingUtils {
  constructor(private socket: Socket | null) {}

  updateSocket(socket: Socket | null) {
    this.socket = socket;
  }

  sendGroupMessage(message: SendGroupMessagePayload): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error("Socket not connected when trying to send group message");
        reject("Socket not connected");
        return;
      }

      if (!message.content && !message.fileUrl) {
        reject("Either content or fileUrl must be provided");
        return;
      }

      console.log("Sending group message:", message);

      this.socket.emit("sendGroupMessage", message, (response: any) => {
        console.log("Send group message response:", response);
        if (response?.error) {
          console.error("Send group message error:", response.error);
          reject(response.error);
        } else if (response?.messageId) {
          resolve(response.messageId);
        } else {
          resolve("");
        }
      });
    });
  }

  getGroupMessages(groupId: string, page: number = 1, limit: number = 50): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupMessages", { groupId, page, limit });
  }

  deleteGroupMessage(groupId: string, messageId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("deleteGroupMessage", { groupId, messageId });
  }

  deleteGroupMessageForMe(groupId: string, messageId: string): void {
    if (!this.socket) return;
    this.socket.emit("deleteGroupMessageForMe", { groupId, messageId });
  }

  markGroupMessagesAsRead(groupId: string, messageIds?: string[]): void {
    if (!this.socket?.connected) return;
    
    if (messageIds && messageIds.length > 0) {
      this.socket.emit("markGroupMessagesAsRead", { groupId, messageIds });
    } else {
      this.socket.emit("markGroupMessagesAsRead", { groupId });
    }
  }

  // Utility message methods
  async sendTextMessage(groupId: string, content: string, replyTo?: string): Promise<string> {
    return this.sendGroupMessage({
      groupId,
      content,
      type: "text",
      replyTo,
    });
  }

  async sendFileMessage(
    groupId: string,
    fileUrl: string,
    fileName: string,
    fileSize: string,
    fileType: "image" | "video" | "file" = "file",
    content?: string,
    replyTo?: string
  ): Promise<string> {
    return this.sendGroupMessage({
      groupId,
      content: content || fileName,
      type: fileType,
      fileUrl,
      fileName,
      fileSize,
      replyTo,
    });
  }

  // Typing indicators
  startGroupTyping(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("groupTypingStart", { groupId });
  }

  stopGroupTyping(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("groupTypingStop", { groupId });
  }

  sendTypingIndicator(groupId: string, isTyping: boolean): void {
    if (isTyping) {
      this.startGroupTyping(groupId);
    } else {
      this.stopGroupTyping(groupId);
    }
  }

  // Message reactions
  addGroupMessageReaction(groupId: string, messageId: string, reaction: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("addGroupMessageReaction", { groupId, messageId, reaction });
  }

  // Backward compatibility methods
  startTyping(groupId: string): void {
    this.startGroupTyping(groupId);
  }

  stopTyping(groupId: string): void {
    this.stopGroupTyping(groupId);
  }

  markMessagesAsRead(groupId: string, messageIds: string[]): void {
    this.markGroupMessagesAsRead(groupId, messageIds);
  }
}