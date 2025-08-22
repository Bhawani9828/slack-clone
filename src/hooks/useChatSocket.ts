// hooks/useChatSocket.ts - Fixed for Instant Message Reception
import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import {
  addMessage,
  updateMessageStatus,
  userOnline,
  userOffline,
  setTypingStatus,
  setConnected,
} from '@/lib/store/chatSlice';
import { useAppDispatch } from '@/lib/store';

export const useChatSocket = (
  channelId: string,
  currentUserId: string,
  receiverId: string
) => {
  const dispatch = useAppDispatch();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<{
    receiveMessage?: (msg: any) => void;
    messageDelivered?: (data: any) => void;
    messageRead?: (data: any) => void;
    userOnline?: (userId: string) => void;
    userOffline?: (userId: string) => void;
    onlineUsers?: (userIds: string[]) => void;
    typing?: (data: any) => void;
  }>({});
  const seenMessageKeysRef = useRef<Set<string>>(new Set());

  

  // Initialize socket connection - Only once
  useEffect(() => {
    console.log('🧩 useChatSocket mounted - initializing socket for user:', currentUserId);

    if (!currentUserId) {
      console.warn('No currentUserId provided, skipping socket initialization');
      return;
    }

    // Connect socket with current user ID
    const socket = socketService.connect(currentUserId);
    
    if (!socket) {
      console.error('Failed to establish socket connection');
      return;
    }

    const onConnect = () => {
      console.log('✅ Socket connected successfully:', socket?.id);
      dispatch(setConnected(true));
      
      // Immediately join channel after connection
      if (channelId && currentUserId) {
        console.log(`🔗 Auto-joining channel ${channelId}`);
        socketService.joinChannel(channelId);
        socketService.setCurrentUserId(currentUserId);
      }
    };

    const onDisconnect = (reason: string) => {
      console.log('❌ Socket disconnected:', reason);
      dispatch(setConnected(false));
    };

    const onReconnect = () => {
      console.log('🔄 Socket reconnected - rejoining channel');
      dispatch(setConnected(true));
      
      // Re-join channel immediately after reconnection
      if (channelId && currentUserId) {
        socketService.joinChannel(channelId);
        socketService.setCurrentUserId(currentUserId);
        socketService.requestOnlineUsers();
      }
    };

    const onError = (error: any) => {
      console.error('🚨 Socket connection error:', error);
    };

    // Attach connection event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onReconnect);
    socket.on('error', onError);

    // If already connected, trigger connect handler
    if (socket.connected) {
      console.log('Socket already connected, triggering onConnect');
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect', onReconnect);
      socket.off('error', onError);
      console.log('🔌 Socket connection listeners cleaned up');
    };
  }, [dispatch, currentUserId, channelId]);

  // Handle messages - Set up once and clean up properly
  useEffect(() => {
    if (!channelId || !currentUserId || !receiverId) {
      console.log('Missing required chat parameters:', { channelId, currentUserId, receiverId });
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      console.log('No socket available for message listeners');
      return;
    }

    console.log('📡 Setting up message listeners for channel:', channelId);

    // FIXED: Immediate message handler - no delays
    const receiveMessageHandler = (msg: any) => {
      console.log('📥 INSTANT message received:', msg);
      
      if (!msg || !msg.content) {
        console.warn('⚠️ Received invalid message:', msg);
        return;
      }

      // Check if this message belongs to current conversation
      const isRelevant = 
        (msg.senderId === receiverId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === receiverId);

     if (!isRelevant) {
      console.log('Message not relevant to current chat');
      return;
     }

      // Build a stable key to dedupe: prefer backend _id or clientMessageId
      const key: string = msg._id || msg.clientMessageId || `${msg.senderId}|${msg.receiverId}|${msg.createdAt}|${msg.content}`;
      if (seenMessageKeysRef.current.has(key)) {
        console.log('🧹 Duplicate inbound message suppressed:', key);
        return;
      }
      seenMessageKeysRef.current.add(key);
      // Trim set to last 500 entries
      if (seenMessageKeysRef.current.size > 500) {
        const first = seenMessageKeysRef.current.values().next().value;
        seenMessageKeysRef.current.delete(first);
      }

      console.log('✅ Processing RELEVANT message INSTANTLY:', msg.content);

      // Process message IMMEDIATELY - no setTimeout
      const newMessage = {
        _id: msg._id || `temp-${Date.now()}-${Math.random()}`,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        type: msg.type || 'text',
        createdAt: msg.createdAt || new Date().toISOString(),
        isSent: msg.senderId === currentUserId,
        isDelivered: msg.senderId !== currentUserId, 
        isRead: msg.isRead || false,
        fileUrl: msg.fileUrl || '',
        fileName: msg.fileName || '',
        fileSize: msg.fileSize || '',
        channelId: msg.channelId || channelId,
        clientMessageId: msg.clientMessageId,
      };

      // IMMEDIATELY dispatch to Redux store
      dispatch(addMessage(newMessage));
      console.log('📨 Message added to store instantly!');

      // Auto-mark as read if I'm the receiver
      if (msg.receiverId === currentUserId && msg._id) {
        setTimeout(() => {
          console.log('👁️ Auto-marking message as read:', msg._id);
          socketService.markAsRead(msg._id, msg.senderId);
        }, 1000); // Small delay for read receipt
      }
    };

    const messageDeliveredHandler = (data: any) => {
      console.log('📬 Message delivered instantly:', data._id || data.messageId);
      dispatch(updateMessageStatus({ 
        messageId: data._id || data.messageId, 
        status: 'delivered' 
      }));
    };

    const messageReadHandler = (data: any) => {
      console.log('👁️ Message read instantly:', data.messageId);
      dispatch(updateMessageStatus({ 
        messageId: data.messageId, 
        status: 'read' 
      }));
    };

    const handleTypingStatus = (data: { userId: string; receiverId: string; isTyping: boolean }) => {
      console.log(`💬 Typing status received:`, data);
      // Only update if I'm the receiver and it's from current chat partner
      if (data.receiverId === currentUserId && data.userId === receiverId) {
        dispatch(setTypingStatus({ userId: data.userId, isTyping: data.isTyping }));
      }
    };

    const handleUserOnline = (userId: string) => {
      console.log(`🟢 User came online: ${userId}`);
      dispatch(userOnline(userId));
    };

    const handleUserOffline = (userId: string) => {
      console.log(`🔴 User went offline: ${userId}`);
      dispatch(userOffline(userId));
    };

    const handleOnlineUsers = (userIds: string[]) => {
      console.log(`👥 Online users list received:`, userIds);
      userIds.forEach(userId => dispatch(userOnline(userId)));
    };

    // Store handlers for cleanup
    messageHandlersRef.current = {
      receiveMessage: receiveMessageHandler,
      messageDelivered: messageDeliveredHandler,
      messageRead: messageReadHandler,
      typing: handleTypingStatus,
      userOnline: handleUserOnline,
      userOffline: handleUserOffline,
      onlineUsers: handleOnlineUsers,
    };

    // Add all event listeners
    socket.on('receiveMessage', receiveMessageHandler);
    socket.on('messageDelivered', messageDeliveredHandler);
    socket.on('messageRead', messageReadHandler);
    socket.on('typing', handleTypingStatus);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);
    socket.on('onlineUsers', handleOnlineUsers);

    console.log('📡 All message listeners attached successfully');

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up message listeners');
      const handlers = messageHandlersRef.current;
      
      if (handlers.receiveMessage) socket.off('receiveMessage', handlers.receiveMessage);
      if (handlers.messageDelivered) socket.off('messageDelivered', handlers.messageDelivered);
      if (handlers.messageRead) socket.off('messageRead', handlers.messageRead);
      if (handlers.typing) socket.off('typing', handlers.typing);
      if (handlers.userOnline) socket.off('userOnline', handlers.userOnline);
      if (handlers.userOffline) socket.off('userOffline', handlers.userOffline);
      if (handlers.onlineUsers) socket.off('onlineUsers', handlers.onlineUsers);
      
      messageHandlersRef.current = {};
      console.log('✅ Message listeners cleaned up');
    };
  }, [channelId, currentUserId, receiverId, dispatch]);

  // Join channel when parameters change
  useEffect(() => {
    if (!channelId || !currentUserId) {
      console.log('⚠️ Missing channel or user info:', { channelId, currentUserId });
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      console.log('❌ No socket available for joining channel');
      return;
    }

    if (!socket.connected) {
      console.log('⏳ Socket not connected yet, will join on connect');
      return;
    }

    console.log(`🔗 Joining channel ${channelId} as user ${currentUserId}`);
    
    // Set current user and join channel
    socketService.setCurrentUserId(currentUserId);
    socketService.joinChannel(channelId);

    // Request online users list
    setTimeout(() => {
      if (socketService.isConnected()) {
        console.log('📞 Requesting online users list');
        socketService.requestOnlineUsers();
      }
    }, 500);

  }, [channelId, currentUserId]);

  // Typing handler
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (!receiverId || !currentUserId) {
        console.warn('⚠️ Missing user info for typing:', { receiverId, currentUserId });
        return;
      }

      const socket = socketService.getSocket();
      if (!socket || !socket.connected) {
        console.warn('❌ Cannot send typing: socket not ready');
        return;
      }

      console.log(`💬 Sending typing=${isTyping} to ${receiverId}`);
      socketService.sendTypingIndicator(receiverId, isTyping);

      // Clear existing typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Auto-stopping typing indicator');
          socketService.sendTypingIndicator(receiverId, false);
        }, 3000);
      }
    },
    [receiverId, currentUserId]
  );

  // Send message function
  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text', additionalData?: any) => {
    if (!receiverId || !currentUserId || !content.trim()) {
      console.warn('⚠️ Missing required data for sending message:', {
        receiverId, currentUserId, content: content?.length
      });
      return;
    }

    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      console.error('❌ Cannot send message: socket not connected');
      throw new Error('Socket not connected');
    }

    const messageData = {
      senderId: currentUserId,
      receiverId,
      content: content.trim(),
      type,
      chatId: channelId,
      createdAt: new Date().toISOString(),
      ...additionalData,
    };

    try {
      console.log('📤 Sending message:', messageData);
      await socketService.sendMessage(messageData);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [receiverId, currentUserId, channelId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      console.log('🧹 useChatSocket cleanup completed');
    };
  }, []);

  return { 
    handleTyping, 
    sendMessage,
    isConnected: socketService.isConnected(),
  };
};