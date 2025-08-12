import { useState, useEffect, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import Cookies from 'js-cookie';

// Message interface
interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  isRead?: boolean;
  isDelivered?: boolean;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
}

// ChatUser interface (yaha id add kar diya)
interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

export const useChat = (currentUserId: string, selectedChatUser: ChatUser | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [userId: string]: number }>({});

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user_online', currentUserId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('receiveMessage', (message: Message) => {
      setMessages(prev => {
        const exists = prev.some(msg => msg._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      // Agar sender ka chat open nahi hai to unread count badhao
      if (!selectedChatUser || message.senderId !== selectedChatUser.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1
        }));
      }
    });

    socket.on('messageDelivered', (message: Message) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === message._id
            ? { ...msg, isDelivered: true }
            : msg
        )
      );
    });

    socket.on('messageRead', (data: { messageId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, isRead: true }
            : msg
        )
      );
    });

    socket.on('user_status', (data: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    socket.on('typingStarted', (data: { userId: string }) => {
      setTypingUsers(prev => new Set([...prev, data.userId]));
    });

    socket.on('typingStopped', (data: { userId: string }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('messageDelivered');
      socket.off('messageRead');
      socket.off('user_status');
      socket.off('typingStarted');
      socket.off('typingStopped');
    };
  }, [currentUserId, selectedChatUser]);

  const sendMessage = useCallback((receiverId: string, content: string, type: 'text' | 'image' | 'file' = 'text') => {
    const socket = socketService.getSocket();
    if (!socket || !isConnected) return;

    const messageData = {
      receiverId,
      content,
      type,
    };

    const optimisticMessage: Message = {
      _id: Date.now().toString(),
      senderId: currentUserId,
      receiverId,
      content,
      type,
      createdAt: new Date().toISOString(),
      isDelivered: false,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    socket.emit('sendMessage', messageData);
  }, [currentUserId, isConnected]);

  const loadConversation = useCallback(async (receiverId: string) => {
    try {
      const token = Cookies.get('auth_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/conversation/${currentUserId}/${receiverId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const conversation = await response.json();
        setMessages(conversation);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [currentUserId]);

  const markAsRead = useCallback((senderId: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const unreadMessages = messages.filter(
      msg => msg.senderId === senderId && !msg.isRead
    );

    unreadMessages.forEach(msg => {
      socket.emit('markAsRead', {
        messageId: msg._id,
        senderId: msg.senderId
      });
    });
  }, [messages]);

  const startTyping = useCallback((receiverId: string) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('typing', { receiverId, isTyping: true });
    }
  }, []);

  const stopTyping = useCallback((receiverId: string) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('typing', { receiverId, isTyping: false });
    }
  }, []);

  return {
    messages,
    onlineUsers,
    typingUsers,
    isConnected,
    unreadCounts,
    sendMessage,
    loadConversation,
    markAsRead,
    startTyping,
    stopTyping,
    setMessages,
  };
};
