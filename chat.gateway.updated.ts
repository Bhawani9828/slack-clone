// chat.gateway.ts - UPDATED VERSION WITH VIDEO/AUDIO CALL SUPPORT
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { SocketAuthMiddleware } from 'src/auth/ws.middleware';
import { Message } from './schemas/message.schema';
import { GroupChatService } from 'src/groupchat/group-chat.service';

// Add these helper functions at the top
function getMessageId(message: any): string {
  return message._id || message.id || `temp-${Date.now()}`;
}

function toSocketMessage(dbMessage: any, channelId?: string) {
  const messageId = getMessageId(dbMessage);
  
  return {
    _id: messageId,
    senderId: dbMessage.senderId,
    receiverId: dbMessage.receiverId,
    content: dbMessage.content,
    type: dbMessage.type || 'text',
    createdAt: typeof dbMessage.createdAt === 'string' ? dbMessage.createdAt : dbMessage.createdAt?.toISOString(),
    isDelivered: dbMessage.isDelivered ?? true,
    isRead: dbMessage.isRead ?? false,
    fileUrl: dbMessage.fileUrl || '',
    fileName: dbMessage.fileName || '',
    fileSize: dbMessage.fileSize?.toString() || '',
    channelId: dbMessage.channelId || channelId || '',
  };
}

function toSocketGroupMessage(dbMessage: any) {
  return {
    _id: dbMessage._id,
    senderId: dbMessage.senderId,
    groupId: dbMessage.groupId,
    content: dbMessage.content,
    type: dbMessage.type || 'text',
    createdAt: typeof dbMessage.createdAt === 'string' ? dbMessage.createdAt : dbMessage.createdAt?.toISOString(),
    isDeleted: dbMessage.isDeleted || false,
    fileUrl: dbMessage.fileUrl || '',
    fileName: dbMessage.fileName || '',
    fileSize: dbMessage.fileSize || '',
    replyTo: dbMessage.replyTo,
    readBy: dbMessage.readBy || [],
    reactions: dbMessage.reactions || [],
    mentions: dbMessage.mentions || [],
  };
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://192.168.0.170:3000/',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private readonly logger = new Logger(ChatGateway.name);
  
  private getSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly groupChatService: GroupChatService
  ) {}

  afterInit(server: Server) {
    server.use(SocketAuthMiddleware.create(this.jwtService));
    this.logger.log('Socket middleware initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = this.extractUserId(client);
      
      if (!userId) {
        this.logger.warn('Client connection rejected: No valid userId');
        client.disconnect();
        return;
      }

      // Store the connection
      this.connectedUsers.set(userId, client.id);
      client.userId = userId;

      // Join the user to their personal room for direct messaging
      await client.join(`user_${userId}`);

      // Join user to all their group rooms
      try {
        const userGroups = await this.groupChatService.getUserGroups(userId);
        for (const group of userGroups) {
          await client.join(`group_${group._id}`);
        }
        this.logger.log(`👥 User ${userId} joined ${userGroups.length} group rooms`);
      } catch (error) {
        this.logger.error('Error joining group rooms:', error);
      }

      // Broadcast user online status to all clients
      this.server.emit('userOnline', userId);

      // Send current online users list to the newly connected user
      const onlineUserIds = Array.from(this.connectedUsers.keys());
      client.emit('onlineUsers', onlineUserIds);

      this.logger.log(`✅ User connected: ${userId} (${client.id}). Online users: ${onlineUserIds.length}`);

      // Confirm connection to client
      client.emit('connectionSuccess', {
        message: 'Connected successfully',
        userId: userId,
        onlineUsers: onlineUserIds
      });

    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId || [...this.connectedUsers.entries()]
      .find(([, socketId]) => socketId === client.id)?.[0];

    if (userId) {
      this.connectedUsers.delete(userId);
      
      // Broadcast user offline status to all clients
      this.server.emit('userOffline', userId);

      this.logger.log(`❌ User disconnected: ${userId}. Online users: ${this.connectedUsers.size}`);
    }
  }

  // ==================== VIDEO/AUDIO CALL HANDLERS ====================
  
  @SubscribeMessage('call-user')
  handleCallUser(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const { to, from, offer, type } = data;
      const targetSocketId = this.getSocketId(to);
      
      if (targetSocketId) {
        this.logger.log(`📞 Call from ${from} to ${to} (${type})`);
        this.server.to(targetSocketId).emit('incoming-call', {
          from,
          type,
          offer
        });
      } else {
        this.logger.log(`❌ User ${to} not found for call`);
        client.emit('call-failed', { message: 'User not available' });
      }
    } catch (error) {
      this.logger.error('Error handling call-user:', error);
      client.emit('call-failed', { message: 'Call failed' });
    }
  }

  @SubscribeMessage('call-accepted')
  handleCallAccepted(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const { to, from, answer } = data;
      const targetSocketId = this.getSocketId(to);
      
      if (targetSocketId) {
        this.logger.log(`✅ Call accepted by ${from}`);
        this.server.to(targetSocketId).emit('call-accepted', {
          from,
          answer
        });
      }
    } catch (error) {
      this.logger.error('Error handling call-accepted:', error);
    }
  }

  @SubscribeMessage('call-rejected')
  handleCallRejected(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const { to, from } = data;
      const targetSocketId = this.getSocketId(to);
      
      if (targetSocketId) {
        this.logger.log(`❌ Call rejected by ${from}`);
        this.server.to(targetSocketId).emit('call-rejected', { from });
      }
    } catch (error) {
      this.logger.error('Error handling call-rejected:', error);
    }
  }

  @SubscribeMessage('end-call')
  handleEndCall(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const { to, from } = data;
      const targetSocketId = this.getSocketId(to);
      
      if (targetSocketId) {
        this.logger.log(`📞 Call ended by ${from}`);
        this.server.to(targetSocketId).emit('call-ended', { from });
      }
    } catch (error) {
      this.logger.error('Error handling end-call:', error);
    }
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const { to, candidate } = data;
      const targetSocketId = this.getSocketId(to);
      
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('ice-candidate', {
          from: client.userId,
          candidate
        });
      }
    } catch (error) {
      this.logger.error('Error handling ice-candidate:', error);
    }
  }

  // Legacy call methods (for backward compatibility)
  @SubscribeMessage('make-answer')
  handleMakeAnswer(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const { targetUserId, answer } = data;
      const targetSocket = this.getSocketId(targetUserId);
      if (targetSocket) {
        this.server.to(targetSocket).emit('answer-made', { answer, from: client.userId });
      }
    } catch (error) {
      this.logger.error('Error handling make-answer:', error);
    }
  }

  // ==================== MESSAGE HANDLERS ====================

  // FIXED: Send Message Handler
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() payload: CreateMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const senderId = this.extractUserId(client);
      if (!senderId || !payload.receiverId) {
        client.emit('messageError', { error: 'Invalid sender or receiver' });
        return;
      }

      this.logger.log(`📨 Processing message: ${senderId} → ${payload.receiverId}`);

      // Save message to database
      const savedMessage = await this.chatService.create({
        ...payload,
        senderId,
      });

      const messageId = getMessageId(savedMessage);
      const socketMessage = toSocketMessage(savedMessage, payload.channelId);

      this.logger.log(`💾 Message saved to DB: ${messageId}`);

      // CRITICAL FIX: Send to receiver's personal room immediately
      const receiverSocketId = this.connectedUsers.get(payload.receiverId);
      
      if (receiverSocketId) {
        // Send formatted message to receiver's specific socket
        this.server.to(receiverSocketId).emit('receiveMessage', socketMessage);
        this.logger.log(`📨 Message sent to receiver socket: ${receiverSocketId}`);
      } else {
        this.logger.log(`📱 Receiver ${payload.receiverId} is offline - message saved for later`);
      }

      // Send delivery confirmation to sender
      client.emit('messageDelivered', {
        _id: messageId,
        messageId: messageId,
        status: 'delivered',
        timestamp: new Date().toISOString()
      });

      // Update last message for chat list (optional)
      const lastMessages = await this.chatService.getLastMessages(payload.receiverId);
      
      // Send last message update to both users if they're online
      [senderId, payload.receiverId].forEach(userId => {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
          this.server.to(socketId).emit('lastMessage', {
            chatId: payload.channelId || `${senderId}-${payload.receiverId}`,
            lastMessage: savedMessage.content,
            lastMessageType: savedMessage.type,
            time: savedMessage.createdAt,
            senderId: savedMessage.senderId,
            unreadCount: userId === payload.receiverId ? 
              (lastMessages.find(c => c.userId === senderId)?.unreadCount || 0) + 1 : 0
          });
        }
      });

      this.logger.log(`✅ Message handled successfully: ${messageId}`);

    } catch (error) {
      this.logger.error('❌ Error sending message:', error);
      client.emit('messageError', { 
        error: 'Failed to send message',
        details: error.message 
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; hard?: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) {
        client.emit('messageError', { error: 'Unauthorized' });
        return;
      }

      // 1. Find the message
      const message = await this.chatService.findById(data.messageId);
      if (!message) {
        client.emit('messageError', { error: 'Message not found' });
        return;
      }

      // 2. Normalize sender & receiver IDs
      const senderId =
        (message.senderId as any)?._id?.toString() ?? message.senderId?.toString();
      const receiverId =
        (message.receiverId as any)?._id?.toString() ?? message.receiverId?.toString();

      // 3. Authorization check (sender or receiver only)
      if (senderId !== userId && receiverId !== userId) {
        client.emit('messageError', { error: 'Not authorized to delete this message' });
        return;
      }

      // 4. Delete (hard or soft)
      if (data.hard) {
        await this.chatService.hardDeleteMessage(data.messageId, userId);
      } else {
        await this.chatService.deleteMessage(data.messageId, userId);
      }

      // 5. Notify both users
      const eventPayload = {
        messageId: data.messageId,
        deletedBy: userId,
        hard: !!data.hard,
        timestamp: new Date().toISOString(),
      };

      this.server.to(`user_${senderId}`).emit('messageDeleted', eventPayload);
      this.server.to(`user_${receiverId}`).emit('messageDeleted', eventPayload);

      this.logger.log(
        `🗑️ Message ${data.hard ? 'hard' : 'soft'} deleted via socket: ${data.messageId} by ${userId}`,
      );
    } catch (error) {
      client.emit('messageError', { error: 'Failed to delete message' });
      this.logger.error('Delete message error:', error);
    }
  }

  // Handle reply message via socket
  @SubscribeMessage('replyMessage')
  async handleReplyMessage(
    @MessageBody() data: { 
      originalMessageId: string; 
      receiverId: string; 
      content: string; 
      type?: 'text' | 'image' | 'video' | 'file'
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const senderId = this.extractUserId(client);
      if (!senderId) return;

      const originalMessage = await this.chatService.findById(data.originalMessageId);
      
      const replyMessage = await this.chatService.create({
        senderId,
        receiverId: data.receiverId,
        content: data.content,
        type: data.type || 'text',
        replyTo: data.originalMessageId,
      });

      const receiverSocketId = this.connectedUsers.get(data.receiverId);
      
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('receiveMessage', {
          ...(replyMessage as any).toObject(),
          replyToMessage: originalMessage,
        });
      }

      client.emit('messageDelivered', {
        ...(replyMessage as any).toObject(),
        replyToMessage: originalMessage,
        _id: replyMessage._id?.toString() || '', 
        messageId: replyMessage._id?.toString() || '',
        status: 'delivered',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Receiver socketId: ${receiverSocketId}`);
      this.logger.log(`Sender socketId: ${client.id}`);
      this.logger.log(`↩️ Reply sent via socket: ${replyMessage._id}`);
    } catch (error) {
      client.emit('messageError', { error: 'Failed to send reply' });
      this.logger.error('Reply message error:', error);
    }
  }

  // Handle forward message via socket
  @SubscribeMessage('forwardMessage')
  async handleForwardMessage(
    @MessageBody() data: { messageId: string; receiverIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const senderId = this.extractUserId(client);
      if (!senderId) return;

      const originalMessage = await this.chatService.findById(data.messageId);
      const forwardedMessages: Message[] = [];

      for (const receiverId of data.receiverIds) {
        const forwardedMessage = await this.chatService.create({
          senderId,
          receiverId,
          content: originalMessage.content,
          type: originalMessage.type,
          fileUrl: originalMessage.fileUrl,
          fileName: originalMessage.fileName,
          fileSize: originalMessage.fileSize,
          isForwarded: true,
          forwardedFrom: data.messageId,
        });

        forwardedMessages.push(forwardedMessage);

        const receiverSocketId = this.connectedUsers.get(receiverId);
        if (receiverSocketId) {
          this.server.to(receiverSocketId).emit('receiveMessage', {
            ...(forwardedMessage as any).toObject(),
            isForwarded: true,
            originalSender: originalMessage.senderId,
          });
        }
      }

      client.emit('messageForwarded', {
        originalMessageId: data.messageId,
        forwardedCount: forwardedMessages.length,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`⏩ Message forwarded via socket: ${data.messageId} to ${data.receiverIds.length} users`);
    } catch (error) {
      client.emit('messageError', { error: 'Failed to forward message' });
      this.logger.error('Forward message error:', error);
    }
  }

  // Handle favorite toggle via socket
  @SubscribeMessage('toggleFavorite')
  async handleToggleFavorite(
    @MessageBody() data: { messageId: string; isFavorite: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) return;

      await this.chatService.toggleFavorite(data.messageId, userId, data.isFavorite);

      client.emit('favoriteToggled', {
        messageId: data.messageId,
        isFavorite: data.isFavorite,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`⭐ Favorite toggled via socket: ${data.messageId} - ${data.isFavorite}`);
    } catch (error) {
      client.emit('messageError', { error: 'Failed to toggle favorite' });
      this.logger.error('Toggle favorite error:', error);
    }
  }

  // Handle copy message logging via socket
  @SubscribeMessage('copyMessage')
  async handleCopyMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) return;

      const message = await this.chatService.findById(data.messageId);
      
      // Check if user has access to this message
      if (message.senderId.toString() !== userId && message.receiverId.toString() !== userId) {
        client.emit('messageError', { error: 'Not authorized to copy this message' });
        return;
      }

      await this.chatService.logMessageAction(data.messageId, userId, 'copy');

      client.emit('messageCopied', {
        messageId: data.messageId,
        content: message.content,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`📋 Message copy logged via socket: ${data.messageId} by ${userId}`);
    } catch (error) {
      client.emit('messageError', { error: 'Failed to log copy action' });
      this.logger.error('Copy message error:', error);
    }
  }

  // Get favorite messages via socket
  @SubscribeMessage('getFavorites')
  async handleGetFavorites(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) return;

      const favorites = await this.chatService.getFavoriteMessages(userId);

      client.emit('favoriteMessages', {
        messages: favorites,
        count: favorites.length,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`⭐ Favorites retrieved via socket: ${favorites.length} messages for ${userId}`);
    } catch (error) {
      client.emit('messageError', { error: 'Failed to get favorites' });
      this.logger.error('Get favorites error:', error);
    }
  }

  // Get message statistics via socket
  @SubscribeMessage('getMessageStats')
  async handleGetMessageStats(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const userId = this.extractUserId(client);
      if (!userId) return;

      const stats = await this.chatService.getMessageStats(userId);

      client.emit('messageStats', {
        stats,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`📊 Message stats retrieved via socket for ${userId}`);
    } catch (error) {
      client.emit('messageError', { error: 'Failed to get message stats' });
      this.logger.error('Get message stats error:', error);
    }
  }

  // Typing indicator
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { receiverId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const senderId = this.extractUserId(client);
    if (!senderId || !data.receiverId) return;

    const receiverSocketId = this.connectedUsers.get(data.receiverId);
    
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('typing', {
        userId: senderId,
        receiverId: data.receiverId,
        isTyping: data.isTyping,
      });

      this.logger.log(`💬 Typing indicator: ${senderId} → ${data.receiverId} (${data.isTyping})`);
    }
  }

  // Mark message as read
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string; senderId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const readerId = this.extractUserId(client);
      if (!readerId) return;

      await this.chatService.markAsRead(data.messageId);

      // Notify sender that message was read
      const senderSocketId = this.connectedUsers.get(data.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('messageRead', {
          messageId: data.messageId,
          readBy: readerId,
          timestamp: new Date().toISOString()
        });
      }

      this.logger.log(`👁️ Message marked as read: ${data.messageId} by ${readerId}`);
    } catch (error) {
      this.logger.error('Error marking as read:', error);
    }
  }

  // Join specific chat room (optional - for group chats)
  @SubscribeMessage('joinChat')
  handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = this.extractUserId(client);
    if (!userId) return;

    client.join(data.chatId);
    this.logger.log(`👥 User ${userId} joined chat ${data.chatId}`);
    
    client.emit('joinedChat', { chatId: data.chatId, userId });
  }

  // Join user room (for personal messaging)
  @SubscribeMessage('joinUserRoom')
  async handleJoinUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = this.extractUserId(client);
    if (!userId || data.userId !== userId) return;

    await client.join(`user_${userId}`);
    this.logger.log(`🏠 User ${userId} joined personal room`);
    
    client.emit('joinedUserRoom', { userId });
  }

  // Get online users
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const onlineUserIds = Array.from(this.connectedUsers.keys());
    client.emit('onlineUsers', onlineUserIds);
    
    this.logger.log(`👥 Sent online users list: ${onlineUserIds.length} users`);
  }

  // Helper methods
  private extractUserId(client: AuthenticatedSocket): string | null {
    return (
      client.userId ||
      client.data?.user?.userId ||
      client.data?.user?.sub ||
      client.data?.user?._id ||
      client.data?.user?.id ||
      null
    );
  }

  // Public methods for external use
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      return true;
    }
    return false;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Send message to specific user (for external calls)
  async sendMessageToUser(receiverId: string, message: any) {
    const receiverSocketId = this.connectedUsers.get(receiverId);
    
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('receiveMessage', message);
      this.logger.log(`📨 External message sent to user: ${receiverId}`);
      return true;
    }
    
    this.logger.log(`📱 User ${receiverId} is offline - message not delivered via socket`);
    return false;
  }
}