// utils/groupManagementUtils.ts
import { Socket } from 'socket.io-client';
import { postApi } from '@/axios/apiService';

export interface CreateGroupPayload {
  name: string;
  description?: string;
  participants: string[];
  groupImage?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  groupImage?: string;
}

export class GroupManagementUtils {
  constructor(private socket: Socket | null) {}

  updateSocket(socket: Socket | null) {
    this.socket = socket;
  }

  async createGroup(data: CreateGroupPayload, currentUserId: string | null): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error("Socket not connected");
    }

    if (!data.name?.trim()) {
      throw new Error("Group name is required");
    }

    if (!data.participants || data.participants.length === 0) {
      throw new Error("At least one participant is required");
    }

    console.log("Creating group via REST API...");
    return this.createGroupViaAPI(data);
  }

  async createGroupViaAPI(data: CreateGroupPayload): Promise<any> {
    try {
      console.log("Creating group via REST API...", data);
      
      const result = await postApi('/groups', {
        name: data.name.trim(),
        description: data.description?.trim() || "",
        participants: data.participants,
        groupImage: data.groupImage || "",
      });

      console.log("Group created successfully:", result);
      return result;
    } catch (error: any) {
      console.error("REST API error:", error);
      throw error;
    }
  }

  getUserGroups(): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getUserGroups");
  }

  getGroupById(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupById", { groupId });
  }

  updateGroup(groupId: string, updates: UpdateGroupPayload): void {
    if (!this.socket?.connected) return;
    this.socket.emit("updateGroup", { groupId, updates });
  }

  addParticipants(groupId: string, participants: string[]): void {
    if (!this.socket?.connected) return;
    this.socket.emit("addParticipants", { groupId, participants });
  }

  removeParticipant(groupId: string, participantId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("removeParticipant", { groupId, participantId });
  }

  changeAdminStatus(groupId: string, userId: string, makeAdmin: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit("changeAdminStatus", { groupId, userId, makeAdmin });
  }

  leaveGroupPermanently(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("leaveGroup", { groupId });
  }

  deleteGroup(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("deleteGroup", { groupId });
  }

  searchGroups(query: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("searchGroups", { query });
  }

  getGroupStats(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupStats", { groupId });
  }

  // Room management
  joinGroupRoom(groupId: string, currentUserId: string | null, joinedGroups: Set<string>) {
    if (!this.socket) return false;
    if (!this.socket.connected) {
      console.error("Cannot join group: Socket not connected");
      return false;
    }

    if (joinedGroups.has(groupId)) {
      console.log(`Already in group room: ${groupId}`);
      return false;
    }

    this.socket.emit("joinGroupRoom", {
      userId: currentUserId,
      groupId,
    });
    joinedGroups.add(groupId);
    console.log(`Joined group room: ${groupId}`);
    return true;
  }

  leaveGroupRoom(groupId: string, currentUserId: string | null, joinedGroups: Set<string>) {
    if (!this.socket) return false;
    if (!joinedGroups.has(groupId)) return false;

    this.socket.emit("leaveGroupRoom", {
      userId: currentUserId,
      groupId,
    });
    joinedGroups.delete(groupId);
    console.log(`Left group room: ${groupId}`);
    return true;
  }

  getGroupOnlineUsers(groupId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit("getGroupOnlineUsers", { groupId });
  }
}