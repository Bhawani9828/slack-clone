import { io, type Socket } from "socket.io-client"
import Cookies from "js-cookie"

export interface GroupMessage {
  _id: string
  groupId: string
  senderId: string
  content: string
  type: "text" | "image" | "video" | "file"
  replyTo?: string
  readBy?: string[]
  createdAt: string
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
  fileUrl?: string
  fileName?: string
  fileSize?: string
  isForwarded?: boolean
  forwardedFrom?: string
}

export interface Group {
  _id: string
  name: string
  description?: string
  groupImage?: string
  participants: any[]
  admins: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  unreadCount?: number
  lastMessage?: GroupMessage
}

export interface SendGroupMessagePayload {
  groupId: string
  channelId?: string
  content: string
  type: "text" | "image" | "video" | "file"
  replyTo?: string
  fileUrl?: string
  fileName?: string
  fileSize?: string
}

export interface CreateGroupPayload {
  name: string
  description?: string
  participants: string[]
  groupImage?: string
}

export interface UpdateGroupPayload {
  name?: string
  description?: string
  groupImage?: string
}

class GroupChatSocketService {
  private socket: Socket | null = null
  private currentUserId: string | null = null
  private joinedGroups: Set<string> = new Set()
  private reconnectionAttempts = 0
  private maxReconnectionAttempts = 3
  private isConnecting = false

  constructor() {
    // Load userId from localStorage on service init
    if (typeof window !== "undefined") {
      const savedUserId = localStorage.getItem("currentUserId");
      if (savedUserId) {
        this.currentUserId = savedUserId;
      }
    }
  }

  async forceReconnect(): Promise<Socket> {
    if (!this.currentUserId) {
      throw new Error("User ID not set for force reconnect")
    }

    if (this.socket) {
      console.log("🔄 Forcing socket reconnection...")
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    return this.connect(this.currentUserId)
  }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUserId", userId);
    }
  }

  getCurrentUserId(): string | null {
    if (this.currentUserId) return this.currentUserId;
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentUserId");
    }
    return null;
  }

  async connect(currentUserId: string): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      console.log("⚡ Already connected to group chat socket");
      return this.socket;
    }

    const rawToken = Cookies.get("auth_token");
    console.log("🍪 Raw token from cookies:", rawToken);

    if (!rawToken) {
      throw new Error("No auth token found in cookies");
    }

    // Remove "Bearer " if present
    const cleanToken = rawToken.replace(/^Bearer\s+/i, "").trim();
    console.log("🧹 Clean token (without Bearer):", cleanToken);

    return new Promise<Socket>((resolve, reject) => {
      this.socket = io(`${process.env.NEXT_PUBLIC_API_URL}/group-chat`, {
        transports: ["websocket"],
        forceNew: true,
        auth: {
          token: cleanToken,
        },
      });

      this.socket.on("connect", () => {
        console.log("✅ Connected to group chat socket, ID:", this.socket?.id);
        this.setupSocketEventHandlers();
        resolve(this.socket!);
      });

      this.socket.on("connect_error", (err) => {
        console.error("❌ Group chat connection failed:", err.message);
        reject(err);
      });

      this.socket.on("disconnect", (reason) => {
        console.warn("⚠️ Disconnected from group chat socket:", reason);
      });
    });
  }

  private setupSocketEventHandlers() {
    if (!this.socket) return

    this.socket.on("connect", () => {
      console.log("✅ Connected to group-chat namespace")
      this.reconnectionAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Group chat disconnected:", reason)
      this.joinedGroups.clear()
    })

    this.socket.on("connect_error", (error) => {
      console.error("🚨 Group chat connection error:", error)
    })

    this.socket.on("groupChatConnected", (data) => {
      console.log("🎉 Backend confirmed group chat connection:", data)
    })

    this.socket.on("groupChatError", (error) => {
      console.error("🚨 Group chat error from backend:", error)
    })
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting group chat socket...")
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.joinedGroups.clear()
      this.reconnectionAttempts = 0
      this.isConnecting = false
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // ===== GROUP MANAGEMENT =====
  
  async createGroup(data: CreateGroupPayload): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      console.log("🔄 Socket not connected, attempting to connect...");

      if (!this.currentUserId) {
        throw new Error("User ID not set. Please call setCurrentUser() before creating a group.");
      }

      await this.connect(this.currentUserId);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (!this.socket?.connected) {
        throw new Error("Failed to establish socket connection");
      }
    }

    if (!data.name?.trim()) {
      throw new Error("Group name is required");
    }

    if (!data.participants || data.participants.length === 0) {
      throw new Error("At least one participant is required");
    }

    console.log("📤 Creating group via REST API...");
    return this.createGroupViaAPI(data);
  }

  async createGroupViaAPI(data: CreateGroupPayload): Promise<any> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description?.trim() || "",
          participants: data.participants,
          groupImage: data.groupImage || "",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Failed with status ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("❌ REST API error:", error);
      throw error;
    }
  }

  // Get user's groups
  getUserGroups(): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getUserGroups");
  }

  // Get specific group by ID
  getGroupById(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupById", { groupId });
  }

  // Update group information
  updateGroup(groupId: string, updates: UpdateGroupPayload): void {
    if (!this.socket?.connected) return;
    this.socket.emit("updateGroup", { groupId, updates });
  }

  // Add participants to group
  addParticipants(groupId: string, participants: string[]): void {
    if (!this.socket?.connected) return;
    this.socket.emit("addParticipants", { groupId, participants });
  }

  // Remove participant from group
  removeParticipant(groupId: string, participantId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("removeParticipant", { groupId, participantId });
  }

  // Change admin status
  changeAdminStatus(groupId: string, userId: string, makeAdmin: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit("changeAdminStatus", { groupId, userId, makeAdmin });
  }

  // Leave group
  leaveGroupPermanently(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("leaveGroup", { groupId });
  }

  // Delete group (admin only)
  deleteGroup(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("deleteGroup", { groupId });
  }

  // Search groups
  searchGroups(query: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("searchGroups", { query });
  }

  // Get group statistics
  getGroupStats(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupStats", { groupId });
  }

  // ===== ROOM MANAGEMENT =====
  
  joinGroup(groupId: string) {
    if (!this.socket) return
    if (!this.socket.connected) {
      console.error("❌ Cannot join group: Socket not connected")
      return
    }

    if (this.joinedGroups.has(groupId)) {
      console.log(`ℹ️ Already in group room: ${groupId}`)
      return
    }

    this.socket.emit("joinGroupRoom", {
      userId: this.currentUserId,
      groupId,
    })
    this.joinedGroups.add(groupId)
    console.log(`🔗 Joined group room: ${groupId}`)
  }

  leaveGroup(groupId: string) {
    if (!this.socket) return
    if (!this.joinedGroups.has(groupId)) return

    this.socket.emit("leaveGroupRoom", {
      userId: this.currentUserId,
      groupId,
    })
    this.joinedGroups.delete(groupId)
    console.log(`🚪 Left group room: ${groupId}`)
  }

  // ===== MESSAGE MANAGEMENT =====
  
  sendGroupMessage(message: SendGroupMessagePayload): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error("Socket not connected when trying to send group message")
        reject("Socket not connected")
        return
      }

      if (!message.content && !message.fileUrl) {
        reject("Either content or fileUrl must be provided")
        return
      }

      console.log("📤 Sending group message:", message)

      this.socket.emit("sendGroupMessage", message, (response: any) => {
        console.log("📤 Send group message response:", response)
        if (response?.error) {
          console.error("Send group message error:", response.error)
          reject(response.error)
        } else if (response?.messageId) {
          resolve(response.messageId)
        } else {
          resolve("")
        }
      })
    })
  }

  // Get group messages with pagination
  getGroupMessages(groupId: string, page: number = 1, limit: number = 50): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupMessages", { groupId, page, limit });
  }

  // Delete specific group message
  deleteGroupMessage(groupId: string, messageId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("deleteGroupMessage", { groupId, messageId });
  }

 

deleteGroupMessageForMe(groupId: string, messageId: string) {
  if (!this.socket) return
  this.socket.emit("deleteGroupMessageForMe", { groupId, messageId })
}

  // Mark messages as read
  markGroupMessagesAsRead(groupId: string, messageIds?: string[]): void {
    if (!this.socket?.connected) return;
    
    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as read
      this.socket.emit("markGroupMessagesAsRead", { groupId, messageIds });
    } else {
      // Mark all messages as read
      this.socket.emit("markGroupMessagesAsRead", { groupId });
    }
  }

  // ===== UTILITY MESSAGE METHODS =====
  
  async sendTextMessage(groupId: string, content: string, replyTo?: string): Promise<string> {
    return this.sendGroupMessage({
      groupId,
      content,
      type: "text",
      replyTo,
    })
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
    })
  }

  // ===== TYPING INDICATORS =====
  
  startGroupTyping(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("groupTypingStart", { groupId });
  }

  stopGroupTyping(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("groupTypingStop", { groupId });
  }

  sendTypingIndicator(groupId: string, isTyping: boolean) {
    if (isTyping) {
      this.startGroupTyping(groupId);
    } else {
      this.stopGroupTyping(groupId);
    }
  }

  // ===== ONLINE STATUS =====
  
  getGroupOnlineUsers(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupOnlineUsers", { groupId });
  }

  // ===== MESSAGE REACTIONS =====
  
  addGroupMessageReaction(groupId: string, messageId: string, reaction: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("addGroupMessageReaction", { groupId, messageId, reaction });
  }

  // ===== EVENT LISTENERS =====

  // Group Management Events
  onGroupCreated(callback: (group: any) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (group: any) => {
      console.log("📨 Group created event received:", group)
      callback(group)
    }
    this.socket.on("groupCreated", handler)
    return () => this.socket?.off("groupCreated", handler)
  }

  onUserGroups(callback: (data: { success: boolean; data: Group[] }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group[] }) => callback(data)
    this.socket.on("userGroups", handler)
    return () => this.socket?.off("userGroups", handler)
  }

  onGroupDetails(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group }) => callback(data)
    this.socket.on("groupDetails", handler)
    return () => this.socket?.off("groupDetails", handler)
  }

  onGroupUpdated(callback: (data: { groupId: string; updates: any; updatedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; updates: any; updatedBy: string; timestamp: string }) => callback(data)
    this.socket.on("groupUpdated", handler)
    return () => this.socket?.off("groupUpdated", handler)
  }

  onParticipantsAdded(callback: (data: { groupId: string; newParticipants: string[]; addedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; newParticipants: string[]; addedBy: string; timestamp: string }) => callback(data)
    this.socket.on("participantsAdded", handler)
    return () => this.socket?.off("participantsAdded", handler)
  }

  onParticipantRemoved(callback: (data: { groupId: string; removedParticipant: string; removedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; removedParticipant: string; removedBy: string; timestamp: string }) => callback(data)
    this.socket.on("participantRemoved", handler)
    return () => this.socket?.off("participantRemoved", handler)
  }

  onRemovedFromGroup(callback: (data: { groupId: string; removedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; removedBy: string; timestamp: string }) => callback(data)
    this.socket.on("removedFromGroup", handler)
    return () => this.socket?.off("removedFromGroup", handler)
  }

  onAdminStatusChanged(callback: (data: { groupId: string; userId: string; isAdmin: boolean; changedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; userId: string; isAdmin: boolean; changedBy: string; timestamp: string }) => callback(data)
    this.socket.on("adminStatusChanged", handler)
    return () => this.socket?.off("adminStatusChanged", handler)
  }

  onParticipantLeft(callback: (data: { groupId: string; leftParticipant: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; leftParticipant: string; timestamp: string }) => callback(data)
    this.socket.on("participantLeft", handler)
    return () => this.socket?.off("participantLeft", handler)
  }

  onGroupDeleted(callback: (data: { groupId: string; deletedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; deletedBy: string; timestamp: string }) => callback(data)
    this.socket.on("groupDeleted", handler)
    return () => this.socket?.off("groupDeleted", handler)
  }

  onGroupSearchResults(callback: (data: { success: boolean; data: Group[] }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group[] }) => callback(data)
    this.socket.on("groupSearchResults", handler)
    return () => this.socket?.off("groupSearchResults", handler)
  }

  onGroupStats(callback: (data: { success: boolean; data: any }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: any }) => callback(data)
    this.socket.on("groupStats", handler)
    return () => this.socket?.off("groupStats", handler)
  }

  // Message Events
  onMessageReceived(callback: (message: GroupMessage) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (message: GroupMessage) => callback(message)
    this.socket.on("receiveGroupMessage", handler)
    return () => this.socket?.off("receiveGroupMessage", handler)
  }

  onGroupMessages(callback: (data: { success: boolean; data: GroupMessage[]; pagination: any }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: GroupMessage[]; pagination: any }) => callback(data)
    this.socket.on("groupMessages", handler)
    return () => this.socket?.off("groupMessages", handler)
  }

  onMessageSentConfirmation(callback: (data: { messageId: string; groupId: string; success?: boolean }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { messageId: string; groupId: string; success?: boolean }) => callback(data)
    this.socket.on("groupMessageSent", handler)
    return () => this.socket?.off("groupMessageSent", handler)
  }

  onGroupMessageDeleted(callback: (data: { groupId: string; messageId: string; deletedBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; messageId: string; deletedBy: string; timestamp: string }) => callback(data)
    this.socket.on("groupMessageDeleted", handler)
    return () => this.socket?.off("groupMessageDeleted", handler)
  }

  onMessagesRead(callback: (data: { messageIds: string[]; groupId: string; readBy: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { messageIds: string[]; groupId: string; readBy: string }) => callback(data)
    this.socket.on("groupMessagesRead", handler)
    return () => this.socket?.off("groupMessagesRead", handler)
  }

  onAllMessagesRead(callback: (data: { groupId: string; readBy: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; readBy: string; timestamp: string }) => callback(data)
    this.socket.on("allGroupMessagesRead", handler)
    return () => this.socket?.off("allGroupMessagesRead", handler)
  }

  // Room Events
  onJoinedGroup(callback: (data: { groupId: string; groupName: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; groupName: string }) => callback(data)
    this.socket.on("joinedGroupRoom", handler)
    return () => this.socket?.off("joinedGroupRoom", handler)
  }

  onLeftGroup(callback: (data: { groupId: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string }) => callback(data)
    this.socket.on("leftGroupRoom", handler)
    return () => this.socket?.off("leftGroupRoom", handler)
  }

  // Typing Events
  onUserTyping(callback: (data: { groupId: string; userId: string; userName: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; userId: string; userName: string; timestamp: string }) => callback(data)
    this.socket.on("groupUserTyping", handler)
    return () => this.socket?.off("groupUserTyping", handler)
  }

  onUserStoppedTyping(callback: (data: { groupId: string; userId: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; userId: string; timestamp: string }) => callback(data)
    this.socket.on("groupUserStoppedTyping", handler)
    return () => this.socket?.off("groupUserStoppedTyping", handler)
  }

  // Online Status Events
  onGroupOnlineUsers(callback: (data: { groupId: string; onlineUsers: string[]; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; onlineUsers: string[]; timestamp: string }) => callback(data)
    this.socket.on("groupOnlineUsers", handler)
    return () => this.socket?.off("groupOnlineUsers", handler)
  }

  // Reaction Events
  onGroupMessageReactionAdded(callback: (data: { groupId: string; messageId: string; reaction: string; userId: string; timestamp: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { groupId: string; messageId: string; reaction: string; userId: string; timestamp: string }) => callback(data)
    this.socket.on("groupMessageReactionAdded", handler)
    return () => this.socket?.off("groupMessageReactionAdded", handler)
  }

  // Error Events
  onGroupError(callback: (data: { error: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (errorData: { error: string }) => {
      console.error("📨 Group error event received:", errorData)
      callback(errorData)
    }
    this.socket.on("groupChatError", handler)
    return () => this.socket?.off("groupChatError", handler)
  }

  // Acknowledgment Events
  onGroupCreatedAck(callback: (data: { success: boolean; group: Group }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; group: Group }) => callback(data)
    this.socket.on("groupCreatedAck", handler)
    return () => this.socket?.off("groupCreatedAck", handler)
  }

  onGroupUpdateAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group }) => callback(data)
    this.socket.on("groupUpdateAck", handler)
    return () => this.socket?.off("groupUpdateAck", handler)
  }

  onParticipantsAddedAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group }) => callback(data)
    this.socket.on("participantsAddedAck", handler)
    return () => this.socket?.off("participantsAddedAck", handler)
  }

  onParticipantRemovedAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group }) => callback(data)
    this.socket.on("participantRemovedAck", handler)
    return () => this.socket?.off("participantRemovedAck", handler)
  }

  onAdminStatusChangedAck(callback: (data: { success: boolean; data: Group }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: Group }) => callback(data)
    this.socket.on("adminStatusChangedAck", handler)
    return () => this.socket?.off("adminStatusChangedAck", handler)
  }

  onLeftGroupAck(callback: (data: { success: boolean; groupId: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; groupId: string }) => callback(data)
    this.socket.on("leftGroupAck", handler)
    return () => this.socket?.off("leftGroupAck", handler)
  }

  onGroupDeletedAck(callback: (data: { success: boolean; groupId: string }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; groupId: string }) => callback(data)
    this.socket.on("groupDeletedAck", handler)
    return () => this.socket?.off("groupDeletedAck", handler)
  }

  onGroupMessageDeletedAck(callback: (data: { success: boolean; data: any }) => void): () => void {
    if (!this.socket) return () => {}
    const handler = (data: { success: boolean; data: any }) => callback(data)
    this.socket.on("groupMessageDeletedAck", handler)
    return () => this.socket?.off("groupMessageDeletedAck", handler)
  }

  // ===== UTILITY METHODS =====

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

  removeAllListeners() {
    this.socket?.removeAllListeners()
  }

  removeListener(event: string) {
    this.socket?.off(event)
  }

  removeListeners(events: string[]) {
    events.forEach((event) => this.socket?.off(event))
  }



  // Enhanced debugging
  debugAuth() {
    const authToken = Cookies.get("auth_token")
    console.log("🔍 Group Chat Debug Auth Info:")
    console.log("- Current User ID:", this.currentUserId)
    console.log("- Auth Token Present:", !!authToken)
    console.log("- Token Format:", authToken?.startsWith("Bearer ") ? "Bearer format" : "Raw token")
    console.log("- Token (first 30 chars):", authToken?.substring(0, 30) + "...")
    console.log("- Socket Connected:", this.isConnected())
    console.log("- Socket ID:", this.socket?.id)
    console.log("- Joined Groups:", Array.from(this.joinedGroups))
    console.log("- API URL:", process.env.NEXT_PUBLIC_API_URL)

    return {
      hasToken: !!authToken,
      hasUserId: !!this.currentUserId,
      isConnected: this.isConnected(),
      socketId: this.socket?.id,
      joinedGroups: Array.from(this.joinedGroups),
      tokenFormat: authToken?.startsWith("Bearer ") ? "Bearer format" : "Raw token",
    }
  }

  // Get service status
  getStatus() {
    return
  }

}
const serviceInstance = new GroupChatSocketService()

// Multiple export patterns to ensure system recognition
export const groupChatSocketService = serviceInstance
export default serviceInstance
