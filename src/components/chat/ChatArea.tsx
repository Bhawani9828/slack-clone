// components/ChatArea.tsx - Fixed TypeScript errors
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import StatusView from "../sidebarComponets/StatusView";
import { 
  ApiMessage, 
  ChatAreaProps, 
  Message, 
  GroupMessage 
} from "@/types/chatTypes";
import { 
  addMessage, 
  setCurrentChat, 
  setLoading, 
  setMessages,
  updateMessageStatus
} from "@/lib/store/chatSlice";
import { socketService } from "@/lib/socket";
import { formatLastSeen } from "@/lib/utils";
import { 
  Button, 
  Checkbox, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  TextField
} from "@mui/material";
import { Send } from "@mui/icons-material";

export default function ChatArea({
  contact,
  channelId,
  receiverId,
  currentUserId,
  senderId,
  currentUserName,
  onVideoCall,
  onVoiceCall,
  isDark = false,
  // Group chat props
  isGroupChat = false,
  groupMessages = [],
  typingUsers = [],
  onlineUsers = [],
  onSendGroupMessage,
  onGroupTyping,
  onGroupStopTyping,
  onDeleteGroupMessage,
  onLoadMoreMessages,
  isLoadingMessages = false,
  hasMoreMessages = false,
  isCurrentUserAdmin = false,
  canManageGroup = false,
  participantCount = 0,
  groupInfo,
  onLeaveGroup,
  onAddParticipants,
  onRemoveParticipant,
  onChangeAdminStatus,
  isMobile,      
  onMobileBack, 
}: ChatAreaProps) {
  const dispatch = useAppDispatch();
  const {
    messages: directMessages,
    onlineUsers: directOnlineUsers,
    typingStatus,
    isLoading,
    isConnected,
    currentChat,
  } = useAppSelector((state) => state.chat);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showStatusView, setShowStatusView] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [statusUserId, setStatusUserId] = useState<string | null>(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ApiMessage | null>(null);
  const [forwarding, setForwarding] = useState<ApiMessage | null>(null);
  const [forwardRecipients, setForwardRecipients] = useState<string[]>([]);
  const [quickReplyMessage, setQuickReplyMessage] = useState("");
  
  // NEW: Real-time user status tracking
  const [userStatuses, setUserStatuses] = useState<Map<string, { 
    isOnline: boolean; 
    lastSeen?: string; 
    isTyping?: boolean;
  }>>(new Map());

  // Determine which hook to use based on chat type
  const { handleTyping } = useChatSocket(
    isGroupChat ? "" : channelId, 
    currentUserId, 
    isGroupChat ? "" : receiverId
  );

  const getSenderId = (senderId: string | { _id: string; name?: string; username?: string }): string => {
    if (typeof senderId === 'string') {
      return senderId;
    }
    return senderId._id;
  };

  // Get appropriate messages based on chat type
  const messages = isGroupChat ? 
    groupMessages.map(msg => ({
      _id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.groupId, // Use groupId as receiverId for groups
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
      isSent: msg.isSent,
      isDelivered: msg.isDelivered,
      isRead: msg.isRead,
      isError: false,
      fileUrl: msg.fileUrl || "",
      fileName: msg.fileName || "",
      fileSize: msg.fileSize || "",
      channelId: msg.groupId,
      replyTo: msg.replyTo,
      isForwarded: msg.isForwarded,
      forwardedFrom: msg.forwardedFrom,
    })) : directMessages;

  // Get appropriate online users and typing status
  const currentOnlineUsers = isGroupChat ? onlineUsers : directOnlineUsers;
  const currentTypingUsers = isGroupChat ? typingUsers : [];

  // NEW: Setup socket listeners for real-time status updates
  useEffect(() => {
    if (!socketService.isConnected()) {
      socketService.connect(currentUserId);
    }

    // Enhanced message listeners with status tracking
    socketService.setupMessageListeners({
      onMessage: (message) => {
        console.log('New message received:', message);
        if (!isGroupChat) {
          dispatch(addMessage(message));
        }
      },
      
      onTyping: (data) => {
        console.log('Typing indicator:', data);
        
        // Update user status with typing indicator
        setUserStatuses(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(data.userId) || { isOnline: true };
          newMap.set(data.userId, { ...current, isTyping: data.isTyping });
          return newMap;
        });
      },
      
      // NEW: Enhanced user status handler
      onUserStatus: (data) => {
        console.log('User status update:', data);
        
        const { userId, isOnline, lastSeen, type } = data;
        
        // Update user status in local state
        setUserStatuses(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(userId) || {};
          newMap.set(userId, {
            ...current,
            isOnline,
            lastSeen,
          });
          return newMap;
        });
        
        console.log(`Status updated for ${userId}: ${isOnline ? 'Online' : `Last seen: ${lastSeen}`}`);
      },
      
      onLastMessage: (data) => {
        console.log('Last message update:', data);
      },
      
      onMessageRead: (data) => {
        console.log('Message read:', data);
        if (!isGroupChat) {
          dispatch(updateMessageStatus({ 
            messageId: data.messageId, 
            status: 'read' 
          }));
        }
      },
      
      onMessageDeleted: (data) => {
        console.log('Message deleted:', data);
        if (!isGroupChat) {
          dispatch(updateMessageStatus({ 
            messageId: data.messageId, 
            status: 'deleted' 
          }));
        }
      }
    });

    return () => {
      // Cleanup on unmount
      socketService.off('userStatus');
      socketService.off('userOnline');
      socketService.off('userOffline');
    };
  }, [currentUserId, isGroupChat, dispatch]);

  // NEW: Request status for current contact when contact changes
  useEffect(() => {
    if (!isGroupChat && receiverId && socketService.isConnected()) {
      // Request fresh status for the contact
      socketService.requestUserStatus(receiverId);
      
      // Set up periodic status polling
      const statusInterval = setInterval(() => {
        socketService.requestUserStatus(receiverId);
      }, 30000); // Every 30 seconds

      return () => clearInterval(statusInterval);
    }
  }, [receiverId, isGroupChat]);

  // Set current chat when props change (only for direct chats)
  useEffect(() => {
    if (!isGroupChat) {
      dispatch(setCurrentChat({ channelId, receiverId, contact }));
    }
  }, [channelId, receiverId, contact, dispatch, isGroupChat]);

  // Fetch initial messages (only for direct chats)
  useEffect(() => {
    if (isGroupChat) return; // Skip for group chats, handled by useGroupChat

    const fetchMessages = async () => {
      dispatch(setLoading(true));
      try {
        const data = await getApi<ApiMessage[]>(API_ENDPOINTS.MESSAGES_CHANNELID(channelId));
        
        const formattedMessages: Message[] = data.map((msg) => ({
          _id: msg._id,
          senderId: typeof msg.senderId === 'string' 
            ? msg.senderId 
            : msg.senderId?._id || (msg.receiverId === currentUserId ? receiverId : currentUserId),
          receiverId: msg.receiverId,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt,
          isSent: (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id) === currentUserId,
          isDelivered: msg.isDelivered || msg.receiverId === currentUserId,
          isRead: msg.isRead || false,
          fileUrl: msg.fileUrl || "",
          fileName: msg.fileName || "",
          fileSize: msg.fileSize || "",
          channelId: msg.channelId || channelId,
          isError: false,
          replyTo: msg.replyTo,
          isForwarded: msg.isForwarded,
          forwardedFrom: msg.forwardedFrom
        }));

        dispatch(setMessages(formattedMessages));
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    if (channelId && currentUserId && receiverId) {
      fetchMessages();
    }
  }, [channelId, currentUserId, receiverId, dispatch, isGroupChat]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enhanced message send handler for both direct and group chats
  const handleMessageSend = async (msg: any) => {
    if (!msg?.content) return;

    if (isGroupChat && onSendGroupMessage) {
      // Handle group message
      try {
        await onSendGroupMessage({
          content: msg.content,
          type: msg.type || "text",
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
        });
        
        // Clear reply/forward state after successful send
        if (replyingTo) {
          setReplyingTo(null);
          setReplyingToMessageId(null);
        }
        if (forwarding) {
          setForwarding(null);
          setForwardingMessageId(null);
        }
      } catch (error) {
        console.error("Failed to send group message:", error);
      }
      return;
    }

    // Handle direct message (existing logic with fix)
    const newMessage: Message = {
      _id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId,
      content: msg.content,
      type: msg.type || "text",
      createdAt: new Date().toISOString(),
      isSent: true,
      isDelivered: false,
      isRead: false,
      isError: false,
      fileUrl: msg.fileUrl || "",
      fileName: msg.fileName || "",
      fileSize: msg.fileSize || "",
      channelId: msg.channelId || channelId,
      ...(replyingTo && { 
        replyTo: replyingTo._id,
        replyToContent: replyingTo.content,
        replyToSender: getSenderId(replyingTo.senderId)
      }),
      ...(forwarding && { 
        isForwarded: true,
        forwardedFrom: forwarding._id,
      })
    };

    dispatch(addMessage(newMessage));

    try {
      if (isConnected) {
        if (replyingTo) {
          const replyData = {
            originalMessageId: replyingTo._id,
            receiverId,
            content: msg.content,
            type: msg.type || 'text',
            channelId,
            replyToContent: replyingTo.content,
            replyToSender: getSenderId(replyingTo.senderId)
          };
          
          // FIX: Use correct method name 'replyMessage' instead of 'replyToMessage'
          await socketService.replyMessage(replyData);
        } else if (forwarding) {
          // FIX: Provide both required arguments
          await socketService.forwardMessage(forwarding._id, [receiverId]);
        } else {
          await socketService.sendMessage(newMessage);
        }
        
        if (replyingTo) {
          setReplyingTo(null);
          setReplyingToMessageId(null);
        }
        if (forwarding) {
          setForwarding(null);
          setForwardingMessageId(null);
        }
      }
    } catch (error) {
      console.error("Send failed:", error);
      dispatch(updateMessageStatus({ 
        messageId: newMessage._id,
        status: 'error' 
      }));
    }
  };

  // Enhanced typing handlers for both chat types
  const handleTypingStart = () => {
    if (isGroupChat && onGroupTyping) {
      onGroupTyping();
    } else {
      handleTyping(true);
    }
  };

  const handleTypingStop = () => {
    if (isGroupChat && onGroupStopTyping) {
      onGroupStopTyping();
    } else {
      handleTyping(false);
    }
  };

  // Helper function to safely get sender display name
  const getSenderDisplayName = (senderId: string | { _id: string; name?: string; username?: string }): string => {
    if (typeof senderId === 'string') {
      return senderId;
    }
    return senderId.name || senderId.username || senderId._id || 'Unknown';
  };

  // Enhanced delete message handler
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (isGroupChat && onDeleteGroupMessage) {
      try {
        await onDeleteGroupMessage(messageId);
        console.log("Group message deleted successfully");
      } catch (error) {
        console.error("Failed to delete group message:", error);
      }
    } else {
      // Implement direct message delete logic
      console.log("Deleting direct message:", messageId);
    }
  }, [isGroupChat, onDeleteGroupMessage]);

  // FIX: Type-safe property access for contact
  const getContactProperty = (prop: 'lastSeen' | 'isOnline' | 'profilePicture'): any => {
    // Type guard to check if contact has the property
    if (contact && typeof contact === 'object' && prop in contact) {
      return (contact as any)[prop];
    }
    return undefined;
  };

  // NEW: Get current contact status with real-time updates
  const getCurrentContactStatus = () => {
    if (isGroupChat) {
      return {
        isOnline: true, // Groups are always "active"
        lastSeen: undefined,
        statusText: currentTypingUsers.length > 0 ? 
          `${currentTypingUsers.length} typing...` : 
          `${participantCount} participants${currentOnlineUsers.length > 0 ? `, ${currentOnlineUsers.length} online` : ''}`,
        isTyping: currentTypingUsers.length > 0
      };
    }

    const userStatus = userStatuses.get(receiverId);
    const isTyping = typingStatus[receiverId] || userStatus?.isTyping || false;
    
    if (isTyping) {
      return {
        isOnline: true,
        lastSeen: undefined,
        statusText: "typing...",
        isTyping: true
      };
    }

    // FIX: Safe property access
    const contactLastSeen = getContactProperty('lastSeen');
    const contactIsOnline = getContactProperty('isOnline');

    const { time, isOnline } = formatLastSeen(
      userStatus?.lastSeen || contactLastSeen, 
      userStatus?.isOnline ?? contactIsOnline ?? false
    );

    return {
      isOnline,
      lastSeen: userStatus?.lastSeen || contactLastSeen,
      statusText: isOnline ? "Online" : time,
      isTyping: false
    };
  };

  // Enhanced chat header contact info with real-time status
  const chatHeaderContact = {
    ...contact,
    ...getCurrentContactStatus(),
    userId: isGroupChat ? (contact.id || contact._id) : receiverId,
  };

  const clearReply = useCallback(() => {
    setReplyingToMessageId(null);
    setReplyingTo(null);
  }, []);

  const clearForward = useCallback(() => {
    setForwardingMessageId(null);
    setForwarding(null);
  }, []);

  const handleReplyMessage = useCallback((messageId: string) => {
    const originalMessage = messages.find(msg => msg._id === messageId);
    if (!originalMessage) return;
    
    const apiMessage: ApiMessage = {
      ...originalMessage,
      senderId: originalMessage.senderId
    };
    
    setReplyingTo(apiMessage);
    setReplyingToMessageId(messageId);
    setForwarding(null);
    setForwardingMessageId(null);
  }, [messages]);

  const handleForwardMessage = useCallback((messageId: string) => {
    const message = messages.find(msg => msg._id === messageId);
    if (!message) return;
    
    const apiMessage: ApiMessage = {
      ...message,
      senderId: message.senderId
    };
    
    setForwarding(apiMessage);
    setForwardingMessageId(messageId);
    setReplyingTo(null);
    setReplyingToMessageId(null);
    setShowForwardDialog(true);
  }, [messages]);

  const ForwardDialog = ({ 
    open, 
    onClose, 
    onForward,
    message
  }: {
    open: boolean;
    onClose: () => void;
    onForward: (recipients: string[]) => void;
    message: ApiMessage | null;
  }) => {
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const contacts = useAppSelector(state => state.user.chatusers);

    const handleForwardClick = () => {
      onForward(selectedRecipients);
      setSelectedRecipients([]);
      onClose();
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Forward Message</DialogTitle>
        <DialogContent>
          {message && (
            <div style={{ 
              padding: '10px', 
              marginBottom: '15px', 
              background: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <strong>Message:</strong> {message.content}
            </div>
          )}
          <List>
            {contacts?.map(contact => (
              <ListItem key={contact.id}>
                <Checkbox
                  checked={selectedRecipients.includes(contact.id)}
                  onChange={() => setSelectedRecipients(prev => 
                    prev.includes(contact.id) 
                      ? prev.filter(id => id !== contact.id) 
                      : [...prev, contact.id]
                  )}
                />
                <ListItemText 
                  primary={contact.name} 
                  secondary={contact.name || contact.id}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleForwardClick}
            disabled={!selectedRecipients.length}
            variant="contained"
            color="primary"
          >
            Forward to {selectedRecipients.length} contact{selectedRecipients.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleQuickReply = async () => {
    if (!quickReplyMessage.trim() || !replyingTo) return;
    
    await handleMessageSend({
      content: quickReplyMessage.trim(),
      type: 'text',
      channelId: channelId
    });
    
    setQuickReplyMessage(""); 
  };

  // Group-specific handlers
  const handleLoadMoreGroupMessages = async () => {
    if (onLoadMoreMessages && hasMoreMessages && !isLoadingMessages) {
      await onLoadMoreMessages();
    }
  };

  // FIX: Enhanced video call handler with proper argument handling
  const handleVideoCallWithStatus = () => {
    const targetUserId = receiverId;
    const targetName = contact.name;
    // FIX: Safe property access for profilePicture
    const targetAvatar = getContactProperty('profilePicture') || (contact as any).avatar;
    
    // Check if user is online before initiating call
    const userStatus = userStatuses.get(targetUserId);
    const isOnline = userStatus?.isOnline ?? false;
    
    if (!isOnline && !isGroupChat) {
      console.warn(`User ${targetUserId} is offline`);
      // You could show a warning dialog here
    }
    
    // FIX: Call with no arguments as expected by the function signature
    onVideoCall?.();
  };

  // FIX: Enhanced voice call handler with proper argument handling  
  const handleVoiceCallWithStatus = () => {
    const targetUserId = receiverId;
    const targetName = contact.name;
    // FIX: Safe property access for profilePicture
    const targetAvatar = getContactProperty('profilePicture') || (contact as any).avatar;
    
    // Check if user is online before initiating call
    const userStatus = userStatuses.get(targetUserId);
    const isOnline = userStatus?.isOnline ?? false;
    
    if (!isOnline && !isGroupChat) {
      console.warn(`User ${targetUserId} is offline`);
      // You could show a warning dialog here
    }
    
    // FIX: Call with no arguments as expected by the function signature
    onVoiceCall?.();
  };

  if (!currentUserId || (!receiverId && !isGroupChat) || !contact) {
    return <div>Loading chat data...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#01aa851c]">
      {/* Enhanced ChatHeader with real-time status */}
      <ChatHeader
        contact={chatHeaderContact}
        onVideoCall={handleVideoCallWithStatus}
        onVoiceCall={handleVoiceCallWithStatus}
        currentUserId={currentUserId}
        isTyping={chatHeaderContact.isTyping}
        isGroupChat={isGroupChat}
        participantCount={participantCount}
        onlineCount={currentOnlineUsers.length}
        canManageGroup={canManageGroup}
        onLeaveGroup={onLeaveGroup}
        isMobile={isMobile}
        onMobileBack={onMobileBack}
        socketService={{
          requestUserStatus: socketService.requestUserStatus.bind(socketService),
          on: socketService.on.bind(socketService),
          off: socketService.off.bind(socketService),
        }}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        formatTime={(timestamp: string) =>
          new Date(timestamp).toLocaleTimeString()
        }
        onReplyMessage={handleReplyMessage}
        onForwardMessage={handleForwardMessage}
        onDeleteMessage={handleDeleteMessage}
        onReply={(msg) => setReplyingTo(msg)} 
        isGroupChat={isGroupChat}
        groupInfo={groupInfo}
        isCurrentUserAdmin={isCurrentUserAdmin}
      />

      <div ref={messagesEndRef} />

      {/* ✅ Enhanced typing indicator for groups */}
      {isGroupChat && currentTypingUsers.length > 0 && (
        <div className="px-4 py-2 bg-white border-t">
          <p className="text-sm text-gray-500">
            {currentTypingUsers.length === 1 
              ? `${currentTypingUsers[0]} is typing...`
              : `${currentTypingUsers.length} people are typing...`
            }
          </p>
        </div>
      )}

      {/* Reply Context - Enhanced for groups */}
      {replyingTo && (
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '8px',
          margin: '0.5rem',
          border: '1px solid #4caf50'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#666', 
                marginBottom: '2px',
                fontWeight: 'bold'
              }}>
                {/* ✅ Fixed sender display - compare IDs properly */}
                Replying to {getSenderId(replyingTo.senderId) === currentUserId ? 'yourself' : 
                  isGroupChat ? getSenderDisplayName(replyingTo.senderId) : 'contact'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '1.3' }}>
                {replyingTo.content.length > 80 
                  ? `${replyingTo.content.substring(0, 80)}...` 
                  : replyingTo.content
                }
              </div>
            </div>
            
            <IconButton 
              onClick={clearReply}
              size="small"
              sx={{ 
                color: '#666',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }
              }}
              title="Cancel Reply"
            >
              ×
            </IconButton>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end'
          }}>
            <TextField
              fullWidth
              size="small"
              value={quickReplyMessage}
              onChange={(e) => setQuickReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  '& fieldset': {
                    borderColor: '#ddd',
                  },
                  '&:hover fieldset': {
                    borderColor: '#4caf50',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4caf50',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '8px 14px',
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickReply();
                }
              }}
              // ✅ Add typing handlers to the quick reply input
              onFocus={handleTypingStart}
              onBlur={handleTypingStop}
            />
            
            <IconButton 
              onClick={handleQuickReply}
              disabled={!quickReplyMessage.trim()}
              sx={{ 
                backgroundColor: quickReplyMessage.trim() ? '#4caf50' : '#ccc',
                color: 'white',
                width: '36px',
                height: '36px',
                '&:hover': {
                  backgroundColor: quickReplyMessage.trim() ? '#45a049' : '#ccc',
                },
                '&:disabled': {
                  backgroundColor: '#ccc',
                  color: 'white',
                },
                transition: 'background-color 0.2s'
              }}
              title="Send Reply"
            >
              <Send fontSize="small" />
            </IconButton>
          </div>
        </div>
      )}

      {/* Forward Context */}
      {forwarding && (
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          margin: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #2196f3'
        }}>
          <div>
            <strong>Forwarding:</strong>
            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '2px' }}>
              {forwarding.content.substring(0, 50)}
              {forwarding.content.length > 50 ? '...' : ''}
            </div>
          </div>
          <button 
            onClick={clearForward}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.2rem', 
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ✅ Enhanced ChatInput with group support */}
      <ChatInput
        currentUserId={currentUserId}
        senderId={senderId}
        receiverId={receiverId}
        groupId={isGroupChat ? (contact.id || contact._id) : undefined}
        channelId={channelId}
        onMessageSent={handleMessageSend}
        onTyping={handleTypingStart}
        replyingTo={replyingTo}
        forwarding={forwarding}
      />

      {/* Forward Dialog */}
      <ForwardDialog
        open={showForwardDialog}
        onClose={() => {
          setShowForwardDialog(false);
          clearForward();
        }}
        onForward={(recipients) => {
          console.log("Forwarding to:", recipients);
          // Implement actual forward logic here
          setShowForwardDialog(false);
          clearForward();
        }}
        message={forwarding}
      />

      {/* Status View */}
     {showStatusView && (
        <StatusView
          isDark={isDark}
          onBackToChat={() => {
            setShowStatusView(false);
            setStatusUserId(null);
          }}
          currentUserId={currentUserId}
          statusUserId={statusUserId}
        />
      )}
{/* 
        {process.env.NODE_ENV === 'development' && (
        <div className="debug-info text-xs text-gray-500 p-2 bg-gray-100">
          <div>Socket Connected: {socketService.isConnected() ? 'Yes' : 'No'}</div>
          <div>Online Users: {onlineUsers.size}</div>
          <div>Typing Users: {typingUsers.size}</div>
          {selectedContact && (
            <div>
              Selected Contact Status: {
                userStatuses.get(selectedContact.userId)?.isOnline ? 'Online' : 
                formatLastSeen(userStatuses.get(selectedContact.userId)?.lastSeen, false).time
              }
            </div>
          )}
        </div>
      )} */}
    </div>

    
  );
}