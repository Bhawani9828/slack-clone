// utils/chatUtils.ts
import { Socket } from 'socket.io-client';
import { ReplyMessagePayload } from '@/types/chatTypes';
import { DeleteOptions } from '@/types/socketServiceTypes';

export class ChatUtils {
  constructor(private socket: Socket | null) {}

  updateSocket(socket: Socket | null) {
    this.socket = socket;
  }

  async sendMessage(message: any, currentUserId: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('Socket not connected when trying to send message');
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('Sending message via gateway:', message);
      
      const payload = {
        ...message,
        timestamp: Date.now(),
        clientId: `${currentUserId}-${Date.now()}`,
      };

      this.socket.emit('sendMessage', payload, (response: any) => {
        console.log('Send message response:', response);
        if (response?.error) {
          console.error('Send message error:', response.error);
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });

      // this.socket.emit('message:send', payload);
    });
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      console.log(`Sending typing indicator: receiverId=${receiverId}, isTyping=${isTyping}`);
      this.socket.emit('typing', {
        receiverId,
        isTyping,
        timestamp: Date.now(),
      });
      
      this.socket.emit('user:typing', {
        receiverId,
        isTyping,
        timestamp: Date.now(),
      });
    } else {
      console.warn('Cannot send typing indicator: socket not connected');
    }
  }

  markAsRead(messageId: string, senderId: string) {
    if (this.socket && this.socket.connected) {
      console.log(`Marking as read: messageId=${messageId}, senderId=${senderId}`);
      this.socket.emit('markAsRead', {
        messageId,
        senderId,
        readAt: Date.now(),
      });
      
      this.socket.emit('message:mark_read', {
        messageId,
        senderId,
        readAt: Date.now(),
      });
    } else {
      console.warn('Cannot mark as read: socket not connected');
    }
  }

  deleteMessage(messageId: string, options?: DeleteOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onDeleted = (data: any) => {
        if (data?.messageId === messageId) {
          this.socket?.off("messageDeleted", onDeleted);
          resolve();
        }
      };

      this.socket.on("messageDeleted", onDeleted);

      this.socket.emit("deleteMessage", {
        messageId,
        hard: false,
        deletedAt: Date.now(),
        ...options,
      });

      setTimeout(() => {
        this.socket?.off("messageDeleted", onDeleted);
        reject(new Error("Delete timeout"));
      }, 10000);
    });
  }

  forwardMessage(messageId: string, receiverIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onForwarded = (data: any) => {
        if (data?.originalMessageId === messageId) {
          this.socket?.off("messageForwarded", onForwarded);
          resolve();
        }
      };

      this.socket.on("messageForwarded", onForwarded);

      this.socket.emit("forwardMessage", {
        messageId,
        receiverIds,
        timestamp: Date.now(),
      });

      setTimeout(() => {
        this.socket?.off("messageForwarded", onForwarded);
        reject(new Error("Forward timeout"));
      }, 10000);
    });
  }

  replyMessage(payload: ReplyMessagePayload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onDelivered = (data: any) => {
        if (data?.replyTo === payload.originalMessageId) {
          this.socket?.off("messageDelivered", onDelivered);
          resolve();
        }
      };

      this.socket.on("messageDelivered", onDelivered);

      this.socket.emit("replyMessage", {
        ...payload,
       timestamp: payload.timestamp ?? Date.now(),
      });

      setTimeout(() => {
        this.socket?.off("messageDelivered", onDelivered);
        reject(new Error("Reply timeout"));
      }, 10000);
    });
  }

  toggleFavorite(messageId: string, isFavorite: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error("Socket not connected"));
      }

      const onToggled = (data: any) => {
        if (data?.messageId === messageId) {
          this.socket?.off("favoriteToggled", onToggled);
          resolve();
        }
      };

      this.socket.on("favoriteToggled", onToggled);

      this.socket.emit("toggleFavorite", {
        messageId,
        isFavorite,
        timestamp: Date.now(),
      });

      setTimeout(() => {
        this.socket?.off("favoriteToggled", onToggled);
        reject(new Error("Toggle favorite timeout"));
      }, 10000);
    });
  }

    logCopyAction(messageId: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket?.connected) {
        this.socket.emit('messageCopied', {
          messageId,
          timestamp: Date.now(),
        });
        console.log(`Logged copy action for message: ${messageId}`);
      }
      resolve();
    });
  }

   getFavoriteMessages(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const onFavorites = (data: any) => {
        this.socket?.off("favoriteMessages", onFavorites);
        resolve(data.messages || []);
      };

      this.socket.on("favoriteMessages", onFavorites);
      this.socket.emit("getFavoriteMessages");

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.off("favoriteMessages", onFavorites);
        reject(new Error("Get favorites timeout"));
      }, 10000);
    });
  }

  joinChannel(chatId: string, currentChatId: string | null) {
    if (this.socket && this.socket.connected) {
      if (currentChatId && currentChatId !== chatId) {
        this.socket.emit('leaveChat', { chatId: currentChatId });
        console.log(`Left chat: ${currentChatId}`);
      }

      this.socket.emit('joinChat', { chatId });
      console.log(`Joined chat: ${chatId}`);
      return chatId;
    } else {
      console.warn('Cannot join channel: socket not connected');
      return null;
    }
  }

  leaveChannel(chatId: string) {
    if (this.socket?.connected && chatId) {
      this.socket.emit('leaveChat', { chatId });
      console.log(`Left chat: ${chatId}`);
    }
  }
}