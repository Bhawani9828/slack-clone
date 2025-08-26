'use client'

import React, { useEffect, useCallback } from "react"
import { Avatar, Badge } from "@mui/material"
import { socketService } from "@/lib/socket"
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/lib/store/index'
import {
  updateChatUserLastMessage,
  updateChatUserTypingStatus,
  updateChatUserOnlineStatus,
} from '@/lib/store/slices/userSlice'
import { ChatUser } from "@/types/chatTypes"

interface ChatListViewProps {
  searchQuery: string
  isDark: boolean
  isLoading: boolean
  onContactClick: (contactId: string) => void
}

export default function ChatListView({ 
  searchQuery, 
  isDark, 
  isLoading, 
  onContactClick 
}: ChatListViewProps) {
  const textColor = isDark ? "white" : "gray-900"
  const dispatch = useDispatch<AppDispatch>()
  const chatusers = useSelector((state: RootState) => state.user.chatusers)
  const currentUserId = useSelector((state: RootState) => state.user.currentUser?._id)

  // FIXED: Instant message update handler
  const handleReceiveMessage = useCallback((data: any) => {
    console.log('📥 ChatListView received message event:', data);
    
    if (!data || !currentUserId) return;

    // Determine if this message is relevant to our chat list
    const isRelevantMessage = 
      data.senderId === currentUserId || 
      data.receiverId === currentUserId;

    if (!isRelevantMessage) {
      console.log('Message not relevant to current user:', data);
      return;
    }

    // FIXED: Determine which chat to update based on who the other person is
    const chatIdToUpdate = data.senderId === currentUserId 
      ? data.receiverId 
      : data.senderId;

    // FIXED: Show message content differently based on sender
    let messageContent: string;
    
    if (data.senderId === currentUserId) {
      // Message sent by current user - show "You: message"
      messageContent = `You: ${data.content}`;
    } else {
      // Message received from other user - show just the message content
      // The sender's name will be shown as the chat name, so no need to repeat it
      messageContent = data.content;
    }

    const messageTime = data.createdAt 
      ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    console.log('Updating chat:', chatIdToUpdate, 'with:', messageContent);

    dispatch(updateChatUserLastMessage({ 
      chatId: chatIdToUpdate, 
      lastMessage: messageContent, 
      time: messageTime,
      senderId: data.senderId,
      markRead: data.senderId === currentUserId // Mark as read if current user sent it
    }));
  }, [dispatch, currentUserId]);

  // FIXED: Handle last message updates with proper sender identification
  const handleLastMessage = useCallback((data: { 
    chatId: string; 
    lastMessage: string; 
    time: string;
    senderId: string 
  }) => {
    console.log('📨 Last message update received:', data);
    
    // FIXED: Format message based on sender
    let formattedMessage: string;
    
    if (data.senderId === currentUserId) {
      // Message sent by current user
      formattedMessage = `You: ${data.lastMessage}`;
    } else {
      // Message received from other user
      formattedMessage = data.lastMessage;
    }
    
    dispatch(updateChatUserLastMessage({ 
      chatId: data.chatId.toString(), 
      lastMessage: formattedMessage, 
      time: data.time,
    }));
  }, [dispatch, currentUserId]);

  const handleUserStatus = useCallback((data: { userId: string; isOnline: boolean }) => {
    console.log('👤 User status update:', data);
    dispatch(updateChatUserOnlineStatus({ 
      userId: data.userId, 
      isOnline: data.isOnline 
    }));
  }, [dispatch]);

  const handleTyping = useCallback((data: { userId: string; isTyping: boolean }) => {
    console.log('💬 Typing status update:', data);
    dispatch(updateChatUserTypingStatus({ 
      userId: data.userId, 
      isTyping: data.isTyping 
    }));
  }, [dispatch]);

  const handleMessageRead = useCallback((data: { chatId: string; messageId: string }) => {
    console.log('👁️ Message read confirmation:', data);
    dispatch(updateChatUserLastMessage({
      chatId: data.chatId,
      lastMessage: '', 
      time: '', 
      markRead: true 
    }));
  }, [dispatch]);

  // Socket listeners setup
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      console.warn('⚠️ No socket available for ChatListView listeners');
      return;
    }

    console.log('📡 Setting up ChatListView socket listeners');

    // Listen for ALL message-related events
    socket.on('receiveMessage', handleReceiveMessage);  // MOST IMPORTANT - instant updates
    socket.on('lastMessage', handleLastMessage);
    socket.on('typing', handleTyping);
    socket.on('userStatus', handleUserStatus);
    socket.on('userOnline', (userId: string) => handleUserStatus({ userId, isOnline: true }));
    socket.on('userOffline', (userId: string) => handleUserStatus({ userId, isOnline: false }));
    socket.on('messageRead', handleMessageRead);

    console.log('✅ ChatListView listeners attached');

    return () => {
      console.log('🧹 Cleaning up ChatListView listeners');
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('lastMessage', handleLastMessage);
      socket.off('typing', handleTyping);
      socket.off('userStatus', handleUserStatus);
      socket.off('userOnline');
      socket.off('userOffline');
      socket.off('messageRead', handleMessageRead);
    };
  }, [handleReceiveMessage, handleLastMessage, handleTyping, handleUserStatus, handleMessageRead]);

  // Filter and sort chats based on search query and last message time
  const filteredChats = React.useMemo(() => {
    if (!Array.isArray(chatusers)) return []
    
    return chatusers
      .filter((chat) => 
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by time (newest first)
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeB - timeA;
      })
  }, [chatusers, searchQuery])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'gray-500' }}>Loading...</div>
      </div>
    )
  }

  if (filteredChats.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'gray-500' }}>
          {searchQuery ? 'No matching chats found' : 'No chats available'}
        </div>
      </div>
    )
  }

  return (
    <>
   
      {filteredChats.map((chat) => {
        const isActiveChat = chat.unreadCount && chat.unreadCount > 0
        const messageColor = chat.isTyping 
          ? "#01aa85" 
          : (isActiveChat 
              ? (isDark ? "white" : "gray-900") 
              : (isDark ? "rgb(156 163 175)" : "rgb(75 85 99)"))

        return (
          <div
            key={chat.id}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: isDark 
                ? (isActiveChat ? "rgba(1, 170, 133, 0.1)" : "transparent") 
                : (isActiveChat ? "rgba(1, 170, 133, 0.05)" : "white"),
              cursor: 'pointer',
              borderBottom: `1px solid ${isDark ? "rgb(55 65 81)" : "rgb(243 244 246)"}`,
              transition: 'background-color 0.2s',
            }}
            onClick={() => {
              console.log('🎯 Clicked on chat:', chat.id);
              onContactClick(chat.id);
              // Mark as read when clicked
              if (chat.unreadCount && chat.unreadCount > 0) {
                dispatch(updateChatUserLastMessage({
                  chatId: chat.id,
                  lastMessage: chat.lastMessage,
                  time: chat.time,
                  markRead: true
                }));
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Avatar 
                  src={chat?.profilePicture} 
                  sx={{ 
                    width: 48, 
                    height: 48,
                    border: isActiveChat ? '2px solid #01aa85' : 'none'
                  }} 
                  alt={chat.name}
                />
                {chat.isOnline && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    backgroundColor: '#01aa85',
                    border: '2px solid white',
                    borderRadius: '9999px',
                  }}></div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ 
                    fontWeight: isActiveChat ? 600 : 500, 
                  
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {chat.name}
                  </h4>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: isActiveChat 
                      ? '#01aa85' 
                      : (isDark ? "rgb(156 163 175)" : "rgb(107 114 128)"),
                    fontWeight: isActiveChat ? 600 : 400
                  }}>
                    {chat.time}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginTop: '0.25rem' 
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: messageColor,
                    minHeight: '20px',
                    fontStyle: chat.isTyping ? 'italic' : 'normal'
                  }}>
                    {chat.isTyping ? (
                      <TypingIndicator />
                    ) : (
                      chat.lastMessage || "No messages yet"
                    )}
                  </p>
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <Badge
                      badgeContent={chat.unreadCount}
                      sx={{
                        "& .MuiBadge-badge": {
                          backgroundColor: "#01aa85",
                          color: "white",
                          fontWeight: 'bold',
                        },
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
     
      <style jsx global>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </>
  )
}

const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <span style={{ marginRight: '0.25rem' }}>Typing</span>
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[0, 0.2, 0.4].map((delay) => (
        <div 
          key={delay}
          style={{ 
            width: 4, 
            height: 4, 
            backgroundColor: '#01aa85', 
            borderRadius: '9999px', 
            animation: 'bounce 1s infinite',
            animationDelay: `${delay}s`
          }} 
        />
      ))}
    </div>
  </div>
)